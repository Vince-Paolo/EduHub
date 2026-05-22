import app from './functions/backend/app.js'

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`\n✓ Server listening on port ${PORT}`)
  console.log(`✓ Groq API quiz generation enabled`)
  console.log(`✓ POST /api/generate-quiz ready for requests`)
  console.log(`✓ POST /api/sync  — offline sync queue endpoint ready`)
  console.log(`✓ GET  /api/sync/:userId — progress fetch ready\n`)
})