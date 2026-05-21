async function request(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    redirect: 'manual'
  })
  const text = await res.text()
  console.log(url, res.status, res.headers.get('content-type'))
  console.log(text)
}

async function run() {
  await request('http://localhost:3000/register', {
    fullName: 'HTTP Test',
    username: 'httptest',
    email: 'httptest@example.com',
    password: 'testpass123'
  })
  await request('http://localhost:3000/login', {
    email: 'httptest@example.com',
    password: 'testpass123'
  })
}

run().catch(err => {
  console.error(err)
})
