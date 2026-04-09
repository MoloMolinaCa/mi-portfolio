/* eslint-disable */
import React, { useState, useEffect } from "react";

const ASSET_TYPES = {
  accion_ar: { label: "Acciones AR",  color: "#3B82F6", icon: "AR" },
  cedear:    { label: "CEDEARs",      color: "#10B981", icon: "US" },
  bono_ars:  { label: "Bonos ARS",    color: "#F59E0B", icon: "📄" },
  bono_usd:  { label: "Bonos USD",    color: "#F97316", icon: "$" },
  fci_ars:   { label: "FCI Pesos",    color: "#8B5CF6", icon: "B" },
  fci_usd:   { label: "FCI Dólares",  color: "#A78BFA", icon: "💼" },
};

const GALICIA_PORTFOLIO = [
  // BONOS ARS
  { id:1,  ticker:"TZXD6",     name:"BONTES CER V15/12/26",          type:"bono_ars", qty:781503,   buyPrice:179,       currentPrice:269.35,   buyCurrency:"ARS", rendPct:50.53, buyDate:"2026-04-01" },
  { id:2,  ticker:"TZX27",     name:"BONO REP ARG CER V30/06/27",    type:"bono_ars", qty:428449,   buyPrice:355,       currentPrice:360.95,   buyCurrency:"ARS", rendPct:1.60,  buyDate:"2026-04-01" },
  // BONOS USD
  { id:3,  ticker:"TLCUD",     name:"ON Telecom C28 05/03/29",       type:"bono_usd", qty:7000,     buyPrice:100.0,     currentPrice:101.6,    buyCurrency:"USD", rendPct:1.60,  buyDate:"2026-04-01" },
  { id:4,  ticker:"AO27D",     name:"Bono Tesoro 6% V29/10/27",      type:"bono_usd", qty:2954,     buyPrice:102.0,     currentPrice:101.7,    buyCurrency:"USD", rendPct:0.10,  buyDate:"2026-04-01" },
  { id:5,  ticker:"GD38D",     name:"BONOS REP ARG U$S V09/01/38",   type:"bono_usd", qty:1681,     buyPrice:78.0,      currentPrice:79.82,    buyCurrency:"USD", rendPct:5.31,  buyDate:"2026-04-01" },
  // ACCIONES AR
  { id:6,  ticker:"TXAR",      name:"Siderar (Ternium Argentina)",   type:"accion_ar",qty:2467,     buyPrice:607.00,    currentPrice:710.50,   buyCurrency:"ARS", rendPct:16.89, buyDate:"2026-04-01" },
  { id:7,  ticker:"YPFD",      name:"YPF Ordinarias D",              type:"accion_ar",qty:21,       buyPrice:54214.29,  currentPrice:65250.00, buyCurrency:"ARS", rendPct:20.36, buyDate:"2026-04-01" },
  // CEDEARs
  { id:8,  ticker:"GLD",       name:"ETF SPDR Gold Trust",           type:"cedear",   qty:177,      buyPrice:14064.12,  currentPrice:12730.00, buyCurrency:"ARS", rendPct:-9.49, buyDate:"2026-04-01" },
  { id:9,  ticker:"NU",        name:"NU Holdings Cl A",              type:"cedear",   qty:189,      buyPrice:10850.00,  currentPrice:10590.00, buyCurrency:"ARS", rendPct:-2.40, buyDate:"2026-04-01" },
  { id:10, ticker:"SPY",       name:"SPDR S&P 500 ETF",              type:"cedear",   qty:19,       buyPrice:50225.00,  currentPrice:48860.00, buyCurrency:"ARS", rendPct:-2.76, buyDate:"2026-04-01" },
  { id:11, ticker:"META",      name:"Meta Platforms Inc",            type:"cedear",   qty:17,       buyPrice:34780.00,  currentPrice:35760.00, buyCurrency:"ARS", rendPct:2.82,  buyDate:"2026-04-01" },
  { id:12, ticker:"MSFT",      name:"Microsoft Corp",                type:"cedear",   qty:27,       buyPrice:18300.00,  currentPrice:18480.00, buyCurrency:"ARS", rendPct:0.93,  buyDate:"2026-04-01" },
  { id:13, ticker:"VIST",      name:"Vista Oil & Gas",               type:"cedear",   qty:14,       buyPrice:35600.00,  currentPrice:34940.00, buyCurrency:"ARS", rendPct:-1.63, buyDate:"2026-04-01" },
  // FCI PESOS
  { id:14, ticker:"FIMA-PREM", name:"FIMA Premium Cl A (TNA 19.3%)", type:"fci_ars",  qty:40284.34, buyPrice:78.767480, currentPrice:78.767480,buyCurrency:"ARS", rendPct:0.26,  buyDate:"2026-04-01" },
  { id:15, ticker:"FIMA-AHP",  name:"FIMA Ahorro Pesos Cl A",        type:"fci_ars",  qty:9.88,     buyPrice:600.718,   currentPrice:600.718,  buyCurrency:"ARS", rendPct:0.23,  buyDate:"2026-04-01" },
  { id:16, ticker:"FIMA-AHPP", name:"FIMA Ahorro Plus Cl A",         type:"fci_ars",  qty:2.30,     buyPrice:147.952,   currentPrice:147.952,  buyCurrency:"ARS", rendPct:0.26,  buyDate:"2026-04-01" },
  // FCI USD
  { id:17, ticker:"FIMA-PREMD",name:"FIMA Premium Dólares Cl A",     type:"fci_usd",  qty:140.00,   buyPrice:1.012932,  currentPrice:1.012932, buyCurrency:"USD", rendPct:0.01,  buyDate:"2026-04-01" },
];

const FX_FALLBACK = { CCL:1481, MEP:1427, oficial:1389 };  // updated Apr 2026
const YAHOO_PROXY = "https://yahoo-proxy-blue.vercel.app/api/yahoo"; // proxy sin CORS
const T10Y_FALLBACK = 4.35;

const fmtU = (n,d=0) => new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:d}).format(n);
const fmtA = (n) => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
const fmtP = (n) => `${n>=0?"+":""}${n.toFixed(2)}%`;
const pc   = (n) => n>=0?"var(--green)":"var(--red)";

// ── Mapeo de tickers ─────────────────────────────────────────────────────────
// data912: bonos, ONs, CEDEARs, acciones AR — precios en vivo (2h cache)
// Yahoo Finance (.BA): fallback para CEDEARs y acciones si data912 falla

// Tickers de data912 por endpoint
const D912_BONDS    = ["TZXD6","TZX27","TLCUD","AO27D","GD38D"]; // bonos CER + soberanos USD + ONs
const D912_CEDEARS  = ["GLD","NU","SPY","META","MSFT","VIST"];    // CEDEARs en ARS
const D912_STOCKS   = ["TXAR","YPFD"];                             // acciones AR

// Yahoo Finance fallback para CEDEARs y acciones (en caso que data912 falle)
const YAHOO_TICKERS = {
  "TXAR": "TXAR.BA", "YPFD": "YPFD.BA",
  "GLD":  "GLD.BA",  "NU":   "NU.BA",   "SPY":  "SPY.BA",
  "META": "META.BA", "MSFT": "MSFT.BA", "VIST": "VIST.BA",
};

// FCI tickers → id CAFCI para argentinadatos
const FCI_IDS = {
  "FIMA-PREM":  { fondo: "1", clase: "A", nombre: "FIMA Premium" },
  "FIMA-AHP":   { fondo: "2", clase: "A", nombre: "FIMA Ahorro Pesos" },
  "FIMA-AHPP":  { fondo: "3", clase: "A", nombre: "FIMA Ahorro Plus" },
  "FIMA-PREMD": { fondo: "4", clase: "A", nombre: "FIMA Premium Dólares" },
};

