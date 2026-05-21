import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
dotenv.config({ path: envPath })

const DB_HOST = process.env.DB_HOST || '127.0.0.1'
const DB_USER = process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || ''
const DB_NAME = process.env.DB_NAME || 'eduhubdb'

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
})

try {
  const [rows] = await pool.query('SELECT id, name, email, password FROM users LIMIT 10')
  console.log(JSON.stringify(rows, null, 2))
} catch (err) {
  console.error(err.stack || err.message)
} finally {
  await pool.end()
}
