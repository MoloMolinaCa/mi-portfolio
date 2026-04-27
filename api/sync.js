// /api/sync.js — Vercel serverless function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
      const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
      return res.status(200).json({ ...content, sha: data.sha });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // PUT — guardar datos
  if (req.method === 'PUT') {
    try {
      const { port, trades, bondFlows, bondMeta, deviceId } = req.body;
      let { sha } = req.body;

      // Siempre obtener el SHA actual para evitar conflictos
      const rGet = await fetch(API, { headers });
      if (rGet.ok) { const dGet = await rGet.json(); sha = dGet.sha; }

      const payload = {
        version: 1,
        updatedAt: new Date().toISOString(),
        deviceId: deviceId || 'unknown',
        port, trades,
        bondFlows: bondFlows || {},
        bondMeta: bondMeta || {}
      };

      const content = Buffer.from(JSON.stringify(payload)).toString('base64');
      const body = { message: 'chore: actualizar portfolio data', content, ...(sha ? { sha } : {}) };
      const r = await fetch(API, { method: 'PUT', headers, body: JSON.stringify(body) });

      if (!r.ok) {
        const err = await r.json();
        return res.status(r.status).json({ error: err.message });
      }

      const data = await r.json();
      return res.status(200).json({ sha: data.content?.sha });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
