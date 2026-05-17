import fs from "fs"
import path from "path"
import express from "express"
import cors from "cors"
import dotenv from "dotenv"

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
  console.log(`Token value: ${process.env.VITE_APIFY_API_TOKEN || "NOT SET"}`)
} else {
  console.warn("No .env file found in current or parent directory.")
}

const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Quiz generation endpoint
app.post("/api/generate-quiz", async (req, res) => {
  const { fileContent, quizType, count } = req.body

  if (!fileContent) {
    return res.status(400).json({ error: "File content is required" })
  }

  if (!process.env.VITE_APIFY_API_TOKEN) {
    return res.status(500).json({ error: "Apify API token not configured" })
  }

  const apiToken = process.env.VITE_APIFY_API_TOKEN
  const limitedText = fileContent.slice(0, 30000)

  function buildPrompt(quizType, count) {
    const base = `CRITICAL: Return ONLY a raw JSON array. No markdown, no code fences, no explanation. Start with [ and end with ].`
    const schemas = {
      multiple_choice: `Generate ${count} multiple-choice questions, each with 4 options (A-D).
Schema: [{ "type": "multiple_choice", "question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": <0-based index 0-3>, "explanation": "..." }]`,
      true_false: `Generate ${count} true/false questions.
Schema: [{ "type": "true_false", "question": "...", "answer": "True" or "False", "explanation": "..." }]`,
      identification: `Generate ${count} identification questions where the student writes a specific word or phrase.
Schema: [{ "type": "identification", "question": "...", "answer": "<exact answer>", "explanation": "..." }]`,
      mixed: `Generate exactly ${count} questions as a mix: ~40% multiple_choice, ~30% true_false, ~30% identification.
Multiple choice: { "type": "multiple_choice", "question": "...", "options": ["A...","B...","C...","D..."], "answer": <0-3>, "explanation": "..." }
True/false: { "type": "true_false", "question": "...", "answer": "True" or "False", "explanation": "..." }
Identification: { "type": "identification", "question": "...", "answer": "<exact>", "explanation": "..." }`
    }
    return `${schemas[quizType]}\n\n${base}`
  }

  function parseQuestionsFromOutput(responseData) {
    const output = responseData.output ?? responseData.data?.output
    if (Array.isArray(output)) return output
    if (typeof output === "string") {
      const match = output.match(/\[[\s\S]*\]/)
      if (match) {
        try {
          return JSON.parse(match[0])
        } catch (e) {
          console.error("Unable to parse output JSON", e)
        }
      }
    }
    if (output?.questions && Array.isArray(output.questions)) return output.questions
    return []
  }

  try {
    const prompt = buildPrompt(quizType, count)

    console.log("Starting quiz generation with Apify LLM...", {
      textLength: limitedText.length,
      quizType,
      count
    })

    const actorId = "apify/openai-gpt-4-wrapper"
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/run-sync`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          prompt: `${prompt}\n\nContent to generate questions from:\n\n${limitedText}`,
          maxTokens: 4000
        })
      }
    )

    if (runResponse.ok) {
      const runData = await runResponse.json()
      const questions = parseQuestionsFromOutput(runData)
      if (questions.length > 0) {
        console.log("Generated questions (count):", questions.length)
        return res.json({ questions })
      }
      console.warn("Apify run-sync returned no questions, falling back to actor run.")
    } else {
      let errorMessage = `API error: ${runResponse.status}`
      try {
        const errorData = await runResponse.json()
        errorMessage = errorData.error?.message || errorData.message || errorMessage
        console.error("Apify API Error:", errorData)
      } catch (e) {
        const raw = await runResponse.text()
        console.error("API Error Response:", raw)
      }
      console.warn("Falling back to standard Apify actor run due to run-sync failure:", errorMessage)
    }

    const fallbackActorId = process.env.APIFY_ACTOR_ID || "thescrapelab/apify-quiz-generator"
    const startPayload = {
      input: {
        prompt: `${buildPrompt(quizType, count)}\n\nContent to generate questions from:\n\n${limitedText}`,
        count
      }
    }

    const startResponse = await fetch(`https://api.apify.com/v2/acts/${fallbackActorId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`
      },
      body: JSON.stringify(startPayload)
    })

    if (!startResponse.ok) {
      let errorMessage = `API error: ${startResponse.status}`
      try {
        const errorData = await startResponse.json()
        errorMessage = errorData.error?.message || errorData.message || errorMessage
        console.error("Apify API Error (start):", errorData)
      } catch (e) {
        const raw = await startResponse.text()
        console.error("API Error Response (start):", raw)
      }
      return res.status(startResponse.status).json({ error: errorMessage })
    }

    const startData = await startResponse.json()
    const runId = startData.data?.id
    if (!runId) {
      return res.status(500).json({ error: "Unable to start Apify actor run (no run id returned)." })
    }

    let completed = false
    let questions = []
    const maxWaitTime = 120000 // 2 minutes
    const startTime = Date.now()

    while (!completed && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const statusResponse = await fetch(`https://api.apify.com/v2/acts/${fallbackActorId}/runs/${runId}`, {
        headers: { Authorization: `Bearer ${apiToken}` }
      })

      if (!statusResponse.ok) {
        console.error("Failed to fetch run status", await statusResponse.text())
        break
      }

      const statusData = await statusResponse.json()
      const status = statusData.data?.status
      console.log("Poll status:", status)

      if (status === "SUCCEEDED") {
        completed = true
        const datasetId = statusData.data?.defaultDatasetId

        if (datasetId) {
          const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
            headers: { Authorization: `Bearer ${apiToken}` }
          })
          if (datasetResponse.ok) {
            const items = await datasetResponse.json()
            if (Array.isArray(items) && items.length > 0) {
              if (items[0].questions && Array.isArray(items[0].questions)) {
                questions = items[0].questions
              } else {
                const text = items.map((i) => (typeof i === "string" ? i : JSON.stringify(i))).join("\n")
                const match = text.match(/\[[\s\S]*\]/)
                if (match) {
                  try {
                    questions = JSON.parse(match[0])
                  } catch (e) {
                    console.error("Failed to parse dataset results JSON", e)
                  }
                }
              }
            }
          } else {
            console.error("Failed to fetch dataset items", await datasetResponse.text())
          }
        }

        if (!questions.length && statusData.data?.output) {
          const out = statusData.data.output
          if (typeof out === "string") {
            const match = out.match(/\[[\s\S]*\]/)
            if (match) {
              try {
                questions = JSON.parse(match[0])
              } catch (e) {
                console.error("Failed to parse output JSON", e)
              }
            }
          } else if (Array.isArray(out)) {
            questions = out
          } else if (out.questions && Array.isArray(out.questions)) {
            questions = out.questions
          }
        }

        console.log("Generated questions (count):", questions.length)
      } else if (status === "FAILED" || status === "ABORTED") {
        return res.status(500).json({ error: `Quiz generation failed: ${statusData.data?.statusMessage || "Unknown error"}` })
      }
    }

    if (!completed) {
      return res.status(500).json({ error: "Quiz generation timed out. Try again with fewer questions." })
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ error: "Apify actor finished but returned no questions. Check actor output format or try a different actor." })
    }

    return res.json({ questions })
  } catch (error) {
    console.error("Server error:", error)
    return res.status(500).json({ error: error?.message || "Internal server error" })
  }
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
