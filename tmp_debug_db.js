import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'

const __dirname = path.resolve()
const envCandidates = [
  path.resolve(__dirname, 'functions', '.env.local'),
  path.resolve(__dirname, 'functions', '.env'),
  path.resolve(__dirname, '.env.local'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '..', '.env.local'),
  path.resolve(__dirname, '..', '.env')
]

const envPaths = envCandidates.filter(fs.existsSync)
console.log('envPaths', envPaths)
for (const p of envPaths) {
  const parsed = dotenv.parse(fs.readFileSync(p))
  console.log('parsed', p, parsed)
  dotenv.config({ path: p, override: true })
}

console.log('DB_HOST=', process.env.DB_HOST)
console.log('DB_USER=', process.env.DB_USER)
console.log('DB_PASSWORD=', JSON.stringify(process.env.DB_PASSWORD))
console.log('DB_NAME=', process.env.DB_NAME)

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'eduhubdb',
      connectTimeout: 5000,
    })
    const [rows] = await conn.query('SELECT 1 as ok')
    console.log('mysql ok', rows)
    await conn.end()
  } catch (err) {
    console.error('mysql err', err.code, err.sqlMessage || err.message)
  }
}
run()
