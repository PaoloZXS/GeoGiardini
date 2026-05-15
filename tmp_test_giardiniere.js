import http from 'node:http';

const data = JSON.stringify({ username: `testuser${Date.now()}`, codice: `C${Date.now()}`, attivo: true });

const req = http.request(
  {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/giardinieri',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  },
  (res) => {
    console.log('status', res.statusCode);
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      console.log(body);
    });
  }
);

req.on('error', (error) => {
  console.error('request error', error);
});

req.write(data);
req.end();
