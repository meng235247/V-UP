const http = require('http');

const payload = JSON.stringify({
  filename: 'test.txt',
  contentType: 'text/plain',
  data: Buffer.from('Hello V-UP').toString('base64')
});

const opts = {
  hostname: '127.0.0.1',
  port: process.env.UPLOAD_SERVER_PORT || 5177,
  path: '/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(opts, (res) => {
  let body = '';
  res.on('data', (c) => body += c);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log('BODY', body);
  });
});

req.on('error', (e) => console.error('ERR', e));
req.write(payload);
req.end();
