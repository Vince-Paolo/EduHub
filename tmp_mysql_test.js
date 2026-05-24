import mysql from 'mysql2/promise'

const passwords = ['', 'your_db_password', 'root']

async function test(pass) {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: pass,
      database: 'mysql',
      connectTimeout: 5000,
    })
    const [rows] = await conn.query('SELECT 1 as ok')
    console.log('PASS', JSON.stringify(pass), 'OK', rows)
    await conn.end()
  } catch (e) {
    console.log('PASS', JSON.stringify(pass), 'ERR', e.code, e.sqlMessage || e.message)
  }
}

;(async () => {
  for (const pass of passwords) {
    await test(pass)
  }
})()
