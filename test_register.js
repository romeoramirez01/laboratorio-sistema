require('dotenv').config();
const fetch = global.fetch || require('node-fetch');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwicm9sIjoiYWRtaW4iLCJpYXQiOjE3NzE0NzU0MjMsImV4cCI6MTc3MTUwNDIyM30.dwkRQEECrVnmnhqSK1BDWCzRZp1y-UxA6FkQd4TDMkI';

(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ nombre: 'Paciente2', email: 'pac2@example.com', password: 'pass123', rol: 'paciente' })
    });

    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response body:\n', text);
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
  }
})();
