import fs from "fs"
import path from "path"
import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import admin from "firebase-admin"

const app = express()
const cwd = process.cwd()
const envCandidates = [
  path.resolve(cwd, ".env.local"),
  path.resolve(cwd, ".env"),
  path.resolve(cwd, "..", ".env.local"),
  path.resolve(cwd, "..", ".env")
]

const envPath = envCandidates.find(fs.existsSync)
if (envPath) {
  dotenv.config({ path: envPath })
  console.log(`Loaded environment from ${envPath}`)
  console.log(`Token value: ${process.env.VITE_GROQ_API_KEY ? "SET" : "NOT SET"}`)
} else {
  console.warn("No .env file found in current or parent directory.")
}

const hasFirebaseAdminConfig = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
)

if (!hasFirebaseAdminConfig) {
  console.warn("Firebase Admin config is not fully provided. Backend auth verification will fail until FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are configured.")
}

if (hasFirebaseAdminConfig) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    })
  })
}

const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

const authenticate = async (req, res, next) => {
  if (!hasFirebaseAdminConfig) {
    return res.status(500).json({ error: "Server auth is not configured." })
  }

  const authHeader = req.headers.authorization || ""
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : null

  if (!idToken) {
    return res.status(401).json({ error: "Unauthorized. Missing Firebase ID token." })
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken)
    req.user = decodedToken
    next()
  } catch (error) {
    console.error("Firebase token verification failed:", error)
    return res.status(401).json({ error: "Unauthorized. Invalid or expired token." })
  }
}

// Quiz generation endpoint using Groq API
app.post("/api/generate-quiz", authenticate, async (req, res) => {
  const { fileContent, quizType, count } = req.body

  if (!fileContent) {
    return res.status(400).json({ error: "File content is required" })
  }

  if (!process.env.VITE_GROQ_API_KEY) {
    return res.status(500).json({ error: "Groq API token not configured" })
  }

  const apiKey = process.env.VITE_GROQ_API_KEY
  const limitedText = fileContent.slice(0, 20000)

  function buildPrompt(quizType, count) {
    const typeInstructions = {
      multiple_choice: `Generate ${count} multiple-choice questions with 4 options (A, B, C, D). Return only a JSON array with this schema:
[{"type":"multiple_choice","question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":0,"explanation":"..."}]`,
      true_false: `Generate ${count} true/false questions. Return only a JSON array with this schema:
[{"type":"true_false","question":"...","answer":"True","explanation":"..."}]`,
      identification: `Generate ${count} identification/short-answer questions. Return only a JSON array with this schema:
[{"type":"identification","question":"...","answer":"exact answer","explanation":"..."}]`,
      mixed: `Generate ${count} questions mixing types: ~40% multiple-choice (4 options), ~30% true/false, ~30% short-answer. Return only a JSON array.`
    }
    
    return `Based on this content, ${typeInstructions[quizType]}\n\nContent:\n${limitedText}\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanation.`
  }

  try {
    const prompt = buildPrompt(quizType, count)
    
    console.log("Starting quiz generation with Groq API...", { quizType, count, textLength: limitedText.length })

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_completion_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Groq API error:", response.status, errorText)
      return res.status(response.status).json({ 
        error: `Groq API error: ${response.status}. Check your API key and rate limits.` 
      })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return res.status(500).json({ error: "No response content from Groq API" })
    }

    // Parse JSON from response
    let questions = []
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0])
      } else {
        questions = JSON.parse(content)
      }
    } catch (parseError) {
      console.error("Failed to parse response JSON:", content, parseError)
      return res.status(500).json({ 
        error: "Failed to parse questions from Groq response. Please try again." 
      })
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ 
        error: "No valid questions generated. Please try again." 
      })
    }

    console.log(`✓ Generated ${questions.length} questions`)
    return res.json({ questions })

  } catch (error) {
    console.error("Server error:", error)
    return res.status(500).json({ error: error?.message || "Internal server error" })
  }
})

app.listen(PORT, () => {
  console.log(`\n✓ Server listening on port ${PORT}`)
  console.log(`✓ Groq API quiz generation enabled`)
  console.log(`✓ POST /api/generate-quiz ready for requests\n`)
})
