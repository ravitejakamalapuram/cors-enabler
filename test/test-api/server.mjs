// Deliberately CORS-less API for integration/E2E testing.
// It NEVER sends Access-Control-* headers, so browsers block cross-origin reads
// unless the CORS Enabler extension adds them.
import http from 'node:http';

const PORT = Number(process.env.API_PORT || 4000);

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  res.setHeader('Content-Type', 'application/json');
  // NOTE: intentionally NO Access-Control-* headers anywhere.

  if (req.method === 'OPTIONS') {
    // A bare preflight response with no CORS headers (browser will reject it
    // for non-simple requests unless the extension injects the headers).
    res.statusCode = 204;
    res.end();
    return;
  }

  if (url.pathname === '/data') {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, method: req.method, at: Date.now() }));
    return;
  }

  if (url.pathname === '/echo') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, received: body || null }));
    });
    return;
  }

  if (url.pathname === '/secure') {
    const auth = req.headers['authorization'] ?? null;
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, authorization: auth }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ ok: false, error: 'not found' }));
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[test-api] listening on http://localhost:${PORT} (no CORS headers)`);
});