// ── Tipo de cambio — dolarapi.com (tiempo real, sin CORS) ────────────────────
// CCL y MEP: precios en tiempo real del mercado
// Oficial: BNA minorista (dolarapi) — el BCRA A3500 (mayorista) difiere ~1-2%
// Se actualiza al cargar la app y cada 30 minutos
async function fetchFXLive() {
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
        const oficial = venta(get("oficial"));   // BNA minorista venta
        if (CCL && MEP) {
          return {
            CCL, MEP,
            oficial: oficial || Math.round(CCL * 0.94),
            // Extra info for display
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

// ── data912: precios en vivo de todos los instrumentos AR ────────────────────
// Endpoints: /live/arg_bonds, /live/arg_cedears, /live/arg_stocks, /live/arg_corp
// Sin key, ~2h de cache Cloudflare, CORS ok desde browser
async function fetchData912Prices() {
  const result = {};
  const base = "https://data912.com/live";

  const parseD912 = (arr, tickers) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      // data912 usa campo "ticker" o "symbol", precio en "price", "last", o "c"
      const sym = item.ticker || item.symbol || item.s || "";
      const price = item.price ?? item.last ?? item.c ?? item.close ?? null;
      const change = item.change_pct ?? item.dp ?? item.change ?? 0;
      if (tickers.includes(sym) && price != null && price > 0) {
        result[sym] = { price: parseFloat(price), changePct: parseFloat(change)||0, source: "data912" };
      }
    }
  };

  const [rBonds, rCedears, rStocks, rCorp] = await Promise.allSettled([
    fetch(`${base}/arg_bonds`,   {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
    fetch(`${base}/arg_cedears`, {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
    fetch(`${base}/arg_stocks`,  {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
    fetch(`${base}/arg_corp`,    {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
  ]);

  if (rBonds.status   === "fulfilled") parseD912(rBonds.value,   [...D912_BONDS]);
  if (rCedears.status === "fulfilled") parseD912(rCedears.value, D912_CEDEARS);
  if (rStocks.status  === "fulfilled") parseD912(rStocks.value,  D912_STOCKS);
  if (rCorp.status    === "fulfilled") parseD912(rCorp.value,    D912_BONDS); // ONs también en arg_corp

  return result;
}

// ── Yahoo Finance: fallback para CEDEARs y acciones ─────────────────────────
async function fetchYahooPrices() {
  // Use proxy to avoid CORS
  const result = {};
  const entries = Object.entries(YAHOO_TICKERS);
  await Promise.allSettled(entries.map(async ([ticker, sym]) => {
    try {
      // Strip .BA suffix to get base symbol for proxy
      const baseSym = sym.replace(".BA","");
      const res = await fetch(YAHOO_PROXY+"?symbol="+baseSym+"&range=5d&interval=1d",
        {signal:AbortSignal.timeout(8000)});
      if(!res.ok) return;
      const d = await res.json();
      const quotes = d?.chart?.result?.[0];
      if(!quotes) return;
      const closes = quotes.indicators?.quote?.[0]?.close || [];
      const price = closes.filter(Boolean).pop();
      if(price > 0) result[ticker] = {price, changePct:0, source:"yahoo_proxy"};
    } catch {}
  }));
  return result;
}

// ── FCIs: argentinadatos.com vía CAFCI ───────────────────────────────────────
// Endpoint: /v1/finanzas/fci/mercadoDinero/ultimo → array con {fondo,clase,vCuotaparte,fecha}
// FIMA mapeo: Premium=fondo 1, AHP=fondo 2, AHPP=fondo 3, Premium USD=fondo 4
// Como no tenemos IDs exactos, usamos nombre para matchear
async function fetchFCIPrices() {
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
    // Match FIMA funds by name substring
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
async function fetchTreasury10Y() {
  try {
    const res = await fetch(YAHOO_PROXY+"?symbol=%5ETNX&range=5d&interval=1d",
      {signal:AbortSignal.timeout(6000)});
    const d = await res.json();
    const closes = d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close||[];
    const price = closes.filter(Boolean).pop();
    return price ? parseFloat(price.toFixed(2)) : T10Y_FALLBACK;
  } catch { return T10Y_FALLBACK; }
}

// ── Orquestador: lanza todo en paralelo ──────────────────────────────────────
async function fetchAllLivePrices() {
  const [fx, d912P, yahooP, fciP, t10y] = await Promise.all([
    fetchFXLive(),
    fetchData912Prices(),
    fetchYahooPrices(),
    fetchFCIPrices(),
    fetchTreasury10Y(),
  ]);
  // Merge: data912 primero (más completo para AR), Yahoo como fallback, FCIs aparte
  const prices = { ...yahooP, ...d912P, ...fciP };
  return { fx, prices, t10y };
}

// ── Components ────────────────────────────────────────────────────────────────

function Spark({pct}){
  const w=72,h=24,n=20;
  const pts=Array.from({length:n},(_,i)=>(pct/n)*i+Math.sin(i*1.4+pct)*Math.abs(pct)*0.25);
  const min=Math.min(...pts),max=Math.max(...pts),rng=max-min||1;
  const s=pts.map((v,i)=>`${(i/(n-1))*w},${h-2-((v-min)/rng)*(h-4)}`).join(" ");
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><polyline points={s} fill="none" stroke={pct>=0?"var(--green)":"var(--red)"} strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

function Donut({segs}){
  const total=segs.reduce((a,s)=>a+s.v,0);if(!total)return null;
  let cur=-Math.PI/2;const cx=60,cy=60,r=48,inn=27;
  return(
    <svg width="120" height="120" viewBox="0 0 120 120">
      {segs.map(s=>{
        const ang=(s.v/total)*2*Math.PI;
        const x1=cx+r*Math.cos(cur),y1=cy+r*Math.sin(cur);cur+=ang;
        const x2=cx+r*Math.cos(cur),y2=cy+r*Math.sin(cur);
        const ix1=cx+inn*Math.cos(cur),iy1=cy+inn*Math.sin(cur);
        const ix2=cx+inn*Math.cos(cur-ang),iy2=cy+inn*Math.sin(cur-ang);
        const lg=ang>Math.PI?1:0;
        return <path key={s.k} d={`M${x1} ${y1}A${r} ${r} 0 ${lg} 1 ${x2} ${y2}L${ix1} ${iy1}A${inn} ${inn} 0 ${lg} 0 ${ix2} ${iy2}Z`} fill={s.color} opacity="0.9"/>;
      })}
      <circle cx={cx} cy={cy} r={inn-1} fill="var(--bg-card)"/>
    </svg>
  );
}

function LineChart({history}){
  const W=900,H=170;
  const pD=history.map(d=>d.pPct),bD=history.map(d=>d.bPct);
  const all=[...pD,...bD];const minV=Math.min(...all)-0.4,maxV=Math.max(...all)+0.4,rng=maxV-minV||1;
  const tx=i=>38+(i/(history.length-1))*(W-46);
  const ty=v=>H-18-((v-minV)/rng)*(H-28);
  const pPts=pD.map((v,i)=>`${tx(i)},${ty(v)}`).join(" ");
  const bPts=bD.map((v,i)=>`${tx(i)},${ty(v)}`).join(" ");
  const fill=pPts+` ${tx(history.length-1)},${H-18} 38,${H-18}`;
  const zero=ty(0);
  return(
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity="0.3"/><stop offset="100%" stopColor="#10B981" stopOpacity="0"/></linearGradient></defs>
      <line x1="38" y1={zero} x2={W} y2={zero} stroke="rgba(255,255,255,0.07)" strokeDasharray="4,3"/>
      {[minV,(minV+maxV)/2,maxV].map((v,i)=><text key={i} x="32" y={ty(v)+4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.22)">{v.toFixed(1)}%</text>)}
      {history.filter((_,i)=>i%15===0).map((d,i)=>{
        const idx=history.findIndex(h=>h.date===d.date);
        return <text key={i} x={tx(idx)} y={H-3} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.22)">{d.date}</text>;
      })}
      <polygon points={fill} fill="url(#lg)"/>
      <polyline points={bPts} fill="none" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.8"/>
      <polyline points={pPts} fill="none" stroke="#34D399" strokeWidth="2"/>
    </svg>
  );
}

function makeHistory(totalUSD,costUSD,t10y=4.35){
  return Array.from({length:91},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(90-i));
    const trend=(i/90)*((totalUSD/costUSD-1)*100);
    const noise=Math.sin(i*0.4)*1.1+Math.cos(i*0.7)*0.7;
    const pPct=trend*0.75+noise;
    const bPct=(Math.pow(1+t10y/100,i/365)-1)*100;
    return{date:d.toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"}),pPct,bPct,usd:costUSD*(1+pPct/100)};
  });
}

// ── Base de tickers conocidos del mercado argentino (fallback offline) ────────
const AR_TICKERS = {
  // Acciones líderes BCBA
  GGAL:"Grupo Financiero Galicia",YPFD:"YPF Ordinarias D",TXAR:"Siderar (Ternium)",
  BMA:"Banco Macro",BBAR:"BBVA Argentina",SUPV:"Grupo Supervielle",VALO:"Grupo Financiero Valores",
  BYMA:"Bolsas y Mercados Arg.",CEPU:"Central Puerto",PAMP:"Pampa Energía",TGSU2:"Transportadora Gas Sur",
  TGNO4:"Transportadora Gas Norte",COME:"Sociedad Comercial del Plata",LOMA:"Loma Negra",
  ALUA:"Aluar Aluminio",CRES:"Cresud",IRSA:"IRSA",MOLI:"Molinos Río de la Plata",
  RICH:"Laboratorios Richmond",HARG:"Holcim Argentina",EDN:"Edenor",TECO2:"Telecom Argentina",
  METR:"Metrogas",GARO:"Garovaglio y Zorraquín",AGRO:"AgroEtanol",BOLT:"Boldt",
  // CEDEARs populares
  GLD:"ETF SPDR Gold Trust",SPY:"ETF SPDR S&P500",QQQ:"ETF Invesco QQQ (Nasdaq)",
  AAPL:"Apple Inc",MSFT:"Microsoft Corp",GOOGL:"Alphabet (Google)",AMZN:"Amazon.com",
  META:"Meta Platforms",NVDA:"NVIDIA Corp",TSLA:"Tesla Inc",BRKB:"Berkshire Hathaway B",
  JPM:"JPMorgan Chase",BAC:"Bank of America",XOM:"ExxonMobil",CVX:"Chevron",
  WMT:"Walmart",JNJ:"Johnson & Johnson",PG:"Procter & Gamble",KO:"Coca-Cola",
  DIS:"Walt Disney",NFLX:"Netflix",PYPL:"PayPal",ADBE:"Adobe",
  NU:"NU Holdings",MELI:"MercadoLibre",GLOB:"Globant",LRCX:"Lam Research",
  VIST:"Vista Oil & Gas",YPF:"YPF S.A. (ADR)",PAM:"Pampa Energía (ADR)",
  // Bonos soberanos ARS
  TZXD6:"BONTES CER V15/12/26",TZX27:"BONO CER V30/06/27",TZXD7:"BONTES CER V15/12/27",
  TZX28:"BONO CER V30/06/28",LECAP:"LECAP",
  // Bonos soberanos USD
  GD30D:"Global 2030 USD (BCBA)",GD35D:"Global 2035 USD (BCBA)",
  GD38D:"Global 2038 USD (BCBA)",GD41D:"Global 2041 USD (BCBA)",
  AL29D:"Bono 2029 Ley Arg. USD",AL30D:"Bono 2030 Ley Arg. USD",
  AO27D:"Bono Tesoro 6% V2027 USD",
  // ONs corporativas
  TLCUD:"ON Telecom C28 USD",YCA6O:"ON YPF USD",YMCXO:"ON YPF USD",
  // FCI referencia
  "FIMA-PREM":"FIMA Premium ARS","FIMA-PREMD":"FIMA Premium USD",
};

// ── Searchable ticker selector for venta ────────────────────────────────────
function VentaTickerSearch({port, value, onSelect}){
  const [query,setQuery] = useState(value||"");
  const [open,setOpen]   = useState(false);
  const inp = {background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 12px",color:"var(--text-primary)",fontSize:14,width:"100%"};

  const filtered = query.length===0
    ? port
    : port.filter(p=>
        p.ticker.toUpperCase().includes(query.toUpperCase()) ||
        p.name.toLowerCase().includes(query.toLowerCase())
      );

  const select = (pos) => {
    setQuery(pos.ticker);
    setOpen(false);
    onSelect(pos);
  };

  return(
    <div>
      <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>Activo a vender</span>
      <div style={{position:"relative"}}>
        <input
          value={query}
          onChange={e=>{setQuery(e.target.value);setOpen(true);}}
          onFocus={()=>setOpen(true)}
          placeholder="Escribí para filtrar (ej: AAPL, GD...)"
          style={{...inp,borderColor:value?"var(--green)":undefined}}
        />
        {value&&<span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:13}}>✅</span>}
        {open&&filtered.length>0&&(
          <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:8,zIndex:50,maxHeight:200,overflowY:"auto",marginTop:4,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
            {[...filtered].sort((a,b)=>a.ticker.localeCompare(b.ticker)).map(pos=>(
              <div key={pos.id} onClick={()=>select(pos)}
                style={{padding:"10px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--border)"}}
                onMouseEnter={e=>e.currentTarget.style.background="var(--bg-input)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div>
                  <span style={{fontWeight:700,fontFamily:"monospace",color:"var(--accent)",fontSize:13}}>{pos.ticker}</span>
                  <span style={{fontSize:12,color:"var(--text-secondary)",marginLeft:8}}>{pos.name}</span>
                </div>
                <span style={{fontSize:11,color:"var(--text-muted)"}}>{Number(pos.qty).toLocaleString("es-AR")} uds</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {value&&(()=>{
        const pos=port.find(p=>p.ticker===value);
        return pos?(
          <div style={{marginTop:6,fontSize:11,color:"var(--text-muted)"}}>
            {pos.name} · Tenencia: <b style={{color:"var(--text-primary)"}}>{Number(pos.qty).toLocaleString("es-AR")} uds</b>
          </div>
        ):null;
      })()}
    </div>
  );
}

function Modal({h,port=[],onSave,onClose}){
  const blank={ticker:"",name:"",type:"accion_ar",qty:"",buyPrice:"",buyCurrency:"ARS",buyDate:new Date().toISOString().slice(0,10),operacion:"compra"};
  // Editing existing: operacion starts as "compra", qty=existing qty, buyPrice empty
  const [f,setF]=useState(h ? {...h, operacion:"compra", buyPrice:""} : blank);
  const [tickerStatus,setTickerStatus]=useState(h?"confirmed":"idle");
  const [tickerInfo,setTickerInfo]=useState(null);
  const [tickerTimer,setTickerTimer]=useState(null);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));

  const inp={background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 12px",color:"var(--text-primary)",fontSize:14,width:"100%"};

  const validateTicker = async (ticker) => {
    if(!ticker||ticker.length<2){setTickerStatus("idle");setTickerInfo(null);return;}
    setTickerStatus("checking");
    setTickerInfo(null);

    // 1. Check local known-tickers list first (instant, no CORS)
    if(AR_TICKERS[ticker]){
      // Also try to get live price from the already-loaded livePrices via YAHOO_TICKERS
      const yahooSym = YAHOO_TICKERS[ticker];
      // We know the name at minimum
      const knownName = AR_TICKERS[ticker];
      // Try Yahoo to get price (same call that works for prices tab)
      try {
        const sym = yahooSym || `${ticker}.BA`;
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${sym}&fields=shortName,regularMarketPrice,regularMarketPreviousClose,currency`;
        const res = await fetch(url,{signal:AbortSignal.timeout(5000)});
        if(res.ok){
          const data = await res.json();
          const q = data?.quoteResponse?.result?.[0];
          const price = q?.regularMarketPrice || q?.regularMarketPreviousClose;
          if(price){
            setTickerStatus("found");
            setTickerInfo({name:q?.shortName||knownName,price,currency:q?.currency||"ARS",source:"Yahoo Finance"});
            setF(p=>({...p,name:q?.shortName||knownName}));
            return;
          }
        }
      } catch{}
      // Yahoo failed but we know the ticker — mark as found with name only
      setTickerStatus("found");
      setTickerInfo({name:knownName,price:null,currency:ticker.endsWith("D")||ticker.includes("USD")?"USD":"ARS",source:"Lista local AR"});
      setF(p=>({...p,name:knownName}));
      return;
    }

    // 2. Try Yahoo Finance .BA (covers most BCBA instruments)
    try {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}.BA&fields=shortName,regularMarketPrice,regularMarketPreviousClose,currency`;
      const res = await fetch(url,{signal:AbortSignal.timeout(6000)});
      if(res.ok){
        const data = await res.json();
        const q = data?.quoteResponse?.result?.[0];
        const price = q?.regularMarketPrice || q?.regularMarketPreviousClose;
        if(price){
          setTickerStatus("found");
          setTickerInfo({name:q?.shortName||ticker,price,currency:q?.currency||"ARS",source:"Yahoo Finance BCBA"});
          setF(p=>({...p,name:q?.shortName||p.name}));
          return;
        }
      }
    } catch{}

    // 3. Mark as unknown — still saveable
    setTickerStatus("notfound");
    setTickerInfo(null);
  };

  const onTickerChange=(val)=>{
    const upper=val.toUpperCase();
    set("ticker",upper);
    if(tickerTimer) clearTimeout(tickerTimer);
    if(upper.length>=2){
      setTickerStatus("checking");
      const t=setTimeout(()=>validateTicker(upper),600);
      setTickerTimer(t);
    } else {
      setTickerStatus("idle");
      setTickerInfo(null);
    }
  };

  const statusColor={idle:"var(--border)",checking:"var(--yellow)",found:"var(--green)",notfound:"rgba(251,191,36,0.6)",confirmed:"var(--green)"};
  const availableQty = f.operacion==="venta" ? (port.find(x=>x.ticker===f.ticker)?.qty||0) : Infinity;
  const overSelling = f.operacion==="venta" && +f.qty > availableQty;
  const canSave = f.ticker&&f.qty&&f.buyPrice&&!overSelling&&(f.operacion==="venta"||tickerStatus!=="idle"&&tickerStatus!=="checking");

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
      <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:28,width:460,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{fontFamily:"Georgia,serif",fontSize:16}}>{h?"Editar posición":"Nueva posición"}</h3>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
        </div>

        {/* How-to note */}
        {!h&&<div style={{background:"rgba(37,99,235,0.08)",border:"1px solid rgba(37,99,235,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"var(--text-secondary)",lineHeight:1.6}}>
          <b style={{color:"var(--accent)"}}>¿Cómo agregar un papel?</b><br/>
          Ingresá el ticker (ej: <code style={{background:"var(--bg-input)",padding:"1px 5px",borderRadius:4}}>GGAL</code>, <code style={{background:"var(--bg-input)",padding:"1px 5px",borderRadius:4}}>GD30D</code>, <code style={{background:"var(--bg-input)",padding:"1px 5px",borderRadius:4}}>MSFT</code>) — la app lo busca automáticamente en BYMA y Yahoo Finance. Si aparece el precio, el ticker es válido.
        </div>}

        <div style={{display:"grid",gap:14}}>

          {/* 1. TOGGLE COMPRA/VENTA — primero */}
          <div>
            <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Operación</span>
            <div style={{display:"flex",gap:0,background:"var(--bg-input)",borderRadius:8,padding:3,border:"1px solid var(--border)"}}>
              {["compra","venta"].map(op=>{
                const disabled=op==="venta"&&port.length===0;
                return(
                  <button key={op} disabled={disabled}
                    onClick={()=>{
                      if(op==="venta"&&port.length>0){
                        const first=port[0];
                        setF(p=>({...p,operacion:"venta",ticker:first.ticker,name:first.name,type:first.type,buyCurrency:first.buyCurrency,qty:"",buyPrice:""}));
                        setTickerStatus("confirmed");
                      } else {
                        setF(p=>({...p,operacion:op,qty:"",buyPrice:""}));
                        if(op==="compra") setTickerStatus("idle");
                      }
                    }}
                    style={{flex:1,padding:"9px 0",border:"none",borderRadius:6,fontSize:14,fontWeight:700,transition:"all 0.15s",
                      background:f.operacion===op?(op==="compra"?"var(--green)":"var(--red)"):"transparent",
                      color:f.operacion===op?"#fff":"var(--text-muted)",
                      opacity:disabled?0.3:1,cursor:disabled?"not-allowed":"pointer"}}>
                    {op==="compra"?"↑ Compra":"↓ Venta"}
                  </button>
                );
              })}
            </div>
            {f.operacion==="venta"&&<div style={{fontSize:11,color:"var(--yellow)",marginTop:5}}>⚠ FIFO — salen los lotes más antiguos primero</div>}
          </div>

          {/* 2. ACTIVO — searchable combobox en venta, texto libre en compra */}
          {f.operacion==="venta" ? (
            <VentaTickerSearch port={port} value={f.ticker} onSelect={pos=>{
              setF(p=>({...p,ticker:pos.ticker,name:pos.name,type:pos.type,buyCurrency:pos.buyCurrency,qty:"",buyPrice:""}));
            }}/>
          ) : (
            <div>
              <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Ticker</span>
              <div style={{position:"relative",marginTop:4}}>
                <input value={f.ticker} onChange={e=>onTickerChange(e.target.value)}
                  placeholder="ej: GGAL, GD30D, MSFT, SPY..."
                  style={{...inp,border:`1px solid ${statusColor[tickerStatus]}`,paddingRight:36}}/>
                <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:14}}>
                  {tickerStatus==="checking"&&<span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>⟳</span>}
                  {(tickerStatus==="found"||tickerStatus==="confirmed")&&"✅"}
                  {tickerStatus==="notfound"&&"❓"}
                </span>
              </div>
              {tickerStatus==="found"&&tickerInfo&&(
                <div style={{marginTop:8,background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:8,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:13,fontWeight:600}}>{tickerInfo.name}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>📡 {tickerInfo.source}</div></div>
                  <div style={{textAlign:"right"}}>
                    {tickerInfo.price
                      ?<><div style={{fontSize:14,fontWeight:700,color:"var(--green)"}}>{tickerInfo.currency==="USD"?fmtU(tickerInfo.price,3):fmtA(tickerInfo.price)}</div><div style={{fontSize:10,color:"var(--text-muted)"}}>precio actual</div></>
                      :<><div style={{fontSize:12,color:"var(--yellow)"}}>precio al abrir</div><div style={{fontSize:10,color:"var(--text-muted)"}}>se carga con refresh ↻</div></>
                    }
                  </div>
                </div>
              )}
              {tickerStatus==="notfound"&&<div style={{marginTop:8,background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--yellow)"}}>⚠️ Ticker no encontrado — podés guardarlo igual.</div>}
              {tickerStatus==="checking"&&(
                <div style={{marginTop:6,fontSize:11,color:"var(--text-muted)"}}>
                  Buscando...{Object.keys(AR_TICKERS).filter(t=>t.startsWith(f.ticker)&&t!==f.ticker).slice(0,4).map(t=>(
                    <button key={t} onClick={()=>onTickerChange(t)} style={{background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:4,padding:"1px 8px",cursor:"pointer",fontSize:11,color:"var(--accent)",marginLeft:4}}>{t}</button>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* Nombre — siempre visible, autocompleta desde ticker, editable */}
          <label style={{display:"flex",flexDirection:"column",gap:4}}>
            <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Nombre del instrumento</span>
            <input value={f.name} onChange={e=>set("name",e.target.value)}
              placeholder="Se completa automático con el ticker"
              style={{...inp,borderColor:f.name?"var(--border)":undefined}}/>
            {!f.name&&f.ticker&&tickerStatus==="checking"&&<div style={{fontSize:10,color:"var(--text-muted)",marginTop:3}}>Buscando nombre...</div>}
          </label>

          {/* 3. TIPO DE ACTIVO — readonly en venta, editable en compra */}
          <label style={{display:"flex",flexDirection:"column",gap:4}}>
            <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Tipo de activo</span>
            {f.operacion==="venta"
              ?<div style={{...inp,color:"var(--text-secondary)",background:"var(--bg-card)",cursor:"default"}}>{ASSET_TYPES[f.type]?.icon} {ASSET_TYPES[f.type]?.label||f.type}</div>
              :<select value={f.type} onChange={e=>set("type",e.target.value)} style={inp}>{Object.entries(ASSET_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select>
            }
          </label>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>{f.operacion==="venta"?"Cantidad a vender":"Cantidad"}</span>
              <input type="number" min="0" max={f.operacion==="venta"?availableQty:undefined}
                value={f.qty}
                onChange={e=>{const v=+e.target.value; set("qty",f.operacion==="venta"?Math.min(v,availableQty):v||e.target.value);}}
                style={{...inp,borderColor:overSelling?"var(--red)":undefined}}/>
              {f.operacion==="venta"&&f.ticker&&<div style={{fontSize:10,color:overSelling?"var(--red)":"var(--text-muted)",marginTop:3}}>
                {overSelling?`⚠ Solo tenés ${availableQty.toLocaleString("es-AR")} disponibles`:`Disponible: ${availableQty.toLocaleString("es-AR")}`}
              </div>}
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>{f.operacion==="venta"?"Precio de venta":"Precio de compra (PPC)"}</span>
              <input type="number" min="0" value={f.buyPrice} onChange={e=>set("buyPrice",e.target.value)} style={inp}/>
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Moneda</span>
              <select value={f.buyCurrency} onChange={e=>set("buyCurrency",e.target.value)} style={inp}>
                <option value="ARS">🇦🇷 ARS</option>
                <option value="USD">🇺🇸 USD</option>
              </select>

            </label>
          </div>

          {/* Monto total */}
          {f.qty>0 && f.buyPrice>0 && (
            <div style={{background:"var(--bg-input)",borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Monto total</span>
              <span style={{fontSize:16,fontWeight:700,color:f.operacion==="venta"?"var(--red)":"var(--green)"}}>

                {f.buyCurrency==="USD"
                  ? `USD ${(+f.qty * +f.buyPrice).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`
                  : `$ ${(+f.qty * +f.buyPrice).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`
                }
              </span>
            </div>
          )}

          <label style={{display:"flex",flexDirection:"column",gap:4}}>
            <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Fecha de compra</span>
            <input type="date" value={f.buyDate} onChange={e=>set("buyDate",e.target.value)} style={inp}/>
          </label>
        </div>

        <div style={{display:"flex",gap:10,marginTop:22,justifyContent:"space-between",alignItems:"center"}}>
          {h&&<button onClick={()=>{if(window.confirm("¿Eliminar esta posición?"))onSave(null);}} style={{padding:"8px 14px",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:8,color:"var(--red)",cursor:"pointer",fontSize:12}}>🗑 Eliminar</button>}
          {!h&&<div/>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{padding:"8px 18px",background:"transparent",border:"1px solid var(--border)",borderRadius:8,color:"var(--text-muted)",cursor:"pointer"}}>Cancelar</button>
            <button
              onClick={()=>onSave({...f,ticker:f.ticker.toUpperCase(),qty:+f.qty,buyPrice:+f.buyPrice,id:f.id||Date.now(),currentPrice:tickerInfo?.price||f.buyPrice,operacion:f.operacion||"compra"})}
              disabled={!canSave}
              style={{padding:"8px 18px",background:canSave?"var(--accent)":"var(--bg-input)",border:"none",borderRadius:8,color:canSave?"#fff":"var(--text-muted)",cursor:canSave?"pointer":"not-allowed",fontWeight:600}} title={overSelling?`Solo tenés ${availableQty} disponibles`:undefined}>
              {"Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI Recommendations Tab — análisis inline con Claude API ──────────────────

function Chart100({series}) {
  if(!series?.length) return null;
  const W=560,H=200,PL=44,PT=12,PR=12,PB=26;
  const allV = series.flatMap(s=>s.data.map(d=>d.val));
  const minV = Math.min(...allV)*0.997;
  const maxV = Math.max(...allV)*1.003;
  const n = series[0].data.length;
  const xS = i => PL+(i/(n-1))*(W-PL-PR);
  const yS = v => PT+(1-(v-minV)/(maxV-minV))*(H-PT-PB);
  const path = data => data.map((d,i)=>`${i===0?"M":"L"}${xS(i).toFixed(1)},${yS(d.val).toFixed(1)}`).join(" ");
  const yTicks = Array.from({length:5},(_,i)=>minV+(maxV-minV)*i/4);
  const xLabels = [0, Math.floor(n/3), Math.floor(2*n/3), n-1].filter((v,i,a)=>a.indexOf(v)===i);
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%"}}>
      {/* Grid */}
      {yTicks.map((v,i)=>(
        <g key={i}>
          <line x1={PL} x2={W-PR} y1={yS(v)} y2={yS(v)} stroke="var(--border)" strokeWidth="0.5"/>
          <text x={PL-4} y={yS(v)+4} textAnchor="end" fontSize="9" fill="var(--text-muted)">{v.toFixed(0)}</text>
        </g>
      ))}
      {/* Base 100 line */}
      <line x1={PL} x2={W-PR} y1={yS(100)} y2={yS(100)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3,3"/>
      {/* Series */}
      {series.map(s=>(
        <path key={s.key} d={path(s.data)} fill="none" stroke={s.color}
          strokeWidth={s.bold?2:1.5} strokeLinejoin="round" opacity={s.bold?1:0.7}/>
      ))}
      {/* X labels */}
      {xLabels.map(i=>(
        <text key={i} x={xS(i)} y={H-4} textAnchor="middle" fontSize="9" fill="var(--text-muted)">
          {series[0].data[i]?.date?.slice(5)}
        </text>
      ))}
    </svg>
  );
};

function EvoTab({en,trades,totUSD,totPct,benchPct,alpha,liveT10Y,byType,card,fxRate,fx}){
  const PERIODS=[
    {key:"30d", label:"30d",  days:30},
    {key:"90d", label:"90d",  days:90},
    {key:"ytd", label:"YTD",  days:null},
    {key:"1y",  label:"1 año",days:365},
    {key:"3y",  label:"3 años",days:1095},
  ];
  const [period,setPeriod]=useState("90d");
  const [chartData,setChartData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const [d912ok,setD912ok]=useState(null);
  
  const fmtP=n=>`${n>=0?"+":""}${n.toFixed(2)}%`;
  const pc=n=>n>=0?"var(--green)":"var(--red)";
  const fmtU=(n,d=0)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:d}).format(n);

  // ── Portfolio series desde trades ──────────────────────────────────────────
  const buildPortSeries = (dates) => {
    const dEnd = new Date(dates[dates.length-1]).getTime();
    return dates.map(dateStr => {
      const t = new Date(dateStr).getTime();
      let val = 0;
      for(const h of en){
        const buys = trades.filter(tr=>tr.ticker===h.ticker&&tr.tipo==="compra"&&new Date(tr.date).getTime()<=t);
        if(!buys.length) continue;
        const qty = buys.reduce((a,tr)=>a+tr.qty,0);
        const ppc = buys.reduce((a,tr)=>a+tr.qty*tr.price,0)/qty;
        const first = Math.min(...buys.map(tr=>new Date(tr.date).getTime()));
        const frac = Math.min(1,Math.max(0,(t-first)/Math.max(1,dEnd-first)));
        const price = ppc + (h.currentPrice-ppc)*frac;
        val += h.buyCurrency==="USD" ? price*qty : price*qty/fxRate;
      }
      return {date:dateStr, val:Math.max(val,0.01)};
    });
  };

  // ── Generar fechas del período ─────────────────────────────────────────────
  const getDates = (p, n=20) => {
    const end = new Date();
    let start;
    if(p.key==="ytd") start = new Date(end.getFullYear()+"-01-01");
    else { start = new Date(); start.setDate(start.getDate()-p.days); }
    const earliest = trades.filter(t=>t.tipo==="compra").sort((a,b)=>a.date.localeCompare(b.date))[0]?.date;
    if(earliest && new Date(earliest)>start) start = new Date(earliest);
    const dates=[];
    for(let i=0;i<=n;i++){
      const d=new Date(start.getTime()+(end-start)*(i/n));
      dates.push(d.toISOString().slice(0,10));
    }
    return [...new Set(dates)];
  };

  // ── Fetch SPY histórico USD — spark endpoint Yahoo (CORS ok en browser) ──
  // ── Fetch SPY histórico via proxy Vercel (sin CORS) ─────────────────────


  // ── Encontrar el CCL más cercano a una fecha ────────────────────────────
  const findCCL = (cclArr, dateStr) => {
    const t = new Date(dateStr).getTime();
    let best = cclArr[0], bestDiff = Infinity;
    for(const x of cclArr){
      const diff = Math.abs(new Date(x.date).getTime()-t);
      if(diff<bestDiff){bestDiff=diff;best=x;}
    }
    return best?.ccl || fxRate;
  };

  // ── Leer históricos desde JSON generado por GitHub Actions ─────────────────
  // El archivo public/historicos.json se actualiza automáticamente cada día hábil
  const [historicos, setHistoricos] = React.useState(null);

  React.useEffect(()=>{
    fetch("/historicos.json")
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d) setHistoricos(d); })
      .catch(()=>{});
  },[]);

  // ── Interpolador: precio más cercano a una fecha ──────────────────────────
  const findPrice = (bars, dateStr) => {
    if(!bars||!bars.length) return null;
    const t = new Date(dateStr).getTime();
    const best = bars.reduce((b,x)=>
      Math.abs(new Date(x.date)-t) < Math.abs(new Date(b.date)-t) ? x : b
    , bars[0]);
    return best?.close || best?.price || null;
  };

  // ── Obtener barras históricas para un ticker ──────────────────────────────
  const getTickerBars = (ticker) => {
    if(!historicos) return null;
    const bars = historicos[ticker];
    return bars?.length ? bars : null;
  };

  // ── Datos para benchmarks ─────────────────────────────────────────────────
  const getCCLBars  = () => historicos?.CCL   || [];
  const getSPYBars  = () => historicos?.sp500  || [];

  const load = async (p) => {
    setLoading(true); setErr(""); setChartData(null);
    try {
      const dates = getDates(p, 16);
      const startDate = dates[0];

      // Usar datos del JSON pre-generado por GitHub Actions
      const cclBars   = getCCLBars();
      const spyBarsRaw = getSPYBars();

      // SPY benchmark base-100
      let spy100 = null, spySource = "sin datos";
      if(spyBarsRaw.length >= 2){
        const pts = dates.map(d=>({date:d, val:findPrice(spyBarsRaw,d)||spyBarsRaw[0].price}));
        const base = pts[0].val;
        spy100 = pts.map(x=>({date:x.date, val:base>0?100*x.val/base:100}));
        spySource = "Yahoo proxy ("+spyBarsRaw.length+" pts)";
      }

      // CCL base-100
      let ccl100 = null, cclSource = "sin datos";
      if(cclBars.length >= 2){
        const pts = dates.map(d=>({date:d, val:findPrice(cclBars,d)||cclBars[0].price}));
        const base = pts[0].val;
        ccl100 = pts.map(x=>({date:x.date, val:base>0?100*x.val/base:100}));
        cclSource = "ArgentinaDatos ("+cclBars.length+" pts)";
      }

      // T10Y base-100
      const t10y100 = dates.map(d=>{
        const days = Math.max(0,(new Date(d)-new Date(dates[0]))/(1000*60*60*24));
        return {date:d, val:100*Math.pow(1+liveT10Y/100, days/365)};
      });

      // Histórico por ticker desde JSON pre-generado
      const allTickers = [...new Set(en.map(h=>h.ticker))];
      const tickerBars = {};
      for(const ticker of allTickers){
        const bars = getTickerBars(ticker);
        if(bars) tickerBars[ticker] = bars;
      }
      const hasHistorico = Object.keys(tickerBars).length > 0;

      // Para cada fecha calcular valor total
      const portPts = dates.map(dateStr => {
        const dateT = new Date(dateStr).getTime();
        let totalUSD = 0;
        for(const h of en){
          const buyT = new Date(h.buyDate||"2026-04-01").getTime();
          if(buyT > dateT + 86400000) continue;
          const buys = trades.filter(t=>t.ticker===h.ticker&&t.tipo==="compra"&&new Date(t.date).getTime()<=dateT);
          const sells = trades.filter(t=>t.ticker===h.ticker&&t.tipo==="venta"&&new Date(t.date).getTime()<=dateT);
          const qty = Math.max(0, buys.reduce((a,t)=>a+t.qty,0) - sells.reduce((a,t)=>a+t.qty,0));
          if(qty<=0) continue;
          const isBond = h.type==="bono_usd"||h.type==="bono_ars";
          const qtyFactor = isBond ? qty/100 : qty;
          const bars = tickerBars[h.ticker];
          const price = (bars && findPrice(bars,dateStr)) || h.currentPrice;
          let valueUSD;
          const sym = YAHOO_MAP[h.ticker];
          const isBASymbol = sym && sym.endsWith(".BA");
          if(h.buyCurrency==="USD" && !isBASymbol){
            // USD instrument with USD price (CEDEARs USD subyacente sin .BA)
            valueUSD = price * qtyFactor;
          } else {
            // ARS price (todos los .BA) → dividir por CCL
            const cclDay = cclBars.length ? (findPrice(cclBars,dateStr)||fxRate) : fxRate;
            valueUSD = price * qtyFactor / cclDay;
          }
          totalUSD += valueUSD;
        }
        return {date:dateStr, val:Math.max(totalUSD,0.01)};
      });

      const portBase = portPts[0].val;
      const port100 = portPts.map(x=>({date:x.date, val:portBase>0?100*x.val/portBase:100}));
      const spyRet  = spy100 ? (spy100[spy100.length-1].val-100).toFixed(2) : null;
      const cclRet  = ccl100 ? (ccl100[ccl100.length-1].val-100).toFixed(2) : null;
      const t10yRet = (t10y100[t10y100.length-1].val-100).toFixed(2);
      const portRet = (port100[port100.length-1].val-100).toFixed(2);

      setChartData({port100, t10y100, spy100, ccl100, spySource, cclSource,
        startDate:dates[0], endDate:dates[dates.length-1],
        portRet, t10yRet, spyRet, cclRet,
        cclPoints: ccl100 ? ccl100.length : 0,
      });
    } catch(e){
      setErr("Error: "+e.message);
    }
    setLoading(false);
  };

  useEffect(()=>{
    const p=PERIODS.find(x=>x.key===period);
    if(p) load(p);
  },[period]);

  // ── SVG line chart ─────────────────────────────────────────────────────────

  const cd = chartData;
  const series = cd ? [
    {key:"port",data:cd.port100,color:"var(--green)",bold:true},
    ...(cd.spy100?[{key:"spy",data:cd.spy100,color:"#60A5FA",bold:false}]:[]),
    {key:"t10y",data:cd.t10y100,color:"var(--yellow)",bold:false},
    ...(cd.ccl100?[{key:"ccl",data:cd.ccl100,color:"#A78BFA",bold:false}]:[]),
  ] : [];

  return(
    <div className="fi" style={{display:"grid",gap:14}}>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {[
          {lbl:"Retorno Portfolio",val:fmtP(totPct),sub:"vs PPC · todos los activos",col:pc(totPct)},
          {lbl:"Benchmark T10Y",val:fmtP(benchPct),sub:`Treasury USA @ ${liveT10Y}% anual`,col:"var(--yellow)"},
          {lbl:"Alpha",val:fmtP(alpha),sub:"outperformance vs T10Y",col:pc(alpha)},
        ].map(c=>(
          <div key={c.lbl} style={{...card,padding:20,textAlign:"center"}}>
            <div style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{c.lbl}</div>
            <div style={{fontSize:26,fontFamily:"Georgia,serif",fontWeight:700,color:c.col}}>{c.val}</div>
            <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Gráfico base 100 */}
      <div style={{...card,padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>Rendimiento base 100 · en USD</div>
            <div style={{display:"flex",gap:14,fontSize:11,flexWrap:"wrap"}}>
              <span style={{color:"var(--green)"}}>— Portfolio</span>
              {cd?.spy100&&<span style={{color:"#60A5FA"}}>— S&amp;P 500 (aprox.)</span>}
              <span style={{color:"var(--yellow)"}}>— Treasury 10Y</span>
              <span style={{color:"#A78BFA"}}>— Dólar CCL</span>
            </div>
          </div>
          <div style={{display:"flex",gap:4}}>
            {PERIODS.map(p=>(
              <button key={p.key} onClick={()=>setPeriod(p.key)}
                style={{padding:"4px 10px",borderRadius:6,border:"1px solid var(--border)",cursor:"pointer",fontSize:12,
                  fontWeight:period===p.key?700:400,
                  background:period===p.key?"var(--accent)":"var(--bg-input)",
                  color:period===p.key?"#fff":"var(--text-secondary)"}}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{height:200,position:"relative"}}>
          {loading&&(
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-muted)",fontSize:13}}>
              <span style={{animation:"spin 0.8s linear infinite",display:"inline-block",marginRight:8,fontSize:18}}>⟳</span>
              Cargando datos históricos...
            </div>
          )}
          {err&&<div style={{color:"var(--red)",fontSize:12,padding:20}}>{err}</div>}
          {cd&&!loading&&series.length>0&&<Chart100 series={series}/>}
        </div>

        {/* Retornos */}
        {cd&&!loading&&(
          <div style={{display:"flex",gap:20,marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)",fontSize:12,flexWrap:"wrap"}}>
            <span style={{color:"var(--text-muted)"}}>Portfolio: <b style={{color:pc(+cd.portRet)}}>{cd.portRet>=0?"+":""}{cd.portRet}%</b></span>
            {cd.spy100&&<span style={{color:"var(--text-muted)"}}>S&amp;P 500: <b style={{color:pc(+cd.spyRet)}}>{cd.spyRet>=0?"+":""}{cd.spyRet}%</b></span>}
            <span style={{color:"var(--text-muted)"}}>T10Y: <b style={{color:"var(--yellow)"}}>{cd.t10yRet>=0?"+":""}{cd.t10yRet}%</b></span>
            {cd.ccl100&&<span style={{color:"var(--text-muted)"}}>CCL: <b style={{color:pc(+cd.cclRet)}}>{cd.cclRet>=0?"+":""}{cd.cclRet}%</b></span>}
            <span style={{color:"var(--text-muted)",marginLeft:"auto",fontSize:10}}>{cd.startDate} → {cd.endDate}</span>
          </div>
        )}

        {/* Nota T10Y */}
        <div style={{fontSize:10,color:"var(--text-muted)",marginTop:8}}>
          {"T10Y: tasa "+liveT10Y+"% compuesta · "}
          {cd?.spy100 ? "S&P: "+cd.spySource : "S&P: sin datos"}
          {" · CCL: "+(cd?.cclPoints>0 ? "ArgentinaDatos ("+cd.cclPoints+" pts)" : "sin datos")}
        </div>
      </div>

      {/* Contribución por tipo */}
      <div style={{...card,padding:20}}>
        <div style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Contribución por tipo de activo</div>
        <div style={{display:"grid",gap:10}}>
          {byType.map(t=>(
            <div key={t.key} style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:110,fontSize:11,color:"var(--text-secondary)",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:t.color}}/>{t.icon} {t.label}
              </div>
              <div style={{flex:1,height:5,background:"var(--border)",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${t.pct}%`,background:t.color,borderRadius:4}}/>
              </div>
              <div style={{minWidth:70,textAlign:"right",fontSize:12,fontWeight:600}}>{fmtU(t.val)}</div>
              <div style={{minWidth:65,textAlign:"right",fontSize:12,fontWeight:600,color:t.pnlP>=0?"var(--green)":"var(--red)"}}>{fmtP(t.pnlP)}</div>
              <div style={{minWidth:38,textAlign:"right",fontSize:11,color:"var(--text-muted)"}}>{t.pct.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PortfolioTab({byType,en,totUSD,totCost,totPnl,totPct,fxRate,fxMode,setModal,del,card}){
  const [view,setView]=useState("dual"); // "dual"|"native"|"usd"
  const fmtU=(n,d=0)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:d}).format(n);
  const fmtA=(n)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
  const fmtP=(n)=>`${n>=0?"+":""}${n.toFixed(2)}%`;
  const pc=(n)=>n>=0?"var(--green)":"var(--red)";

  const thS={padding:"8px 12px",textAlign:"left",fontSize:10,color:"var(--text-muted)",fontWeight:500,textTransform:"uppercase",letterSpacing:0.8,borderBottom:"1px solid var(--border)",whiteSpace:"nowrap"};
  const thR={...thS,textAlign:"right"};
  const tdL={padding:"10px 12px",color:"var(--text-secondary)",fontSize:13};
  const tdR={...tdL,textAlign:"right"};

  return(
    <div className="fi" style={{display:"grid",gap:14}}>

      {/* ── Resumen por tipo ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
        {byType.map(t=>(
          <div key={t.key} style={{...card,padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:t.color}}/>
              <span style={{fontSize:11,color:"var(--text-secondary)"}}>{t.icon} {t.label}</span>
            </div>
            <div style={{fontSize:18,fontWeight:700,marginBottom:2}}>{fmtU(t.val)}</div>
            <div style={{fontSize:11,color:pc(t.pnlP),fontWeight:600}}>{fmtP(t.pnlP)}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginTop:2}}>{t.pct.toFixed(1)}% del total</div>
          </div>
        ))}
      </div>

      {/* ── Tabla de posiciones ── */}
      <div style={{...card,overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:13,fontWeight:600}}>Posiciones</div>
          <div style={{display:"flex",gap:4}}>
            {[["dual","⇄ Dual"],["native","Moneda orig."],["usd","USD"]].map(([k,l])=>(
              <button key={k} onClick={()=>setView(k)}
                style={{padding:"3px 10px",borderRadius:6,border:"1px solid var(--border)",cursor:"pointer",fontSize:11,
                  background:view===k?"var(--accent)":"var(--bg-input)",
                  color:view===k?"#fff":"var(--text-secondary)"}}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
            <thead>
              <tr>
                <th style={thS}>Ticker</th>
                <th style={thS}>Nombre</th>
                <th style={thR}>Nominales</th>
                <th style={thR}>PPC</th>
                <th style={thR}>Precio actual</th>
                {(view==="dual"||view==="native")&&<th style={thR}>Val. nativo</th>}
                {(view==="dual"||view==="native")&&<th style={thR}>PnL nativo</th>}
                {(view==="dual"||view==="usd")&&<th style={thR}>Val. USD</th>}
                {(view==="dual"||view==="usd")&&<th style={thR}>PnL USD</th>}
                <th style={thR}>Rend %</th>
                <th style={{...thS,width:60}}></th>
              </tr>
            </thead>
            <tbody>
              {[...en].sort((a,b)=>b.valUSD-a.valUSD).map(h=>{
                const nativeVal  = h.buyCurrency==="USD" ? h.currentPrice*h.qty : h.currentPrice*h.qty;
                const nativeCost = h.buyCurrency==="USD" ? (h.ppc||h.buyPrice)*h.qty : (h.ppc||h.buyPrice)*h.qty;
                const nativePnl  = nativeVal - nativeCost;
                const nativeFmt  = h.buyCurrency==="USD" ? (v=>fmtU(v,2)) : (v=>fmtA(v));
                return(
                  <tr key={h.id||h.ticker} style={{borderTop:"1px solid var(--border)"}}>
                    <td style={{...tdL,fontWeight:700,fontFamily:"monospace",color:"var(--accent)"}}>
                      {h.ticker}
                      {h.isLive&&<span style={{display:"block",fontSize:9,color:"var(--green)",fontFamily:"sans-serif",fontWeight:400}}>● live</span>}
                    </td>
                    <td style={{...tdL,color:"var(--text-secondary)",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</td>
                    <td style={tdR}>{Number(h.qty).toLocaleString("es-AR",{maximumFractionDigits:4})}</td>
                    <td style={{...tdR,color:"var(--text-muted)",fontSize:11}}>
                      {h.buyCurrency==="USD"?fmtU(h.ppc||h.buyPrice,4):fmtA(h.ppc||h.buyPrice)}
                      <span style={{display:"block",fontSize:9,color:"var(--text-muted)"}}>{h.buyCurrency} · PPC</span>
                    </td>
                    <td style={{...tdR,fontSize:11}}>
                      {h.buyCurrency==="USD"?fmtU(h.currentPrice,4):fmtA(h.currentPrice)}
                      {h.liveChangePct!=null&&<span style={{display:"block",fontSize:9,color:pc(h.liveChangePct)}}>{fmtP(h.liveChangePct)} hoy</span>}
                      {!h.isLive&&<span style={{display:"block",fontSize:8,color:"var(--text-muted)"}}>guardado</span>}
                    </td>
                    {(view==="dual"||view==="native")&&<td style={{...tdR,fontWeight:600}}>{nativeFmt(nativeVal)}</td>}
                    {(view==="dual"||view==="native")&&<td style={{...tdR,color:pc(nativePnl),fontSize:11}}>{nativeFmt(nativePnl)}</td>}
                    {(view==="dual"||view==="usd")&&<td style={{...tdR,fontWeight:700}}>{fmtU(h.valUSD)}</td>}
                    {(view==="dual"||view==="usd")&&<td style={{...tdR,color:pc(h.pnlUSD),fontSize:11}}>{fmtU(h.pnlUSD)}</td>}
                    <td style={{...tdR,fontWeight:600,color:pc(h.pnlPct)}}>{fmtP(h.pnlPct)}</td>
                    <td style={{padding:"10px 8px",textAlign:"right"}}>
                      <button onClick={()=>setModal(h)}
                        style={{background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:5,padding:"3px 8px",color:"var(--text-muted)",cursor:"pointer",fontSize:11}}>
                        ✏️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div style={{padding:"12px 16px",borderTop:"1px solid var(--border)",display:"flex",gap:24,flexWrap:"wrap",fontSize:12}}>
          <span style={{color:"var(--text-muted)"}}>Total: <b style={{color:"var(--text-primary)"}}>{fmtU(totUSD)}</b></span>
          <span style={{color:"var(--text-muted)"}}>Costo: <b>{fmtU(totCost)}</b></span>
          <span style={{color:"var(--text-muted)"}}>PnL: <b style={{color:pc(totPnl)}}>{fmtU(totPnl)}</b></span>
          <span style={{color:"var(--text-muted)"}}>Rend: <b style={{color:pc(totPct)}}>{fmtP(totPct)}</b></span>
          <span style={{color:"var(--text-muted)",fontSize:10,marginLeft:"auto"}}>TC {fxMode}: {new Intl.NumberFormat("es-AR").format(Math.round(fxRate))}</span>
        </div>
      </div>
    </div>
  );
}

export default function App(){
  // ── State ────────────────────────────────────────────────────────────────
  const SEED_TRADES = GALICIA_PORTFOLIO.map(h=>({
    id:h.id, ticker:h.ticker, tipo:"compra",
    qty:h.qty, price:h.buyPrice, currency:h.buyCurrency,
    date:h.buyDate||"2026-04-01", ts:h.id*1000, name:h.name,
  }));

  const [port,setPort]         = useState(GALICIA_PORTFOLIO);
  const [trades,setTrades]     = useState(SEED_TRADES);
  const [storageReady,setStorageReady] = useState(false);
  const [tab,setTab]           = useState("dashboard");
  const [modal,setModal]       = useState(null);
  const [ventaResult,setVentaResult] = useState(null);
  const [fx,setFx]             = useState("CCL");
  const [liveFX,setLiveFX]     = useState(FX_FALLBACK);
  const [livePrices,setLivePrices] = useState({});
  const [liveT10Y,setLiveT10Y] = useState(T10Y_FALLBACK);
  const [priceStatus,setPriceStatus] = useState("idle");
  const [lastRefresh,setLastRefresh] = useState(null);

  // ── Storage ───────────────────────────────────────────────────────────────
  useEffect(()=>{
    try{
      const sp=localStorage.getItem("gal_port_v1");
      const st=localStorage.getItem("gal_trades_v3");
      if(sp) setPort(JSON.parse(sp));
      if(st) setTrades(JSON.parse(st));
    }catch{}
    setStorageReady(true);
  },[]);

  useEffect(()=>{
    if(!storageReady) return;
    try{ localStorage.setItem("gal_port_v1",JSON.stringify(port)); }catch{}
  },[port,storageReady]);

  useEffect(()=>{
    if(!storageReady) return;
    try{ localStorage.setItem("gal_trades_v3",JSON.stringify(trades)); }catch{}
  },[trades,storageReady]);

  // ── Live prices ───────────────────────────────────────────────────────────
  const fxRate = liveFX[fx] || FX_FALLBACK[fx];

  const refreshPrices = async () => {
    setPriceStatus("loading");
    try {
      const {fx:newFX,prices:newPrices,t10y:newT10Y} = await fetchAllLivePrices();
      setLiveFX(newFX);
      setLivePrices(newPrices);
      setLiveT10Y(newT10Y);
      setLastRefresh(new Date());
      setPriceStatus(Object.keys(newPrices).length>0?"live":"partial");
    } catch { setPriceStatus("error"); }
  };

  useEffect(()=>{ refreshPrices(); const iv=setInterval(refreshPrices,30*60*1000); return()=>clearInterval(iv); },[]);

  // ── Portfolio calcs ───────────────────────────────────────────────────────
  const ppcByTicker = port.reduce((acc,t)=>{
    const buys = trades.filter(tr=>tr.ticker===t.ticker&&tr.tipo==="compra");
    if(!buys.length){ acc[t.ticker]=t.buyPrice; return acc; }
    const totalCost=buys.reduce((a,tr)=>a+tr.qty*tr.price,0);
    const totalQty =buys.reduce((a,tr)=>a+tr.qty,0);
    acc[t.ticker]=totalQty>0?totalCost/totalQty:t.buyPrice;
    return acc;
  },{});

  const en=port.map(h=>{
    const live=livePrices[h.ticker];
    const currentPrice=live?live.price:h.currentPrice;
    const liveChangePct=live?live.changePct:null;
    const ppc=ppcByTicker[h.ticker]||h.buyPrice;
    // Bonos cotizan por cada 100 VN — dividir por 100 para obtener valor real
    const isBond = h.type==="bono_usd" || h.type==="bono_ars";
    const qtyFactor = isBond ? h.qty/100 : h.qty;
    const valARS=h.buyCurrency==="USD"?currentPrice*qtyFactor*fxRate:currentPrice*qtyFactor;
    const costARS=h.buyCurrency==="USD"?ppc*qtyFactor*fxRate:ppc*qtyFactor;
    const valUSD=valARS/fxRate; const costUSD=costARS/fxRate;
    const pnlUSD=valUSD-costUSD;
    const pnlPct=costUSD>0?(pnlUSD/costUSD)*100:0;
    return{...h,currentPrice,liveChangePct,valUSD,costUSD,pnlUSD,pnlPct,isLive:!!live,ppc};
  });

  const enGrouped=Object.values(en.reduce((acc,h)=>{
    if(!acc[h.ticker]){acc[h.ticker]={...h};return acc;}
    const prev=acc[h.ticker];
    const totalQty=prev.qty+h.qty;
    const newPpc=(prev.ppc*prev.qty+h.ppc*h.qty)/totalQty;
    const merged={...prev,qty:totalQty,ppc:newPpc,valUSD:prev.valUSD+h.valUSD,costUSD:prev.costUSD+h.costUSD,pnlUSD:prev.pnlUSD+h.pnlUSD,isLive:prev.isLive||h.isLive};
    merged.pnlPct=merged.costUSD>0?(merged.pnlUSD/merged.costUSD)*100:0;
    acc[h.ticker]=merged;
    return acc;
  },{}));

  const totUSD=en.reduce((a,h)=>a+h.valUSD,0);
  const totCost=en.reduce((a,h)=>a+h.costUSD,0);
  const totPnl=totUSD-totCost;
  const totPct=totCost>0?(totPnl/totCost)*100:0;
  const benchPct=(Math.pow(1+liveT10Y/100,90/365)-1)*100;
  const alpha=totPct-benchPct;
  const history=makeHistory(totUSD,totCost,liveT10Y);
  const liveCount=en.filter(h=>h.isLive).length;

  const byType=Object.entries(ASSET_TYPES).map(([key,meta])=>{
    const items=enGrouped.filter(h=>h.type===key);
    const val=items.reduce((a,h)=>a+h.valUSD,0);
    const cost=items.reduce((a,h)=>a+h.costUSD,0);
    const pnl=items.reduce((a,h)=>a+h.pnlUSD,0);
    const pnlP=cost>0?(pnl/cost)*100:0;
    return{key,...meta,val,cost,pnl,pnlP,items,pct:totUSD>0?(val/totUSD)*100:0};
  }).filter(t=>t.val>0).sort((a,b)=>b.val-a.val);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const del=(id)=>setModal(port.find(x=>x.id===id)||null);

  const saveOrDelete=(h)=>{
    if(!h){
      const id=modal?.id;
      if(id){
        const pos=port.find(x=>x.id===id);
        if(pos){
          const ts=Date.now();
          const live=livePrices[pos.ticker];
          const sellPrice=live?live.price:pos.currentPrice;
          setTrades(t=>[...t,{id:ts,ticker:pos.ticker,tipo:"venta",qty:pos.qty,price:sellPrice,currency:pos.buyCurrency,date:new Date().toISOString().slice(0,10),ts,name:pos.name}]);
        }
        setPort(p=>p.filter(x=>x.id!==id));
      }
      setModal(null); return;
    }
    const existing=port.find(x=>x.id===h.id)||port.find(x=>x.ticker===h.ticker.toUpperCase());
    const ts=Date.now();
    const tradeBase={ticker:h.ticker.toUpperCase(),currency:h.buyCurrency,date:h.buyDate||new Date().toISOString().slice(0,10),ts,name:h.name};
    if(!existing){
      setTrades(t=>[...t,{id:ts,tipo:"compra",qty:+h.qty,price:+h.buyPrice,...tradeBase}]);
      setPort(p=>[...p,{...h,id:ts,buyPrice:+h.buyPrice}]);
    } else if(h.operacion==="venta"){
      const sellQty=+h.qty; const sellPrice=+h.buyPrice;
      const buyLots=trades.filter(t=>t.ticker===h.ticker.toUpperCase()&&t.tipo==="compra").sort((a,b)=>a.ts-b.ts);
      let remaining=sellQty,costFIFO=0;
      for(const lot of buyLots){ if(remaining<=0)break; const used=Math.min(lot.qty,remaining); costFIFO+=used*lot.price; remaining-=used; }
      const proceeds=sellQty*sellPrice;
      const pnlAmt=proceeds-costFIFO;
      const pnlPct=costFIFO>0?(pnlAmt/costFIFO)*100:0;
      setTrades(t=>[...t,{id:ts,tipo:"venta",qty:sellQty,price:sellPrice,pnlAmt:parseFloat(pnlAmt.toFixed(2)),pnlPct:parseFloat(pnlPct.toFixed(2)),...tradeBase}]);
      const newQty=existing.qty-sellQty;
      if(newQty<=0) setPort(p=>p.filter(x=>x.id!==existing.id));
      else setPort(p=>p.map(x=>x.id===existing.id?{...x,qty:newQty}:x));
      setVentaResult({ticker:h.ticker.toUpperCase(),name:h.name,currency:h.buyCurrency,sellQty,sellPrice,proceeds,costFIFO,pnlAmt:parseFloat(pnlAmt.toFixed(2)),pnlPct:parseFloat(pnlPct.toFixed(2)),buyDate:buyLots[0]?.date||"2026-04-01",sellDate:tradeBase.date});
    } else {
      setTrades(t=>[...t,{id:ts,tipo:"compra",qty:+h.qty,price:+h.buyPrice,...tradeBase}]);
      const matchId=existing.id;
      setPort(p=>p.map(x=>x.id===matchId?{...x,qty:x.qty+(+h.qty),buyPrice:+h.buyPrice}:x));
    }
    setModal(null);
  };

  const downloadTrades=()=>{
    if(!trades||!trades.length){alert("No hay movimientos.");return;}
    const sep=";";
    const fmtNum=(n,d=2)=>Number(n).toFixed(d).replace(".",",");
    const header=["Fecha","Ticker","Nombre","Tipo","Nominales","Precio","Moneda","Monto Total","PnL Monto","PnL %"].join(sep);
    const rows=[...trades].sort((a,b)=>a.date.localeCompare(b.date)).map(t=>{
      const qty=fmtNum(t.qty,Number(t.qty)%1===0?0:4);
      const monto=fmtNum(Number(t.qty)*Number(t.price),2);
      const pnlA=t.tipo==="venta"&&t.pnlAmt!=null?fmtNum(t.pnlAmt,2):"";
      const pnlP=t.tipo==="venta"&&t.pnlPct!=null?fmtNum(t.pnlPct,2)+"%":"";
      return[t.date,t.ticker,`"${(t.name||"").replace(/"/g,'""')}"`,t.tipo,qty,fmtNum(t.price,4),t.currency||"ARS",monto,pnlA,pnlP].join(sep);
    });
    const csv="\uFEFF"+header+"\n"+rows.join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url;
    a.download=`movimientos_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── Venta result benchmark fetch ──────────────────────────────────────────
  const [benchmarkData,setBenchmarkData]=useState(null);
  useEffect(()=>{
    if(!ventaResult){setBenchmarkData(null);return;}
    setBenchmarkData({loading:true});
    (async()=>{
      const {buyDate,sellDate}=ventaResult;
      const days=Math.max(1,(new Date(sellDate)-new Date(buyDate))/(1000*60*60*24));
      try{
        // Fetch SPY histórico para el período de la operación
        const range = days<=32?"1mo":days<=95?"3mo":days<=370?"1y":"3y";
        const result={loading:false,sources:{}};

        // Usar histórico del JSON pre-generado
        const spyBarsB = getSPYBars();
        if(spyBarsB.length){
          const pb=findPrice(spyBarsB,buyDate), ps=findPrice(spyBarsB,sellDate);
          if(pb&&ps){result.sp500Pct=((ps-pb)/pb)*100;result.sources.sp500="historicos.json";}
        }

        const cclBarsB = getCCLBars();
        if(cclBarsB.length){
          const pb=findPrice(cclBarsB,buyDate), ps=findPrice(cclBarsB,sellDate);
          if(pb&&ps){result.cclPct=((ps-pb)/pb)*100;result.cclBuy=pb;result.cclSell=ps;result.sources.ccl="historicos.json";}
        }

        setBenchmarkData(result);
      }catch{setBenchmarkData({loading:false,error:true,sources:{}});}
    })();
  },[ventaResult?.ticker,ventaResult?.buyDate,ventaResult?.sellDate]);

  const card={background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:12};

  return(
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:var(--bg);color:var(--text-primary);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
        :root{
          --bg:#07101f;--bg-card:#0d1a2e;--bg-input:#152030;--border:#1c2e44;
          --accent:#2563EB;--text-primary:#E8F0FE;--text-secondary:#7A9EC4;
          --text-muted:#364F6B;--red:#F87171;--green:#34D399;--yellow:#FBBF24;
        }
        @keyframes spin{to{transform:rotate(360deg)}}
        .fi *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:var(--bg)}
        ::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
      `}</style>

      <div style={{minHeight:"100vh",background:"var(--bg)"}}>
        {/* Header */}
        <div style={{background:"var(--bg-card)",borderBottom:"1px solid var(--border)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:28,height:28,borderRadius:8,background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>📊</div>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>Mi Portfolio - Galicia</div>
              <div style={{fontSize:11,color:"var(--text-muted)"}}>
                {priceStatus==="live"&&<span style={{color:"var(--green)"}}>● {liveCount}/{port.length} activos · {lastRefresh?.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</span>}
                {priceStatus==="partial"&&<span style={{color:"var(--yellow)"}}>◐ Parcial · {lastRefresh?.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</span>}
                {priceStatus==="loading"&&<span>Actualizando...</span>}
                {priceStatus==="idle"&&<span>Cargando...</span>}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <select value={fx} onChange={e=>setFx(e.target.value)} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 10px",color:"var(--text-secondary)",fontSize:12,cursor:"pointer"}}>
              <option value="CCL">CCL {fmtA(liveFX.CCL)}</option>
              <option value="MEP">MEP {fmtA(liveFX.MEP)}</option>
              <option value="oficial">Oficial {fmtA(liveFX.oficial)}</option>
            </select>
            {liveFX.sourceNote&&<div style={{fontSize:10,color:"var(--text-muted)"}}>{liveFX.source}</div>}
            <button onClick={refreshPrices} disabled={priceStatus==="loading"} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 10px",color:"var(--text-secondary)",cursor:"pointer",fontSize:12}}>↻</button>
            <button onClick={downloadTrades} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,padding:"6px 10px",color:"var(--text-secondary)",cursor:"pointer",fontSize:13}}>⬇ CSV</button>
            <button onClick={()=>setModal("add")} style={{background:"var(--accent)",border:"none",borderRadius:6,padding:"6px 14px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>+ Posición</button>
          </div>
        </div>

        {/* Nav */}
        <div style={{background:"var(--bg-card)",borderBottom:"1px solid var(--border)",padding:"0 20px",display:"flex",gap:0}}>
          {[["dashboard","📊 Dashboard"],["portfolio","💼 Portfolio"],["evolutivo","📈 Evolutivo"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:"12px 16px",background:"transparent",border:"none",borderBottom:tab===id?"2px solid var(--accent)":"2px solid transparent",color:tab===id?"var(--text-primary)":"var(--text-muted)",cursor:"pointer",fontSize:13,fontWeight:tab===id?600:400}}>
              {lbl}
            </button>
          ))}
        </div>

        <div style={{padding:"22px 28px",maxWidth:1200,margin:"0 auto"}}>

          {/* DASHBOARD */}
          {tab==="dashboard"&&(
            <div className="fi" style={{display:"grid",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",gap:12}}>
                {[
                  {lbl:"Valor Total USD",val:fmtU(totUSD),sub:fmtA(totUSD*fxRate)+" ARS",col:"var(--accent)"},
                  {lbl:"PnL Total",val:fmtP(totPct),sub:fmtU(totPnl)+" PnL",col:pc(totPnl)},
                  {lbl:"Alpha vs T10Y",val:fmtP(alpha),sub:"Benchmark "+fmtP(benchPct),col:pc(alpha)},
                  {lbl:"Treasury 10Y",val:liveT10Y+"%",sub:"Yield anual USD",col:"var(--yellow)"},
                  {lbl:"TC "+fx,val:"$"+fxRate.toLocaleString("es-AR"),sub:"ARS/USD · "+liveFX.source,col:"var(--text-secondary)"},
                ].map(c=>(
                  <div key={c.lbl} style={{...card,padding:"15px 17px"}}>
                    <div style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>{c.lbl}</div>
                    <div style={{fontSize:22,fontFamily:"Georgia,serif",fontWeight:700,color:c.col}}>{c.val}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)",marginTop:3}}>{c.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"270px 1fr",gap:14}}>
                <div style={{...card,padding:18}}>
                  <div style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Asignación por tipo</div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <Donut segs={byType.map(t=>({k:t.key,v:t.val,color:t.color}))}/>
                    <div style={{flex:1,display:"grid",gap:8}}>
                      {byType.map(t=>(
                        <div key={t.key} style={{display:"flex",alignItems:"center",gap:7}}>
                          <div style={{width:7,height:7,borderRadius:"50%",background:t.color,flexShrink:0}}/>
                          <div style={{flex:1,fontSize:11,color:"var(--text-secondary)",whiteSpace:"nowrap"}}>{t.icon} {t.label}</div>
                          <div style={{fontSize:11,fontWeight:600}}>{t.pct.toFixed(1)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{...card,padding:18}}>
                  <div style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Retorno 90 días vs T10Y</div>
                  <div style={{height:170}}><LineChart history={history}/></div>
                </div>
              </div>

              <div style={{...card,overflow:"hidden"}}>
                <div style={{padding:"10px 16px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Top posiciones</div>
                <div style={{display:"grid",gap:0}}>
                  {[...enGrouped].sort((a,b)=>b.valUSD-a.valUSD).slice(0,8).map(h=>(
                    <div key={h.ticker} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderTop:"1px solid var(--border)"}}>
                      <div style={{width:48,fontWeight:700,fontFamily:"monospace",fontSize:12,color:"var(--accent)"}}>{h.ticker}</div>
                      <div style={{flex:1,fontSize:12,color:"var(--text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</div>
                      <div style={{fontSize:12,fontWeight:600}}>{fmtU(h.valUSD)}</div>
                      <div style={{fontSize:12,fontWeight:600,color:pc(h.pnlPct),minWidth:60,textAlign:"right"}}>{fmtP(h.pnlPct)}</div>
                      <Spark pct={h.pnlPct}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PORTFOLIO */}
          {tab==="portfolio"&&(
            <PortfolioTab byType={byType} en={enGrouped} totUSD={totUSD} totCost={totCost}
              totPnl={totPnl} totPct={totPct} fxRate={fxRate} fxMode={fx}
              setModal={setModal} del={del} card={card}/>
          )}

          {/* EVOLUTIVO */}
          {tab==="evolutivo"&&(
            <EvoTab en={en} trades={trades} totUSD={totUSD} totPct={totPct}
              benchPct={benchPct} alpha={alpha} liveT10Y={liveT10Y}
              byType={byType} history={history} fxRate={fxRate} fx={fx}
              fxMode={fx} card={card}/>
          )}

        </div>
      </div>

      {/* Venta result modal */}
      {ventaResult&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
          <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:28,width:460,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:700}}>Resultado de la venta</div>
                <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{ventaResult.ticker} · {ventaResult.name}</div>
              </div>
              <button onClick={()=>setVentaResult(null)} style={{background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:20}}>×</button>
            </div>
            <div style={{background:"var(--bg-input)",borderRadius:12,padding:"18px 20px",marginBottom:16,textAlign:"center"}}>
              <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Resultado FIFO</div>
              <div style={{fontSize:32,fontWeight:700,fontFamily:"Georgia,serif",color:ventaResult.pnlAmt>=0?"var(--green)":"var(--red)"}}>
                {ventaResult.pnlAmt>=0?"+":""}{ventaResult.pnlAmt.toLocaleString("es-AR",{minimumFractionDigits:2})} {ventaResult.currency}
              </div>
              <div style={{fontSize:18,color:ventaResult.pnlPct>=0?"var(--green)":"var(--red)",marginTop:4}}>
                {ventaResult.pnlPct>=0?"+":""}{ventaResult.pnlPct.toFixed(2)}%
              </div>
            </div>
            {(()=>{
              const d1=new Date(ventaResult.buyDate),d2=new Date(ventaResult.sellDate);
              const days=Math.max(1,(d2-d1)/(1000*60*60*24));
              const t10yPeriod=(Math.pow(1+liveT10Y/100,days/365)-1)*100;
              const bd=benchmarkData;
              const loading=!bd||bd.loading;
              const benchmarks=[
                {label:"Tu operación",val:ventaResult.pnlPct,color:ventaResult.pnlPct>=0?"var(--green)":"var(--red)",bold:true},
                {label:"Treasury 10Y ("+liveT10Y+"%)",val:t10yPeriod,color:"var(--yellow)"},
                {label:"S&P 500",val:bd?.sp500Pct??null,color:"#60A5FA"},
                {label:"Dólar CCL",val:bd?.cclPct??null,color:"#A78BFA"},
                {label:"Inflación AR",val:bd?.infArPct??null,color:"#F97316"},
              ];
              const maxVal=Math.max(...benchmarks.filter(b=>b.val!=null).map(b=>Math.abs(b.val)),1);
              return(
                <div style={{background:"var(--bg-input)",borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:11,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:12,display:"flex",justifyContent:"space-between"}}>
                    <span>vs benchmarks · {Math.round(days)} días</span>
                    {loading&&<span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>⟳</span>}
                  </div>
                  {benchmarks.map(b=>(
                    <div key={b.label} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:12,fontWeight:b.bold?700:400,color:b.bold?"var(--text-primary)":"var(--text-secondary)"}}>{b.label}</span>
                        <span style={{fontSize:13,fontWeight:700,color:b.val==null?"var(--text-muted)":b.color}}>
                          {b.val==null?(loading?"...":"n/d"):(b.val>=0?"+":"")+b.val.toFixed(2)+"%"}
                        </span>
                      </div>
                      {b.val!=null&&<div style={{height:5,background:"var(--border)",borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",width:Math.min(100,Math.abs(b.val)/maxVal*100)+"%",background:b.color,borderRadius:4,opacity:b.bold?1:0.65}}/>
                      </div>}
                    </div>
                  ))}
                </div>
              );
            })()}
            <button onClick={()=>setVentaResult(null)} style={{width:"100%",marginTop:16,padding:"10px",background:"var(--accent)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontWeight:600,fontSize:14}}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {modal&&<Modal h={modal==="add"?null:modal} port={port} onSave={saveOrDelete} onClose={()=>setModal(null)}/>}
    </>
  );
}
