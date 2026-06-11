/* eslint-disable */

const YAHOO_PROXY = "https://yahoo-proxy-blue.vercel.app/api/yahoo";

const FX_FALLBACK = { CCL: 1270, MEP: 1240, oficial: 1100 };
const TASA10Y_FALLBACK = 4.35;

// ── Tipo de cambio — dolarapi.com (tiempo real, sin CORS) ────────────────────
export async function fetchFXLive() {
  const today = new Date();
  const time  = today.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
  const label = today.toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"});

  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", {
      signal: AbortSignal.timeout(7000),
      headers: { "Accept": "application/json" }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const get    = (casa) => data.find(d => d.casa === casa);
        const venta  = (d)    => (d && d.venta && d.venta > 100) ? d.venta : null;
        const compra = (d)    => (d && d.compra && d.compra > 100) ? d.compra : null;
        const CCL     = venta(get("contadoconliqui"));
        const MEP     = venta(get("bolsa"));
        const oficial = venta(get("oficial"));
        if (CCL && MEP) {
          return {
            CCL, MEP,
            oficial: oficial || Math.round(CCL * 0.94),
            cclCompra:  compra(get("contadoconliqui")),
            mepCompra:  compra(get("bolsa")),
            ofCompra:   compra(get("oficial")),
            source: "dolarapi.com · tiempo real",
            sourceNote: "Oficial = BNA minorista. BCRA A3500 (mayorista) puede diferir ~1-2%.",
            dateLabel: label,
            timeLabel: time,
          };
        }
      }
    }
  } catch {}

  // Fallback: Yahoo Finance
  try {
    const res = await fetch(
      YAHOO_PROXY+"?symbol=USDARS%3DX&range=5d&interval=1d",
      {signal:AbortSignal.timeout(6000)}
    );
    if (res.ok) {
      const d = await res.json();
      const price = d?.quoteResponse?.result?.[0]?.regularMarketPrice;
      if (price && price > 100) {
        return {
          CCL: Math.round(price * 1.065),
          MEP: Math.round(price * 1.027),
          oficial: Math.round(price),
          source: "Yahoo Finance · estimado",
          sourceNote: "Valores estimados desde tipo oficial Yahoo.",
          dateLabel: label, timeLabel: time,
        };
      }
    }
  } catch {}

  return { ...FX_FALLBACK, source: "fallback", sourceNote: "Sin conexión — valores del 06/04/2026.", dateLabel: label, timeLabel: time };
}

// Algunos tickers en el portfolio usan convenciones distintas a data912.
const D912_ALIASES = {
  "GD30D":"GD30D","GD35D":"GD35D","GD38D":"GD38D","GD41D":"GD41D",
  "AL29D":"AL29D","AL30D":"AL30D","AO27D":"AO27D",
  "GD30":"GD30D","GD35":"GD35D","GD38":"GD38D","GD41":"GD41D",
  "AL29":"AL29D","AL30":"AL30D","AO27":"AO27D",
};

