import mysql from 'mysql2/promise'

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'eduhubdb',
    connectTimeout: 5000,
  })
  const [rows] = await conn.query('SELECT id, email, password FROM users LIMIT 20')
  console.log(rows)
  await conn.end()
}

main().catch(err => {
  console.error('ERROR', err.code || err.message, err.sqlMessage || '')
  process.exit(1)
})
