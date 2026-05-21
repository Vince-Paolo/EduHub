import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
const envPath = path.resolve(process.cwd(), '.env.local')
dotenv.config({ path: envPath })
const DB_HOST = process.env.DB_HOST || '127.0.0.1'
const DB_USER = process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || ''
const DB_NAME = process.env.DB_NAME || 'eduhubdb'
const pool = mysql.createPool({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, waitForConnections: true, connectionLimit: 1, queueLimit: 0 })
const columns = ['username', 'user_name', 'name']
function chooseColumn(columns, candidates) {
  return candidates.find((column) => columns.includes(column))
}
try {
  const [rows] = await pool.query('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [DB_NAME, 'users'])
  const actualColumns = rows.map(r => r.COLUMN_NAME)
  console.log('actualColumns', actualColumns)
  console.log('usernameField', chooseColumn(actualColumns, columns))
  console.log('fullNameField', chooseColumn(actualColumns, ['full_name', 'fullName', 'name']))
} catch (err) {
  console.error(err.stack || err.message)
} finally {
  await pool.end()
}
