// /api/sync.js — Vercel serverless function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.PORTFOLIO_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token no configurado' });

  const REPO = 'MoloMolinaCa/mi-portfolio';
  const FILE = 'public/portfolio_data.json';
  const API  = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
  const headers = {
    'Authorization': `token ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'portfolio-app'
  };

  // GET — leer datos
  if (req.method === 'GET') {
    try {
      const r = await fetch(API, { headers });
      if (!r.ok) return res.status(r.status).json({ error: 'Error leyendo GitHub' });
      const data = await r.json();

      let decoded;
      const rawContent = (data.content || '').replace(/\s/g, '');
      if (!rawContent) {
        // Archivo > 1MB: GitHub API no devuelve content inline, usar download_url
        if (!data.download_url) return res.status(200).json({ sha: data.sha, port: [], trades: [] });
        const r2 = await fetch(data.download_url);
        if (!r2.ok) return res.status(200).json({ sha: data.sha, port: [], trades: [] });
        decoded = await r2.text();
      } else {
        decoded = Buffer.from(rawContent, 'base64').toString('utf-8');
      }

      const content = JSON.parse(decoded);
      return res.status(200).json({ ...content, sha: data.sha });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // PUT — guardar datos
  if (req.method === 'PUT') {
    try {
      const { port, trades, bondFlowsDelta, bondMeta, deviceId } = req.body;
      let { sha } = req.body;

      // Siempre obtener el SHA actual para evitar conflictos
      const rGet = await fetch(API, { headers });
      if (rGet.ok) { const dGet = await rGet.json(); sha = dGet.sha; }

      const payload = {
        version: 2,
        updatedAt: new Date().toISOString(),
        deviceId: deviceId || 'unknown',
        port,
        trades,
        bondFlowsDelta: bondFlowsDelta || {},
        bondMeta: bondMeta || {}
      };

      const content = Buffer.from(JSON.stringify(payload)).toString('base64');
      // [skip ci] evita que Vercel haga un deploy por cada guardado de datos
      const body = { message: 'chore: actualizar portfolio data [skip ci]', content, ...(sha ? { sha } : {}) };
      const r = await fetch(API, { method: 'PUT', headers, body: JSON.stringify(body) });

      if (!r.ok) {
        const err = await r.json();
        return res.status(r.status).json({ error: err.message });
      }

      const d2 = await r.json();
      return res.status(200).json({ sha: d2.content?.sha });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}