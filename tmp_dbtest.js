import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
const envPath = path.resolve(process.cwd(), '.env.local')
dotenv.config({ path: envPath })
console.log('DB config', {
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_USER: process.env.DB_USER || 'root',
  DB_NAME: process.env.DB_NAME || 'eduhubdb'
})
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
  const [rows] = await pool.query('SHOW TABLES')
  console.log('tables', rows)
  const [userRows] = await pool.query('SELECT * FROM information_schema.tables WHERE table_schema = ? AND table_name = ?', [process.env.DB_NAME || 'eduhubdb', 'users'])
  console.log('users table exists', userRows.length > 0)
} catch (err) {
  console.error('db-error', err.stack || err.message)
  process.exit(1)
} finally {
  await pool.end()
}
