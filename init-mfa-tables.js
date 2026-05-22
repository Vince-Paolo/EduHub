import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load env
const envCandidates = [
  path.resolve(__dirname, '.env.local'),
  path.resolve(__dirname, '.env')
]
const envPath = envCandidates.find(fs.existsSync)
if (envPath) {
  dotenv.config({ path: envPath })
  console.log(`Loaded config from ${envPath}`)
}

const DB_HOST = process.env.DB_HOST || '127.0.0.1'
const DB_PORT = Number(process.env.DB_PORT || 3306)
const DB_USER = process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || ''
const DB_NAME = process.env.DB_NAME || 'eduhubdb'

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
})

async function initMFATables() {
  const conn = await pool.getConnection()
  try {
    console.log('Creating MFA tables...')

    // Create mfa_settings table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS mfa_settings (
        id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id int(11) NOT NULL,
        mfa_enabled tinyint(1) DEFAULT 0,
        email_mfa_enabled tinyint(1) DEFAULT 0,
        sms_mfa_enabled tinyint(1) DEFAULT 0,
        totp_mfa_enabled tinyint(1) DEFAULT 0,
        totp_secret varchar(255) DEFAULT NULL,
        backup_codes longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
        phone_number varchar(20) DEFAULT NULL,
        created_at timestamp NOT NULL DEFAULT current_timestamp(),
        updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        UNIQUE KEY user_id (user_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('✓ mfa_settings table created')

    // Create mfa_codes table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS mfa_codes (
        id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id int(11) NOT NULL,
        code varchar(10) NOT NULL,
        code_type enum('email', 'sms', 'backup') DEFAULT 'email',
        is_used tinyint(1) DEFAULT 0,
        attempts int(11) DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT current_timestamp(),
        expires_at timestamp NULL DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        KEY user_code_index (user_id, code),
        KEY code_type_index (code_type),
        KEY expires_at_index (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('✓ mfa_codes table created')
    console.log('✓ Database initialization complete!')

  } catch (err) {
    console.error('Error creating tables:', err.message)
    process.exit(1)
  } finally {
    conn.release()
    await pool.end()
  }
}

initMFATables()