// ── data912: precios en vivo de todos los instrumentos AR ────────────────────
export async function fetchData912Prices(activeTickers=[]) {
  const result = {};
  const base = "https://data912.com/live";
  const tickerSet = new Set(activeTickers);

  const parseD912 = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      const sym = item.ticker || item.symbol || item.s || "";
      const price = item.price ?? item.last ?? item.c ?? item.close ?? item.px_ask ?? item.px_bid ?? null;
      const change = item.change_pct ?? item.dp ?? item.change ?? item.pct_change ?? 0;
      if (price == null || price <= 0) continue;
      if (activeTickers.length===0 || tickerSet.has(sym)) {
        result[sym] = { price: parseFloat(price), changePct: parseFloat(change)||0, source: "data912" };
      }
      const canonical = D912_ALIASES[sym];
      if (canonical && tickerSet.has(canonical) && !result[canonical]) {
        result[canonical] = { price: parseFloat(price), changePct: parseFloat(change)||0, source: "data912" };
      }
    }
  };

  const [rBonds, rCedears, rStocks, rCorp] = await Promise.allSettled([
    fetch(`${base}/arg_bonds`,   {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
    fetch(`${base}/arg_cedears`, {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
    fetch(`${base}/arg_stocks`,  {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
    fetch(`${base}/arg_corp`,    {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
  ]);

  if (rBonds.status   === "fulfilled") parseD912(rBonds.value);
  if (rCedears.status === "fulfilled") parseD912(rCedears.value);
  if (rStocks.status  === "fulfilled") parseD912(rStocks.value);
  if (rCorp.status    === "fulfilled") parseD912(rCorp.value);

  return result;
}

// ── Yahoo Finance: fallback dinámico para cualquier ticker ───────────────────
export async function fetchYahooPrices(activeTickers=[]) {
  const result = {};

  const parseYahoo = (d, ticker, source) => {
    const quotes = d?.chart?.result?.[0];
    const closes = (quotes?.indicators?.quote?.[0]?.close||[]).filter(Boolean);
    if(closes.length === 0) return false;
    const price = closes[closes.length-1];
    const prev  = closes.length>1 ? closes[closes.length-2] : price;
    const changePct = prev>0 ? ((price-prev)/prev)*100 : 0;
    result[ticker] = {price, changePct:parseFloat(changePct.toFixed(2)), source};
    return true;
  };

  await Promise.allSettled(activeTickers.map(async (ticker) => {
    try {
      const res = await fetch(YAHOO_PROXY+"?symbol="+encodeURIComponent(ticker+".BA")+"&range=5d&interval=1d",
        {signal:AbortSignal.timeout(8000)});
      if(res.ok){ const d=await res.json(); if(parseYahoo(d,ticker,"yahoo_proxy")) return; }
      const res2 = await fetch(YAHOO_PROXY+"?symbol="+encodeURIComponent(ticker)+"&range=5d&interval=1d",
        {signal:AbortSignal.timeout(8000)});
      if(res2.ok){ const d2=await res2.json(); parseYahoo(d2,ticker,"yahoo_us"); }
    } catch {}
  }));
  return result;
}

// ── FCIs: argentinadatos.com vía CAFCI ───────────────────────────────────────
export async function fetchFCIPrices() {
  const result = {};
  try {
    const [rMM, rRF] = await Promise.allSettled([
      fetch("https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/ultimo", {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
      fetch("https://api.argentinadatos.com/v1/finanzas/fci/rentaFija/ultimo",     {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
    ]);
    const all = [
      ...(rMM.status==="fulfilled" && Array.isArray(rMM.value) ? rMM.value : []),
      ...(rRF.status==="fulfilled" && Array.isArray(rRF.value) ? rRF.value : []),
    ];
    const MAP = [
      { ticker:"FIMA-PREM",  keywords:["fima premium","fima prem"],          usd:false },
      { ticker:"FIMA-AHP",   keywords:["fima ahorro pesos","ahorro pesos"],   usd:false },
      { ticker:"FIMA-AHPP",  keywords:["fima ahorro plus","ahorro plus"],     usd:false },
      { ticker:"FIMA-PREMD", keywords:["fima premium dolar","fima premium d"], usd:true },
    ];
    for (const m of MAP) {
      const match = all.find(f => {
        const nombre = (f.fondo || f.nombre || f.name || "").toLowerCase();
        return m.keywords.some(k => nombre.includes(k));
      });
      if (match) {
        const vcp = parseFloat(match.vCuotaparte || match.cuotaparte || match.precio || 0);
        if (vcp > 0) result[m.ticker] = { price: vcp, changePct: 0, source:"argentinadatos/CAFCI" };
      }
    }
  } catch {}
  return result;
}

// ── Treasury 10Y via Yahoo Finance (^TNX) ────────────────────────────────────
export async function fetchTreasury10Y() {
  try {
    const res = await fetch(YAHOO_PROXY+"?symbol=%5ETNX&range=5d&interval=1d",
      {signal:AbortSignal.timeout(6000)});
    const d = await res.json();
    const closes = d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close||[];
    const price = closes.filter(Boolean).pop();
    return price ? parseFloat(price.toFixed(2)) : TASA10Y_FALLBACK;
  } catch { return TASA10Y_FALLBACK; }
}

// ── Orquestador: lanza todo en paralelo ──────────────────────────────────────
export async function fetchAllLivePrices(activeTickers=[]) {
  const [fx, d912P, yahooP, fciP, t10y] = await Promise.all([
    fetchFXLive(),
    fetchData912Prices(activeTickers),
    fetchYahooPrices(activeTickers.filter(t=>!t.startsWith("FIMA"))),
    fetchFCIPrices(),
    fetchTreasury10Y(),
  ]);
  const prices = { ...yahooP, ...d912P, ...fciP };
  return { fx, prices, t10y };
}
