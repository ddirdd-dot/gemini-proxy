// gemini-render-proxy — index.js
// ------------------------------------------------------------------
// Same job as the Cloudflare Worker: forward whatever path + query
// string + body it receives on to Google's real Gemini endpoint, and
// hand back Google's response untouched. The only reason this exists
// is that Render lets you pin a service to one fixed region (unlike
// Cloudflare Workers, which run wherever is closest to whoever calls
// them) — so this always calls Google from that one region, regardless
// of whether your PHP server is in Hong Kong or anywhere else.
// ------------------------------------------------------------------

const express = require('express');
const app = express();

// We need the raw request body untouched (Gemini's API expects exact
// JSON bytes), so just buffer it as-is rather than parsing it.
app.use(express.raw({ type: '*/*', limit: '25mb' }));

app.all('/{*splat}', async (req, res) => {
  const targetUrl = 'https://generativelanguage.googleapis.com' + req.originalUrl;

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.set('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (err) {
    res.status(502).json({ error: 'Could not reach Gemini: ' + err.message });
  }
});

// Render sets PORT for you automatically — don't hardcode 3000 etc.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Proxy listening on ' + PORT));
