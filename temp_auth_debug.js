import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const DB_HOST = process.env.DB_HOST || '127.0.0.1'
const DB_USER = process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || ''
const DB_NAME = process.env.DB_NAME || 'eduhubdb'
const pool = mysql.createPool({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, waitForConnections: true, connectionLimit: 2, queueLimit: 0 })

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEmail(value) {
  return normalizeString(value).toLowerCase()
}

function chooseColumn(columns, candidates) {
  return candidates.find((column) => columns.includes(column))
}

async function dbQuery(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

async function getUserColumns() {
  const rows = await dbQuery(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`, [DB_NAME])
  return rows.map(r => r.COLUMN_NAME)
}

function normalizeUserRow(row) {
  if (!row) return null
  const id = row.id ?? row.user_id ?? row.uid ?? row.ID
  const email = row.email ?? row.email_address ?? row.user_email
  const username = row.username ?? row.user_name ?? row.name
  const fullName = row.full_name ?? row.fullName ?? row.name
  return {
    id,
    uid: id,
    email,
    username,
    fullName,
    password: row.password ?? row.pass ?? row.password_hash ?? row.pwd
  }
}

async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null
  const rows = await dbQuery("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", [normalizedEmail])
  return normalizeUserRow(rows[0])
}

async function getUserByIdentifier(identifier) {
  const normalizedIdentifier = normalizeString(identifier)
  if (!normalizedIdentifier) return null

  const emailUser = await getUserByEmail(normalizedIdentifier)
  if (emailUser) return emailUser

  const columns = await getUserColumns()
  const usernameField = chooseColumn(columns, ['username', 'user_name', 'name'])
  if (!usernameField) return null

  const rows = await dbQuery(`SELECT * FROM users WHERE LOWER(${usernameField}) = LOWER(?) LIMIT 1`, [normalizedIdentifier])
  return normalizeUserRow(rows[0])
}

async function createUser({ fullName, username, email, password }) {
  const columns = await getUserColumns()
  const fieldNames = []
  const values = []
  const placeholders = []

  const addField = (field, value) => {
    fieldNames.push(field)
    values.push(value)
    placeholders.push('?')
  }

  const normalizedEmail = normalizeEmail(email)
  const normalizedUsername = normalizeString(username)
  const normalizedFullName = normalizeString(fullName)

  addField('email', normalizedEmail)
  addField('password', password)

  const usernameField = chooseColumn(columns, ['username', 'user_name', 'name'])
  const fullNameField = chooseColumn(columns, ['full_name', 'fullName', 'name'])

  if (normalizedUsername && usernameField) {
    addField(usernameField, normalizedUsername)
  }

  if (normalizedFullName && fullNameField && fullNameField !== usernameField) {
    addField(fullNameField, normalizedFullName)
  } else if (normalizedFullName && !normalizedUsername && fullNameField && fullNameField === 'name') {
    addField('name', normalizedFullName)
  }

  const sql = `INSERT INTO users (${fieldNames.join(',')}) VALUES (${placeholders.join(',')})`
  const result = await dbQuery(sql, values)
  return { id: result.insertId, uid: result.insertId, email: normalizedEmail, username: normalizedUsername, fullName: normalizedFullName }
}

try {
  console.log('columns', await getUserColumns())
  console.log('create user test...')
  const user = await createUser({ fullName: 'Test User', username: 'testuser', email: 'testuser@example.com', password: 'testpass123' })
  console.log('created', user)
  console.log('found by email', await getUserByIdentifier('testuser@example.com'))
  console.log('found by username', await getUserByIdentifier('testuser'))
} catch (err) {
  console.error('ERROR', err.stack || err.message)
} finally {
  await pool.end()
}
