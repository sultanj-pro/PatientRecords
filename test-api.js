const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({userId: 'test'}, 'dev-secret', {expiresIn: '1h'});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/patients?q=sarah',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
