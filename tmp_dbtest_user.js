import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
const envPath = path.resolve(process.cwd(), '.env.local')
dotenv.config({ path: envPath })
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eduhubdb',
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
})
try {
  const [rows] = await pool.query('SELECT * FROM users LIMIT 5')
  console.log('users', rows)
  const [cols] = await pool.query('SHOW COLUMNS FROM users')
  console.log('columns', cols)
} catch (err) {
  console.error('db-error', err.stack || err.message)
  process.exit(1)
} finally {
  await pool.end()
}
