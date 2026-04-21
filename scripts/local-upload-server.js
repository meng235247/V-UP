const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const PORT = process.env.UPLOAD_SERVER_PORT || 5176;

function sanitize(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);
}

function getMimeType(fp) {
  const ext = path.extname(fp).toLowerCase();
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime'
  };
  return map[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  if (req.method === 'POST' && parsed.pathname === '/upload') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 100 * 1024 * 1024) { // 100MB limit
        res.statusCode = 413;
        res.end('Payload too large');
        req.connection.destroy();
      }
    });
    req.on('end', () => {
      try {
        const obj = JSON.parse(body);
        const { filename, contentType, data } = obj || {};
        if (!filename || !data) {
          res.statusCode = 400;
          res.end('Missing filename or data');
          return;
        }
        const name = `${Date.now()}_${sanitize(filename)}`;
        const filePath = path.join(UPLOAD_DIR, name);
        const buffer = Buffer.from(data, 'base64');
        fs.writeFileSync(filePath, buffer);
        const fileUrl = `http://127.0.0.1:${PORT}/uploads/${encodeURIComponent(name)}`;
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ url: fileUrl }));
      } catch (err) {
        res.statusCode = 500;
        res.end('Server error');
      }
    });
    return;
  }

  // Serve uploaded files under /uploads/
  if (req.method === 'GET' && parsed.pathname.startsWith('/uploads/')) {
    const fileName = decodeURIComponent(parsed.pathname.replace('/uploads/', ''));
    const fp = path.join(UPLOAD_DIR, fileName);
    if (!fp.startsWith(UPLOAD_DIR)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }
    fs.stat(fp, (err, stats) => {
      if (err || !stats.isFile()) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': getMimeType(fp), 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
      const stream = fs.createReadStream(fp);
      stream.pipe(res);
    });
    return;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  res.statusCode = 404;
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[local-upload-server] Listening on http://127.0.0.1:${PORT} (uploads -> ${UPLOAD_DIR})`);
});
