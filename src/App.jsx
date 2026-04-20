/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";

const ASSET_TYPES = {
  accion_ar: { label: "Acciones AR",  color: "#3B82F6", icon: "📈" },
  cedear:    { label: "CEDEARs",      color: "#10B981", icon: "🌎" },
  bono_ars:  { label: "Bonos ARS",    color: "#F59E0B", icon: "📜" },
  bono_usd:  { label: "Bonos USD",    color: "#F97316", icon: "💵" },
  fci_ars:   { label: "FCI Pesos",    color: "#8B5CF6", icon: "🏦" },
  fci_usd:   { label: "FCI Dólares",  color: "#A78BFA", icon: "💰" },
};

const GALICIA_PORTFOLIO = [
  // BONOS ARS
  { id:1,  ticker:"TZXD6",     name:"BONTES CER V15/12/26",          type:"bono_ars", qty:781503,   buyPrice:179,       currentPrice:269.35,   buyCurrency:"ARS", rendPct:50.53, buyDate:"2026-04-01" },
  { id:2,  ticker:"TZX27",     name:"BONO REP ARG CER V30/06/27",    type:"bono_ars", qty:428449,   buyPrice:355.3,     currentPrice:360.95,   buyCurrency:"ARS", rendPct:1.60,  buyDate:"2026-04-06" },
  // BONOS USD
  { id:3,  ticker:"TLCUD",     name:"ON Telecom C28 05/03/29",       type:"bono_usd", qty:7000,     buyPrice:100.0,     currentPrice:101.6,    buyCurrency:"USD", rendPct:1.60,  buyDate:"2026-04-01" },
  { id:4,  ticker:"AO27D",     name:"Bono Tesoro 6% V29/10/27",      type:"bono_usd", qty:2954,     buyPrice:102.0,     currentPrice:101.7,    buyCurrency:"USD", rendPct:0.10,  buyDate:"2026-04-01" },
  { id:5,  ticker:"GD38D",     name:"BONOS REP ARG U$S V09/01/38",   type:"bono_usd", qty:1681,     buyPrice:78.0,      currentPrice:79.82,    buyCurrency:"USD", rendPct:5.31,  buyDate:"2026-04-01" },
  // ACCIONES AR
  { id:6,  ticker:"TXAR",      name:"Siderar (Ternium Argentina)",   type:"accion_ar",qty:2467,     buyPrice:607.00,    currentPrice:710.50,   buyCurrency:"ARS", rendPct:16.89, buyDate:"2026-03-03" },
  // CEDEARs
  { id:7,  ticker:"GLD",       name:"ETF SPDR Gold Trust",           type:"cedear",   qty:177,      buyPrice:14064.12,  currentPrice:12730.00, buyCurrency:"ARS", rendPct:-9.49, buyDate:"2026-02-05" },
  { id:8,  ticker:"NU",        name:"NU Holdings Cl A",              type:"cedear",   qty:189,      buyPrice:10850.00,  currentPrice:10590.00, buyCurrency:"ARS", rendPct:-2.40, buyDate:"2026-03-12" },
  { id:9,  ticker:"SPY",       name:"SPDR S&P 500 ETF",              type:"cedear",   qty:19,       buyPrice:50225.00,  currentPrice:48860.00, buyCurrency:"ARS", rendPct:-2.76, buyDate:"2026-03-03" },
  { id:10, ticker:"META",      name:"Meta Platforms Inc",            type:"cedear",   qty:44,       buyPrice:37941.38,  currentPrice:35760.00, buyCurrency:"ARS", rendPct:2.82,  buyDate:"2026-04-01" },
  { id:11, ticker:"MSFT",      name:"Microsoft Corp",                type:"cedear",   qty:46,       buyPrice:18943.81,  currentPrice:18480.00, buyCurrency:"ARS", rendPct:0.93,  buyDate:"2026-04-06" },
  { id:12, ticker:"VIST",      name:"Vista Oil & Gas",               type:"cedear",   qty:14,       buyPrice:35600.00,  currentPrice:34940.00, buyCurrency:"ARS", rendPct:-1.63, buyDate:"2026-03-30" },
  // FCI PESOS
  { id:13, ticker:"FIMA-PREM", name:"FIMA Premium Cl A (TNA 19.3%)", type:"fci_ars",  qty:7599.32,  buyPrice:74.457340, currentPrice:78.767480,buyCurrency:"ARS", rendPct:0.26,  buyDate:"2026-01-01" },
  { id:14, ticker:"FIMA-AHP",  name:"FIMA Ahorro Pesos Cl A",        type:"fci_ars",  qty:9.88,     buyPrice:600.718,   currentPrice:600.718,  buyCurrency:"ARS", rendPct:0.23,  buyDate:"2026-04-01" },
  { id:15, ticker:"FIMA-AHPP", name:"FIMA Ahorro Plus Cl A",         type:"fci_ars",  qty:2.30,     buyPrice:147.952,   currentPrice:147.952,  buyCurrency:"ARS", rendPct:0.26,  buyDate:"2026-04-01" },
  // FCI USD
  { id:16, ticker:"FIMA-PREMD",name:"FIMA Premium Dólares Cl A",     type:"fci_usd",  qty:140.00,   buyPrice:1.012932,  currentPrice:1.012932, buyCurrency:"USD", rendPct:0.01,  buyDate:"2026-04-01" },
];

const FX_FALLBACK = { CCL:1481, MEP:1427, oficial:1389 };  // updated Apr 2026
const YAHOO_PROXY = "https://yahoo-proxy-blue.vercel.app/api/yahoo"; // proxy sin CORS
const T10Y_FALLBACK = 4.35;

const fmtU = (n,d=0) => new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:d}).format(n);
const fmtA = (n) => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
const fmtP = (n) => `${n>=0?"+":""}${n.toFixed(2)}%`;
const pc   = (n) => n>=0?"var(--green)":"var(--red)";
// Fecha de hoy en horario Argentina (UTC-3)
const todayAR = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset() - 180); // forzar UTC-3
  return d.toISOString().slice(0,10);
};

// ── Mapeo de tickers ─────────────────────────────────────────────────────────
// data912: bonos, ONs, CEDEARs, acciones AR — precios en vivo (2h cache)
// Yahoo Finance (.BA): fallback para CEDEARs y acciones si data912 falla

// Tickers se determinan dinámicamente desde el portfolio activo
// data912 descarga todos los instrumentos y filtra por los tickers del portfolio
// Yahoo se usa como fallback para CEDEARs y acciones

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
async function fetchData912Prices(activeTickers=[]) {
  const result = {};
  const base = "https://data912.com/live";

  // Parsea todos los items del endpoint y guarda los que matcheen con activeTickers
  // Si activeTickers está vacío, guarda todos
  const parseD912 = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      const sym = item.ticker || item.symbol || item.s || "";
      const price = item.price ?? item.last ?? item.c ?? item.close ?? null;
      const change = item.change_pct ?? item.dp ?? item.change ?? 0;
      const match = activeTickers.length===0 || activeTickers.includes(sym);
      if (match && price != null && price > 0) {
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

  if (rBonds.status   === "fulfilled") parseD912(rBonds.value);
  if (rCedears.status === "fulfilled") parseD912(rCedears.value);
  if (rStocks.status  === "fulfilled") parseD912(rStocks.value);
  if (rCorp.status    === "fulfilled") parseD912(rCorp.value);

  return result;
}

// ── Yahoo Finance: fallback dinámico para cualquier ticker ───────────────────
async function fetchYahooPrices(activeTickers=[]) {
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
      // Intentar primero con .BA (instrumento BYMA)
      const res = await fetch(YAHOO_PROXY+"?symbol="+encodeURIComponent(ticker+".BA")+"&range=5d&interval=1d",
        {signal:AbortSignal.timeout(8000)});
      if(res.ok){ const d=await res.json(); if(parseYahoo(d,ticker,"yahoo_proxy")) return; }
      // Fallback: símbolo directo US
      const res2 = await fetch(YAHOO_PROXY+"?symbol="+encodeURIComponent(ticker)+"&range=5d&interval=1d",
        {signal:AbortSignal.timeout(8000)});
      if(res2.ok){ const d2=await res2.json(); parseYahoo(d2,ticker,"yahoo_us"); }
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
async function fetchAllLivePrices(activeTickers=[]) {
  const [fx, d912P, yahooP, fciP, t10y] = await Promise.all([
    fetchFXLive(),
    fetchData912Prices(activeTickers),
    fetchYahooPrices(activeTickers.filter(t=>!t.startsWith("FIMA"))),
    fetchFCIPrices(),
    fetchTreasury10Y(),
  ]);
  // Merge: data912 primero, Yahoo como fallback para tickers no cubiertos
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

function Donut({segs, size=120}){
  const [hovered, setHovered] = useState(null);
  const total=segs.reduce((a,s)=>a+s.v,0);if(!total)return null;
  const half=size/2;
  const r=half*0.8,inn=half*0.45;
  let cur=-Math.PI/2;

  const paths=segs.map(s=>{
    const ang=(s.v/total)*2*Math.PI;
    const x1=half+r*Math.cos(cur),y1=half+r*Math.sin(cur);
    const midAng=cur+ang/2;
    cur+=ang;
    const x2=half+r*Math.cos(cur),y2=half+r*Math.sin(cur);
    const ix1=half+inn*Math.cos(cur),iy1=half+inn*Math.sin(cur);
    const ix2=half+inn*Math.cos(cur-ang),iy2=half+inn*Math.sin(cur-ang);
    const lg=ang>Math.PI?1:0;
    const pct=((s.v/total)*100).toFixed(1);
    return{...s,d:`M${x1} ${y1}A${r} ${r} 0 ${lg} 1 ${x2} ${y2}L${ix1} ${iy1}A${inn} ${inn} 0 ${lg} 0 ${ix2} ${iy2}Z`,pct,midAng};
  });

  const hov=hovered!=null?paths.find(p=>p.k===hovered):null;

  return(
    <div style={{position:"relative",display:"inline-block"}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:"block"}}>
        {paths.map(p=>(
          <path key={p.k}
            d={p.d}
            fill={p.color}
            opacity={hovered===null||hovered===p.k?0.92:0.35}
            style={{cursor:"pointer",transition:"opacity 0.15s,transform 0.15s",
              transform:hovered===p.k?`translate(${Math.cos(p.midAng)*3}px,${Math.sin(p.midAng)*3}px)`:"none",
              transformOrigin:`${half}px ${half}px`}}
            onMouseEnter={()=>setHovered(p.k)}
            onMouseLeave={()=>setHovered(null)}
          />
        ))}
        <circle cx={half} cy={half} r={inn-1} fill="var(--bg-card)"/>
        {/* Centro: mostrar % cuando hay hover */}
        {hov&&(
          <text x={half} y={half-4} textAnchor="middle" fontSize="13" fontWeight="700" fill={hov.color}>{hov.pct}%</text>
        )}
        {hov&&(
          <text x={half} y={half+10} textAnchor="middle" fontSize="7" fill="var(--text-muted)">{hov.label||hov.k}</text>
        )}
      </svg>
    </div>
  );
}

function Chart100({series}){
  const [hover,setHover]=useState(null);
  if(!series?.length)return null;
  const W=560,H=280,PL=40,PT=10,PR=52,PB=22;
  const allV=series.flatMap(s=>s.data.map(d=>d.val));
  const minV=Math.min(...allV)*0.997,maxV=Math.max(...allV)*1.003;
  const n=series[0].data.length;
  const xS=i=>PL+(i/(Math.max(n-1,1)))*(W-PL-PR);
  const yS=v=>PT+(1-(v-minV)/(maxV-minV))*(H-PT-PB);
  const makePath=data=>data.map((d,i)=>`${i===0?"M":"L"}${xS(i).toFixed(1)},${yS(d.val).toFixed(1)}`).join(" ");
  const yTicks=Array.from({length:6},(_,i)=>minV+(maxV-minV)*i/5);
  const xLabels=[0,Math.floor(n/4),Math.floor(n/2),Math.floor(3*n/4),n-1].filter((v,i,a)=>a.indexOf(v)===i&&v<n);
  const fmtD=s=>s?s.slice(8)+'/'+s.slice(5,7):'';
  const LABELS={port:"Portfolio",spy:"S&P 500",ccl:"CCL",mep:"MEP",t10y:"T10Y"};
  const onMove=(e)=>{
    const rect=e.currentTarget.getBoundingClientRect();
    const svgX=(e.clientX-rect.left)*(W/rect.width);
    setHover(Math.max(0,Math.min(n-1,Math.round((svgX-PL)/(W-PL-PR)*(n-1)))));
  };
  const ttRight=hover!=null&&xS(hover)>W*0.65;
  const sortedByLastVal=[...series].filter(s=>s.data[n-1]?.val!=null).sort((a,b)=>(b.data[n-1]?.val||0)-(a.data[n-1]?.val||0));
  const labelY=[];
  return(
    <div style={{position:"relative",width:"100%",height:"100%"}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block",cursor:"crosshair"}}
        onMouseMove={onMove} onMouseLeave={()=>setHover(null)}>
        {yTicks.map((v,i)=>(
          <g key={i}>
            <line x1={PL} x2={W-PR} y1={yS(v)} y2={yS(v)} stroke="var(--border)" strokeWidth="0.6" opacity="0.8"/>
            <text x={PL-6} y={yS(v)+4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{v.toFixed(1)}</text>
          </g>
        ))}
        <line x1={PL} x2={W-PR} y1={yS(100)} y2={yS(100)} stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4,4"/>
        {series.map(s=>(
          <path key={s.key} d={makePath(s.data)} fill="none" stroke={s.color} strokeWidth={s.bold?2.5:1.5} strokeLinejoin="round" opacity={s.bold?1:0.75}/>
        ))}
        {sortedByLastVal.map((s,i)=>{
          const v=s.data[n-1]?.val;if(v==null)return null;
          const rawY=yS(v),minGap=13;
          let cy=rawY;for(const py of labelY){if(Math.abs(cy-py)<minGap)cy=py+minGap;}
          labelY.push(cy);
          const pct=(v-100).toFixed(2);
          return(
            <g key={`lbl-${s.key}`}>
              {Math.abs(cy-rawY)>2&&<line x1={xS(n-1)} y1={rawY} x2={xS(n-1)+6} y2={cy} stroke={s.color} strokeWidth="0.8" opacity="0.4"/>}
              <circle cx={xS(n-1)} cy={rawY} r={s.bold?4:3} fill={s.color}/>
              <text x={xS(n-1)+8} y={cy+5} fontSize="14" fill={s.color} fontWeight="700">{pct>=0?"+":""}{pct}%</text>
            </g>
          );
        })}
        {xLabels.map(i=>(
          <text key={i} x={xS(i)} y={H-6} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{fmtD(series[0].data[i]?.date)}</text>
        ))}
        {hover!=null&&(
          <>
            <line x1={xS(hover)} x2={xS(hover)} y1={PT} y2={H-PB} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
            {series.map(s=>{const v=s.data[hover]?.val;if(v==null)return null;return <circle key={s.key} cx={xS(hover)} cy={yS(v)} r={s.bold?4.5:3} fill={s.color} stroke="var(--bg-card)" strokeWidth="1.5"/>;  })}
          </>
        )}
      </svg>
      {hover!=null&&(
        <div style={{
          position:"absolute",top:10,
          left:ttRight?undefined:(xS(hover)/W*100)+"%",
          right:ttRight?((1-xS(hover)/W)*100)+"%":undefined,
          transform:ttRight?"translateX(10px)":"translateX(-50%)",
          background:"var(--bg-card)",border:"1px solid var(--border)",
          borderRadius:9,padding:"9px 13px",pointerEvents:"none",
          fontSize:12,minWidth:152,boxShadow:"0 6px 20px rgba(0,0,0,0.45)",zIndex:10,
        }}>
          <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:7,fontWeight:700,letterSpacing:1}}>
            {(()=>{const d=series[0].data[hover]?.date;return d?d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4):''})()}
          </div>
          {series.map(s=>{
            const v=s.data[hover]?.val;if(v==null)return null;
            const pct=(v-100).toFixed(2);
            return(
              <div key={s.key} style={{display:"flex",justifyContent:"space-between",gap:14,marginBottom:4,alignItems:"center"}}>
                <span style={{color:s.color,fontSize:11,fontWeight:s.bold?700:400}}>{LABELS[s.key]||s.key}</span>
                <span style={{fontWeight:700,fontFamily:"monospace",fontSize:12,color:v>=100?"var(--green)":"var(--red)"}}>
                  {v>=100?"+":""}{pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── Time-Weighted Return (TWR) ────────────────────────────────────────────────
// Para cada sub-período entre flujos, el retorno es valor_fin / valor_inicio.
// Los flujos no generan retorno — solo cambian la base del siguiente sub-período.
function calcTWR(dates, trades, en, tickerBars, cclBars, mepBars, currency, fxRate, livePricesMap, customEnd=null){
  if(!dates||dates.length<2) return [];
  const realTodayStr=todayAR();
  const todayStr=customEnd&&customEnd<realTodayStr?null:realTodayStr; // null = don't use live prices
  const liveMap=(todayStr&&livePricesMap)||{};

  function findPrice2(bars,d){
    if(!bars?.length)return null;
    const t=new Date(d).getTime();
    return bars.reduce((b,x)=>Math.abs(new Date(x.date)-t)<Math.abs(new Date(b.date)-t)?x:b,bars[0])?.close||null;
  }

  // Valor del portfolio en dateStr, usando solo trades cuyo timestamp <= dateT
  const getPortVal=(dateStr, dateT)=>{
    let total=0;
    const isToday=dateStr===todayStr;
    for(const h of en){
      const buys=trades.filter(t=>t.ticker===h.ticker&&t.tipo==="compra"&&new Date(t.date).getTime()<=dateT);
      const sells=trades.filter(t=>t.ticker===h.ticker&&t.tipo==="venta"&&new Date(t.date).getTime()<=dateT);
      const qty=Math.max(0,buys.reduce((a,t)=>a+t.qty,0)-sells.reduce((a,t)=>a+t.qty,0));
      if(qty<=0)continue;
      const isBond=h.type==="bono_usd"||h.type==="bono_ars";
      const qtyFactor=isBond?qty/100:qty;
      const bars=tickerBars[h.ticker];
      let price;
      if(isToday&&liveMap[h.ticker]){
        // liveMap already has normalized price (x100 for bonds)
        price=liveMap[h.ticker];
      } else if(bars&&bars.length){
        if(dateStr<bars[0].date)continue;
        const rawP=findPrice2(bars,dateStr);
        if(!rawP)continue;
        // historicos.json stores per-unit, prices are now stored per-100-laminas
        // need x100 for bono_ars to match stored price scale
        price=isBond&&h.type==="bono_ars"?rawP*100:rawP;
      } else {
        const firstBuy=buys.slice().sort((a,b)=>a.date.localeCompare(b.date))[0];
        if(!firstBuy||dateStr<firstBuy.date)continue;
        const totalCost=buys.reduce((a,t)=>a+t.qty*t.price,0);
        const totalQty=buys.reduce((a,t)=>a+t.qty,0);
        const rawFallback=totalQty>0?totalCost/totalQty:h.currentPrice;
        // bono_ars prices stored per 100 laminas → divide by 100 to match qtyFactor scale
        price=isBond&&h.type==="bono_ars"?rawFallback/100:rawFallback;
      }
      const cclDay=cclBars.length?findPrice2(cclBars,dateStr)||fxRate:fxRate;
      const mepDay=mepBars.length?findPrice2(mepBars,dateStr)||fxRate:fxRate;
      if(currency==="ARS")total+=price*qtyFactor;
      else if(currency==="USD_CCL")total+=price*qtyFactor/cclDay;
      else total+=price*qtyFactor/mepDay;
    }
    return total; // puede ser 0 si no hay posición aún
  };

  const twr=[{date:dates[0],val:100}];
  let cumulative=1;

  for(let i=1;i<dates.length;i++){
    const dateStr=dates[i];
    const prevDateStr=dates[i-1];
    const dateT=new Date(dateStr).getTime();
    const prevDateT=new Date(prevDateStr).getTime();

    // Valor al cierre de ayer (posición completa de ayer, precio de ayer)
    const valPrevClose=getPortVal(prevDateStr, prevDateT);

    // Valor de hoy CON la posición de AYER (antes de cualquier flujo de hoy) al precio de HOY
    // = excluir trades cuya fecha sea exactamente hoy
    const dateT_before=dateT-1; // 1ms antes → excluye trades de hoy
    const valTodayBeforeFlow=getPortVal(dateStr, dateT_before);

    // Retorno del día = solo movimiento de precios, sin distorsión por flujos
    let dayReturn;
    if(valPrevClose<=0){
      // Portfolio vacío ayer — no hay retorno que calcular
      dayReturn=1;
    } else {
      dayReturn=valTodayBeforeFlow/valPrevClose;
    }

    // Clampear retornos absurdos (errores de datos)
    if(!isFinite(dayReturn)||dayReturn<=0||dayReturn>3)dayReturn=1;

    cumulative*=dayReturn;
    twr.push({date:dateStr,val:parseFloat((100*cumulative).toFixed(4))});
  }

  return twr;
}

function EvoMini({en,trades,fxRate,liveT10Y,liveFX,liveSP500,historicos,isModal=false,livePricesAll={},onExpand=null}){
  const PERIODS=[{key:"mtd",label:"MTD",days:null,mtd:true},{key:"30d",label:"30d",days:30},{key:"90d",label:"90d",days:90},{key:"ytd",label:"YTD",days:null},{key:"1y",label:"1 año",days:365},{key:"3y",label:"3 años",days:1095}];
  const [period,setPeriod]=useState("90d");
  const [currency,setCurrency]=useState("USD_CCL");
  const [chartData,setChartData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [scrubStart,setScrubStart]=useState(null); // ISO date string or null
  const [scrubEnd,setScrubEnd]=useState(null);
  const [scrubDrag,setScrubDrag]=useState(null);   // {type,anchorX,anchorPct}
  const scrubRef=React.useRef(null);
  const fmtP=n=>`${n>=0?"+":""}${n.toFixed(2)}%`;
  const pc=n=>n>=0?"var(--green)":"var(--red)";
  const fmtD=s=>s?s.slice(8)+'/'+s.slice(5,7):'';

  const getDates=(p,hist,customStart=null,customEnd=null)=>{
    const today=customEnd||todayAR();
    const end=new Date(today);
    let periodStart;
    if(customStart){periodStart=new Date(customStart);}
    else if(p.key==="ytd")periodStart=new Date(end.getFullYear()+"-01-01");
    else if(p.key==="mtd"||p.mtd)periodStart=new Date(end.getFullYear()+"-"+(String(end.getMonth()+1).padStart(2,"0"))+"-01");
    else{periodStart=new Date(today);periodStart.setDate(periodStart.getDate()-p.days);}
    const firstBuy=trades.filter(t=>t.tipo==="compra").sort((a,b)=>a.date.localeCompare(b.date))[0]?.date;
    const firstBuyDate=firstBuy?new Date(firstBuy):end;
    // customStart never goes before first buy date
    if(customStart&&new Date(customStart)<firstBuyDate)customStart=firstBuyDate.toISOString().slice(0,10);
    const start=firstBuyDate>periodStart?firstBuyDate:periodStart;
    const startStr=(customStart&&customStart>start.toISOString().slice(0,10))?customStart:start.toISOString().slice(0,10);

    // Obtener todas las fechas con datos de tickers del portfolio
    const portfolioTickers=[...new Set(trades.map(t=>t.ticker))];
    const excludeKeys=new Set(['CCL','MEP','sp500','t10y']);
    const dateSet=new Set();
    for(const k of Object.keys(hist)){
      if(excludeKeys.has(k)&&!portfolioTickers.includes(k))continue;
      const bars=hist[k]||[];
      for(const b of bars){if(b.date<=today)dateSet.add(b.date);}
    }
    const allDates=[...dateSet].sort();

    // Buscar el último día hábil <= startStr (no el siguiente)
    const firstValid=allDates.filter(d=>d<=startStr).slice(-1)[0] || allDates.find(d=>d>=startStr) || allDates[0];

    const actualEnd=customEnd||today;
    const filtered=allDates.filter(d=>d>=firstValid&&d<=actualEnd);
    // Solo agregar hoy si no hay customEnd o el customEnd es hoy
    if(!customEnd||customEnd>=today)filtered.push(today);
    return[...new Set(filtered)].sort();
  };

  const findPrice=(bars,dateStr)=>{
    if(!bars||!bars.length)return null;
    const t=new Date(dateStr).getTime();
    return bars.reduce((b,x)=>Math.abs(new Date(x.date)-t)<Math.abs(new Date(b.date)-t)?x:b,bars[0])?.close||null;
  };

  const load=async(p,hist,customStart=null,customEnd=null)=>{
    setLoading(true);setChartData(null);
    const _hist=hist||historicos||{};
    const _getCCL=()=>_hist.CCL||[];
    const _getMEP=()=>_hist.MEP||[];
    const _getSPY=()=>_hist.sp500||[];
    const _getTicker=t=>{const b=_hist[t];return b?.length?b:null;};
    try{
      const dates=getDates(p,_hist,customStart,customEnd);
      const cclBars=_getCCL(),mepBars=_getMEP(),sp500Bars=_getSPY(),spyByma=_getTicker("SPY")||[];

      const realToday=todayAR();
      const todayStr=customEnd&&customEnd<realToday?null:realToday; // null = no live prices

      // Función que obtiene el precio de una barra, usando el valor live para hoy si está disponible
      const getPriceWithLive=(bars,dateStr,liveVal)=>{
        if(todayStr&&dateStr===todayStr&&liveVal!=null)return liveVal;
        return findPrice(bars,dateStr);
      };

      let spy100=null;
      // Precio live CEDEAR SPY en ARS — solo para modo ARS
      const liveSPYars=livePricesAll["SPY"]?.price||livePricesMap["SPY"]||null;

      if(currency!=="ARS"){
        // USD CCL / USD MEP: usar índice S&P real en USD (historicos.sp500)
        // Para hoy: liveSP500 si está disponible, sino último bar (no inventar con CEDEAR)
        if(sp500Bars.length>=2){
          const ptsRaw=dates.map(d=>{
            if(d===todayStr&&liveSP500!=null&&liveSP500>1000)return{date:d,val:liveSP500};
            const v=findPrice(sp500Bars,d);
            return v?{date:d,val:v}:null;
          }).filter(Boolean);
          if(ptsRaw.length>=2){const base=ptsRaw[0].val;spy100=ptsRaw.map(x=>({date:x.date,val:base>0?100*x.val/base:100}));}
        }
        // Fallback si no hay historicos S&P: CEDEAR SPY ÷ TC (mismo TC para todos los días)
        if(!spy100&&spyByma.length>=2){
          const tcBars=currency==="USD_MEP"?mepBars:cclBars;
          const pts=dates.map(d=>{
            const pARS=d===todayStr&&liveSPYars?liveSPYars:findPrice(spyByma,d);
            if(!pARS)return null;
            const tc=d===todayStr?fxRate:(tcBars.length?(findPrice(tcBars,d)||fxRate):fxRate);
            return{date:d,val:pARS/tc};
          }).filter(Boolean);
          if(pts.length>=2){const base=pts[0].val;spy100=pts.map(x=>({date:x.date,val:base>0?100*x.val/base:100}));}
        }
      } else {
        // ARS: CEDEAR SPY en pesos — puro ARS, sin conversión
        // Para hoy usar precio live del CEDEAR
        if(spyByma.length>=2){
          const pts=dates.map(d=>{
            const pARS=d===todayStr&&liveSPYars?liveSPYars:findPrice(spyByma,d);
            return pARS?{date:d,val:pARS}:null;
          }).filter(Boolean);
          if(pts.length>=2){const base=pts[0].val;spy100=pts.map(x=>({date:x.date,val:base>0?100*x.val/base:100}));}
        }
      }

      let ccl100=null,mep100=null;
      if(currency==="ARS"&&cclBars.length>=2){
        // Para hoy usar liveFX.CCL
        const pts=dates.map(d=>({date:d,val:todayStr&&d===todayStr?liveFX.CCL:(findPrice(cclBars,d)||cclBars[0].close)}));
        const base=pts[0].val;ccl100=pts.map(x=>({date:x.date,val:base>0?100*x.val/base:100}));
      }
      if(currency==="ARS"&&mepBars.length>=2){
        // Para hoy usar liveFX.MEP
        const pts=dates.map(d=>({date:d,val:todayStr&&d===todayStr?liveFX.MEP:(findPrice(mepBars,d)||mepBars[0].close)}));
        const base=pts[0].val;mep100=pts.map(x=>({date:x.date,val:base>0?100*x.val/base:100}));
      }

      const t10yBars=_getTicker("t10y")||[];
      let t10y100=null;
      if(currency==="ARS"&&t10yBars.length>=2){
        // T10Y en historicos es la tasa (ej: 4.35). Convertir a retorno acumulado base 100.
        // Cada día: rendimiento = (1 + tasa_diaria/100)^días_acumulados
        const pts=dates.map(d=>({date:d,val:findPrice(t10yBars,d)||liveT10Y}));
        const startDate=dates[0];
        t10y100=pts.map(x=>{
          const days=Math.max(0,(new Date(x.date)-new Date(startDate))/(1000*60*60*24));
          return{date:x.date,val:parseFloat((100*Math.pow(1+x.val/100,days/365)).toFixed(4))};
        });
      } else if(currency==="ARS"){
        // Fallback sintético si no hay datos
        t10y100=dates.map(d=>{const days=Math.max(0,(new Date(d)-new Date(dates[0]))/(1000*60*60*24));return{date:d,val:100*Math.pow(1+liveT10Y/100,days/365)};});
      }
      const allTickers=[...new Set(en.map(h=>h.ticker))];
      const tickerBars={};
      for(const ticker of allTickers){const bars=_getTicker(ticker);if(bars)tickerBars[ticker]=bars;}

      // Precios en vivo para el punto de hoy
      const livePricesMap={};
      if(!customEnd||customEnd>=todayAR()){
        for(const h of en){
          if(h.isLive){
            // historicos.json stores per-unit prices, liveMap must match
            // data912 returns per-100-laminas for bonds → divide by 100
            // bono_ars: data912 per 100 laminas, calcTWR qtyFactor=qty/100 expects per-unit → /100
            livePricesMap[h.ticker]=h.type==="bono_ars"?h.currentPrice/100:h.currentPrice;
          }
        }
      }

      // TWR — Time Weighted Return
      // Solo agregar "hoy" al final si no hay customEnd (o customEnd es hoy)
      const realToday2=todayAR();
      const datesWithToday=[...dates];
      if(!customEnd||customEnd>=realToday2){
        if(datesWithToday[datesWithToday.length-1]!==realToday2)datesWithToday.push(realToday2);
      }

      const port100=calcTWR(datesWithToday,trades,en,tickerBars,cclBars,mepBars,currency,fxRate,livePricesMap,customEnd);

      setChartData({
        port100,t10y100,spy100,ccl100,mep100,currency,
        portBase:null,
        startDate:dates[0],endDate:datesWithToday[datesWithToday.length-1],
        portRet:port100.length>0?(port100[port100.length-1].val-100).toFixed(2):"0.00",
        spyRet:spy100?(spy100[spy100.length-1].val-100).toFixed(2):null,
        cclRet:ccl100?(ccl100[ccl100.length-1].val-100).toFixed(2):null,
        mepRet:mep100?(mep100[mep100.length-1].val-100).toFixed(2):null,
      });
    }catch(e){console.error(e);}
    setLoading(false);
  };

  useEffect(()=>{
    if(!historicos||Object.keys(historicos).length===0)return;
    const p=PERIODS.find(x=>x.key===period);
    if(p)load(p,historicos,scrubStart,scrubEnd);
  },[period,currency,historicos,trades,scrubStart,scrubEnd]);

  useEffect(()=>{
    if(!historicos||Object.keys(historicos).length===0)return;
    const p=PERIODS.find(x=>x.key===period);
    if(p)load(p,historicos,scrubStart,scrubEnd);
  },[liveFX,liveSP500,historicos,trades]);

  const cd=chartData;
  const series=cd?[
    {key:"port",data:cd.port100,color:"var(--green)",bold:true},
    ...(cd.spy100?[{key:"spy",data:cd.spy100,color:"#60A5FA",bold:false}]:[]),
    ...(cd.currency==="ARS"&&cd.t10y100?[{key:"t10y",data:cd.t10y100,color:"var(--yellow)",bold:false}]:[]),
    ...(cd.ccl100?[{key:"ccl",data:cd.ccl100,color:"#A78BFA",bold:false}]:[]),
    ...(cd.mep100?[{key:"mep",data:cd.mep100,color:"#F472B6",bold:false}]:[]),
  ]:[];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {["ARS","USD_CCL","USD_MEP"].map(c=>(
            <button key={c} onClick={()=>setCurrency(c)}
              style={{padding:"2px 8px",borderRadius:5,border:"1px solid var(--border)",cursor:"pointer",fontSize:10,
                background:currency===c?"var(--accent)":"transparent",color:currency===c?"#fff":"var(--text-muted)"}}>
              {c==="ARS"?"ARS":c==="USD_CCL"?"USD CCL":"USD MEP"}
            </button>
          ))}
          <span style={{color:"var(--text-muted)",fontSize:10}}>|</span>
          <span style={{fontSize:10,color:"var(--green)"}}>— Portfolio</span>
          {cd?.spy100&&<span style={{fontSize:10,color:"#60A5FA"}}>— S&amp;P 500</span>}
          {cd?.currency==="ARS"&&<span style={{fontSize:10,color:"var(--yellow)"}}>— T10Y</span>}
          {cd?.ccl100&&<span style={{fontSize:10,color:"#A78BFA"}}>— CCL</span>}
          {cd?.mep100&&<span style={{fontSize:10,color:"#F472B6"}}>— MEP</span>}
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          {PERIODS.map(p=>(
            <button key={p.key} onClick={()=>{setPeriod(p.key);setScrubStart(null);setScrubEnd(null);}}
              style={{padding:"3px 8px",borderRadius:6,border:"1px solid var(--border)",cursor:"pointer",fontSize:11,
                fontWeight:period===p.key&&!scrubStart&&!scrubEnd?700:400,
                background:period===p.key&&!scrubStart&&!scrubEnd?"var(--accent)":"var(--bg-input)",
                color:period===p.key&&!scrubStart&&!scrubEnd?"#fff":"var(--text-secondary)"}}>
              {p.label}
            </button>
          ))}
          {onExpand&&<button onClick={onExpand} title="Ampliar"
            style={{background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:5,padding:"3px 7px",cursor:"pointer",color:"var(--text-muted)",lineHeight:1,display:"flex",alignItems:"center",marginLeft:4}}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7.5 1.5H10.5V4.5M4.5 10.5H1.5V7.5M10.5 1.5L6.5 5.5M1.5 10.5L5.5 6.5"/></svg>
          </button>}
        </div>
      </div>
      <div style={{flex:1,overflow:"visible",minHeight:0,position:"relative"}}>
        {loading&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-muted)",fontSize:12}}><span style={{animation:"spin 0.8s linear infinite",display:"inline-block",marginRight:6}}>⟳</span>Cargando...</div>}
        {cd&&!loading&&series.length>0&&<Chart100 series={series}/>}
      </div>
      {/* ── Scrubber ── */}
      {historicos&&(()=>{
        const today=todayAR();
        const allBars=historicos?.CCL||[];
        if(allBars.length<2)return null;
        // Primera fecha: la primera con datos reales (CCL o primera compra)
        const firstBuyDate=trades.filter(t=>t.tipo==="compra").sort((a,b)=>a.date.localeCompare(b.date))[0]?.date||allBars[0].date;
        // Scrubber starts at first buy — no point showing earlier
        const firstDate=firstBuyDate;
        const lastDate=today;
        const totalDays=(new Date(lastDate)-new Date(firstDate))/(1000*60*60*24);

        const dateToX=d=>Math.max(0,Math.min(100,(new Date(d)-new Date(firstDate))/(new Date(lastDate)-new Date(firstDate))*100));
        const xToDate=x=>{
          const ms=new Date(firstDate).getTime()+x/100*(new Date(lastDate)-new Date(firstDate));
          return new Date(ms).toISOString().slice(0,10);
        };

        const startX=dateToX(scrubStart||cd?.startDate||firstDate);
        const endX=dateToX(scrubEnd||lastDate);

        const onMouseDown=(e,type)=>{
          e.preventDefault();
          const rect=scrubRef.current?.getBoundingClientRect();
          if(!rect)return;
          setScrubDrag({type,anchorX:e.clientX,anchorPct:(e.clientX-rect.left)/rect.width*100,startX,endX});
        };
        const onMouseMove=e=>{
          if(!scrubDrag||!scrubRef.current)return;
          const rect=scrubRef.current.getBoundingClientRect();
          const pct=(e.clientX-rect.left)/rect.width*100;
          const delta=pct-scrubDrag.anchorPct;
          if(scrubDrag.type==='start'){
            // Start can't go past end-2% and end can't be in the future (100%)
            const nx=Math.max(0,Math.min(scrubDrag.endX-2,scrubDrag.startX+delta));
            const d=xToDate(nx);
            setScrubStart(d>=lastDate?null:d); // if dragged to today, reset to null
          } else if(scrubDrag.type==='end'){
            // End can't go past today (100%) and can't go before start+2%
            const nx=Math.max(scrubDrag.startX+2,Math.min(100,scrubDrag.endX+delta));
            const d=xToDate(nx);
            setScrubEnd(d>=lastDate?null:d); // if at today, null = "use today"
          } else {
            const span=scrubDrag.endX-scrubDrag.startX;
            const ns=Math.max(0,Math.min(100-span,scrubDrag.startX+delta));
            const ds=xToDate(ns);
            const de=xToDate(ns+span);
            setScrubStart(ds>=lastDate?null:ds);
            setScrubEnd(de>=lastDate?null:de);
          }
        };
        const onMouseUp=()=>setScrubDrag(null);

        return(
          <div style={{paddingTop:8,paddingBottom:2,userSelect:"none",margin:"0 20px"}}
            onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
            <div ref={scrubRef} style={{position:"relative",height:18,cursor:"default",overflow:"visible"}}>
              {/* Track line */}
              <div style={{position:"absolute",top:"50%",left:0,right:0,height:3,background:"var(--border)",borderRadius:2,transform:"translateY(-50%)"}}/>
              {/* Active segment */}
              <div style={{
                position:"absolute",top:"50%",
                left:`${startX}%`,width:`${endX-startX}%`,
                height:3,background:"linear-gradient(90deg,var(--accent),var(--accent2))",borderRadius:2,
                transform:"translateY(-50%)",cursor:"grab",
              }} onMouseDown={e=>onMouseDown(e,'window')}/>
              {/* Start handle */}
              <div style={{
                position:"absolute",top:"50%",transform:"translate(-50%,-50%)",
                left:`${startX}%`,width:12,height:12,
                background:"var(--accent)",borderRadius:"50%",cursor:"ew-resize",
                boxShadow:"0 0 0 2px var(--bg-card),0 0 8px rgba(59,130,246,0.4)",
              }} onMouseDown={e=>onMouseDown(e,'start')}/>
              {/* End handle */}
              <div style={{
                position:"absolute",top:"50%",transform:"translate(-50%,-50%)",
                left:`${endX}%`,width:14,height:14,
                background:"var(--accent)",borderRadius:"50%",cursor:"ew-resize",
                boxShadow:"0 0 0 2px var(--bg-card),0 0 8px rgba(59,130,246,0.4)",
              }} onMouseDown={e=>onMouseDown(e,'end')}/>
            </div>
            {/* Date labels centered below each handle */}
            {(()=>{
              const fmt=d=>d?d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'';
              return(
                <div style={{position:"relative",height:16,marginTop:4,fontSize:9,color:"var(--text-muted)"}}>
                  <span style={{position:"absolute",left:`${startX}%`,transform:"translateX(-50%)",whiteSpace:"nowrap"}}>
                    {fmt(scrubStart||cd?.startDate||firstDate)}
                  </span>
                  <span style={{position:"absolute",left:`${endX}%`,transform:"translateX(-50%)",whiteSpace:"nowrap"}}>
                    {fmt(scrubEnd||lastDate)}
                  </span>
                </div>
              );
            })()}
          </div>
        );
      })()}
      {cd&&!loading&&(()=>{
        const port100=cd.port100;
        let sharpe=null,spySharpe=null;
        if(port100.length>=3){
          const dr=[];for(let i=1;i<port100.length;i++){const p=port100[i-1].val,c=port100[i].val;if(p>0)dr.push((c-p)/p);}
          if(dr.length>=2){
            const avg=dr.reduce((a,r)=>a+r,0)/dr.length;
            const std=Math.sqrt(dr.reduce((a,r)=>a+Math.pow(r-avg,2),0)/dr.length);
            const rf=liveT10Y/100/252;
            if(std>0)sharpe=((avg-rf)/std)*Math.sqrt(252);
            if(cd.spy100?.length>2){
              const sr=[];for(let i=1;i<cd.spy100.length;i++){const p=cd.spy100[i-1].val,c=cd.spy100[i].val;if(p>0)sr.push((c-p)/p);}
              if(sr.length>=2){const sa=sr.reduce((a,r)=>a+r,0)/sr.length;const ss=Math.sqrt(sr.reduce((a,r)=>a+Math.pow(r-sa,2),0)/sr.length);if(ss>0)spySharpe=((sa-rf)/ss)*Math.sqrt(252);}
            }
          }
        }
        const sc=sharpe!=null?(sharpe>1?"var(--green)":sharpe>0?"var(--yellow)":"var(--red)"):"var(--text-muted)";
        return sharpe!=null?(
          <div style={{display:"flex",alignItems:"center",gap:isModal?16:10,marginTop:isModal?12:6,paddingTop:isModal?12:6,borderTop:"1px solid var(--border)",flexWrap:"wrap"}}>
            <span style={{fontSize:isModal?11:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>Sharpe</span>
            <span style={{fontSize:isModal?15:11,color:"var(--text-muted)"}}>Portfolio: <b style={{color:sc,fontSize:isModal?18:13}}>{sharpe.toFixed(2)}</b></span>
            {spySharpe!=null&&<span style={{fontSize:isModal?15:11,color:"var(--text-muted)"}}>S&amp;P 500: <b style={{color:"#60A5FA",fontSize:isModal?18:13}}>{spySharpe.toFixed(2)}</b></span>}
            <span style={{fontSize:isModal?11:9,color:"var(--text-muted)",marginLeft:"auto"}}>rf {liveT10Y}% anualizado · {(()=>{const f=s=>s?s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'';return f(cd.startDate)+' → '+f(cd.endDate)})()}</span>
          </div>
        ):null;
      })()}
    </div>
  );
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
                <span style={{fontSize:11,color:"var(--text-muted)"}}>{Number(pos.qty).toLocaleString("es-AR")} nominales</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {value&&(()=>{
        const pos=port.find(p=>p.ticker===value);
        return pos?(
          <div style={{marginTop:6,fontSize:11,color:"var(--text-muted)"}}>
            {pos.name} · Tenencia: <b style={{color:"var(--text-primary)"}}>{Number(pos.qty).toLocaleString("es-AR")} nominales</b>
          </div>
        ):null;
      })()}
    </div>
  );
}

// ── Inferir tipo y moneda desde ticker y endpoint ────────────────────────────
// Convención BYMA para bonos:
//   Sin sufijo (GD30, AL30)  → bono_ars · ARS (cotiza en pesos)
//   Sufijo C   (GD30C)       → bono_usd · ARS (cotiza en ARS al precio CCL)
//   Sufijo D   (GD30D)       → bono_usd · USD (cotiza en USD, precio cable/MEP)
function inferType(item, endpoint){
  const ticker = (item.ticker||item.symbol||item.s||"").toUpperCase();
  if(endpoint==="arg_cedears") return "cedear";
  if(endpoint==="arg_stocks")  return "accion_ar";
  if(endpoint==="arg_bonds"||endpoint==="arg_corp"){
    const endsD = ticker.endsWith("D");
    const endsC = ticker.endsWith("C");
    const descUSD = (item.description||item.name||"").toUpperCase().match(/U\$S|USD/);
    return (endsD||endsC||descUSD) ? "bono_usd" : "bono_ars";
  }
  return "accion_ar";
}

function inferCurrency(item, endpoint){
  const ticker = (item.ticker||item.symbol||item.s||"").toUpperCase();
  if(endpoint==="arg_bonds"||endpoint==="arg_corp"){
    // D = cable/MEP en USD, C = CCL en USD — ambos se miden en USD
    if(ticker.endsWith("D")||ticker.endsWith("C")) return "USD";
  }
  return "ARS";
}

function Modal({h,port=[],onSave,onClose}){
  const blank={ticker:"",name:"",type:"accion_ar",qty:"",buyPrice:"",buyCurrency:"ARS",buyDate:todayAR(),operacion:"compra",comision:""};
  const [f,setF]=useState(h?{...h,operacion:"compra",buyPrice:""}:blank);
  const [tickerStatus,setTickerStatus]=useState(h?"confirmed":"idle");
  const [searchResults,setSearchResults]=useState([]); // lista de instrumentos encontrados
  const [selectedResult,setSelectedResult]=useState(null); // instrumento seleccionado
  const [tickerTimer,setTickerTimer]=useState(null);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const inp={background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 12px",color:"var(--text-primary)",fontSize:14,width:"100%"};

  // Busca en data912 + Yahoo y devuelve lista de instrumentos que matchean el query
  const searchInstruments = async (query) => {
    if(!query||query.length<2){setSearchResults([]);setTickerStatus("idle");return;}
    setTickerStatus("checking");
    setSearchResults([]);
    const results=[];
    const q=query.toUpperCase();

    // 1. data912 — busca en los 4 endpoints en paralelo
    try{
      const base="https://data912.com/live";
      const [rBonds,rCedears,rStocks,rCorp]=await Promise.allSettled([
        fetch(`${base}/arg_bonds`,  {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
        fetch(`${base}/arg_cedears`,{signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
        fetch(`${base}/arg_stocks`, {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
        fetch(`${base}/arg_corp`,   {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
      ]);
      const endpoints=[
        {key:"arg_bonds",  data:rBonds},
        {key:"arg_cedears",data:rCedears},
        {key:"arg_stocks", data:rStocks},
        {key:"arg_corp",   data:rCorp},
      ];
      for(const {key,data} of endpoints){
        if(data.status!=="fulfilled"||!Array.isArray(data.value))continue;
        for(const item of data.value){
          const sym=(item.ticker||item.symbol||item.s||"").toUpperCase();
          const desc=(item.description||item.name||item.nombre||"").toUpperCase();
          if(!sym.includes(q)&&!desc.includes(q))continue;
          const price=parseFloat(item.price||item.last||item.c||item.close||0);
          if(price<=0)continue;
          const type=inferType(item,key);
          const currency=inferCurrency(item,key);
          const rawName=item.description||item.name||item.nombre||"";
          const name=rawName||AR_TICKERS[sym]||sym;
          results.push({
            ticker:sym,
            name,
            type,
            buyCurrency:currency,
            price,
            source:"data912/"+key.replace("arg_",""),
          });
        }
      }
    }catch(e){console.warn("data912 error",e);}

    // 2. Yahoo Finance — busca el ticker directo y con .BA
    try{
      const syms=[q,q+".BA"].join(",");
      const url=`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(syms)}&fields=shortName,regularMarketPrice,currency,quoteType`;
      const res=await fetch(url,{signal:AbortSignal.timeout(6000)});
      if(res.ok){
        const data=await res.json();
        for(const item of data?.quoteResponse?.result||[]){
          const sym=(item.symbol||"").replace(".BA","").toUpperCase();
          if(!sym.includes(q))continue;
          const price=item.regularMarketPrice||0;
          if(price<=0)continue;
          const alreadyFound=results.find(r=>r.ticker===sym&&r.source.startsWith("data912"));
          if(alreadyFound){
            // Enriquecer nombre si data912 no lo tenía
            if(alreadyFound.name===sym||alreadyFound.name==="")alreadyFound.name=item.shortName||alreadyFound.name;
            continue;
          }
          const cur=(item.currency||"ARS").toUpperCase()==="USD"?"USD":"ARS";
          const qt=item.quoteType||"";
          let type="accion_ar";
          if(qt==="ETF"||qt==="MUTUALFUND")type="cedear";
          else if(cur==="USD")type="accion_ar";
          results.push({
            ticker:sym,
            name:item.shortName||sym,
            type,
            buyCurrency:cur,
            price,
            source:"Yahoo Finance",
          });
        }
      }
    }catch{}

    if(results.length>0){
      setSearchResults(results.slice(0,12));
      setTickerStatus("found");
    } else {
      setSearchResults([]);
      setTickerStatus("notfound");
    }
  };

  const onTickerChange=(val)=>{
    const upper=val.toUpperCase();
    set("ticker",upper);
    setSelectedResult(null);
    if(tickerTimer)clearTimeout(tickerTimer);
    if(upper.length>=2){
      setTickerStatus("checking");
      const t=setTimeout(()=>searchInstruments(upper),500);
      setTickerTimer(t);
    }else{
      setTickerStatus("idle");
      setSearchResults([]);
    }
  };

  const selectResult=(r)=>{
    setSelectedResult(r);
    setSearchResults([]);
    setTickerStatus("confirmed");
    setF(p=>({...p,ticker:r.ticker,name:r.name,type:r.type,buyCurrency:r.buyCurrency}));
  };

  const typeLabel=(t)=>ASSET_TYPES[t]?.label||t;
  const statusColor={idle:"var(--border)",checking:"var(--yellow)",found:"var(--green)",notfound:"rgba(251,191,36,0.6)",confirmed:"var(--green)"};
  const availableQty=f.operacion==="venta"?(port.find(x=>x.ticker===f.ticker)?.qty||0):Infinity;
  const overSelling=f.operacion==="venta"&&+f.qty>availableQty;
  const canSave=f.ticker&&f.qty&&f.buyPrice&&!overSelling&&(f.operacion==="venta"||tickerStatus==="confirmed"||tickerStatus==="found"||tickerStatus==="notfound");

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
      <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:28,width:520,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{fontFamily:"Georgia,serif",fontSize:16}}>{h?"Editar posición":"Nueva posición"}</h3>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:18}}>×</button>
        </div>

        <div style={{display:"grid",gap:14}}>
          {/* TOGGLE COMPRA/VENTA */}
          <div>
            <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Operación</span>
            <div style={{display:"flex",background:"var(--bg-input)",borderRadius:8,padding:3,border:"1px solid var(--border)"}}>
              {["compra","venta"].map(op=>{
                const disabled=op==="venta"&&port.length===0;
                return(
                  <button key={op} disabled={disabled}
                    onClick={()=>{
                      if(op==="venta"&&port.length>0){const first=port[0];setF(p=>({...p,operacion:"venta",ticker:first.ticker,name:first.name,type:first.type,buyCurrency:first.buyCurrency,qty:"",buyPrice:""}));setTickerStatus("confirmed");}
                      else{setF(p=>({...p,operacion:op,qty:"",buyPrice:""}));if(op==="compra"){setTickerStatus("idle");setSearchResults([]);setSelectedResult(null);}}
                    }}
                    style={{flex:1,padding:"9px 0",border:"none",borderRadius:6,fontSize:14,fontWeight:700,
                      background:f.operacion===op?(op==="compra"?"var(--green)":"var(--red)"):"transparent",
                      color:f.operacion===op?"#fff":"var(--text-muted)",opacity:disabled?0.3:1,cursor:disabled?"not-allowed":"pointer"}}>
                    {op==="compra"?"Compra":"Venta"}
                  </button>
                );
              })}
            </div>
            {f.operacion==="venta"&&<div style={{fontSize:11,color:"var(--yellow)",marginTop:5}}>⚠ FIFO — salen los lotes más antiguos primero</div>}
          </div>

          {/* ACTIVO */}
          {f.operacion==="venta"?(
            <VentaTickerSearch port={port} value={f.ticker} onSelect={pos=>{setF(p=>({...p,ticker:pos.ticker,name:pos.name,type:pos.type,buyCurrency:pos.buyCurrency,qty:"",buyPrice:""}));}}/>
          ):(
            <div>
              <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Buscar instrumento</span>
              <div style={{position:"relative",marginTop:4}}>
                <input value={f.ticker} onChange={e=>onTickerChange(e.target.value)}
                  placeholder="ej: GGAL, AAPL, GD30D, SPY..."
                  style={{...inp,border:`1px solid ${statusColor[tickerStatus]}`,paddingRight:36}}/>
                <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:14}}>
                  {tickerStatus==="checking"&&<span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>⟳</span>}
                  {tickerStatus==="confirmed"&&"✅"}
                  {tickerStatus==="notfound"&&"❓"}
                </span>

                {/* Dropdown de resultados */}
                {searchResults.length>0&&(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:8,zIndex:50,maxHeight:280,overflowY:"auto",marginTop:4,boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}}>
                    <div style={{padding:"6px 12px",fontSize:10,color:"var(--text-muted)",borderBottom:"1px solid var(--border)",textTransform:"uppercase",letterSpacing:1}}>
                      {searchResults.length} instrumento{searchResults.length!==1?"s":""} encontrado{searchResults.length!==1?"s":""} — seleccioná el que querés dar de alta
                    </div>
                    {searchResults.map((r,i)=>(
                      <div key={i} onClick={()=>selectResult(r)}
                        style={{padding:"10px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--border)"}}
                        onMouseEnter={e=>e.currentTarget.style.background="var(--bg-input)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontWeight:700,fontFamily:"monospace",color:"var(--accent)",fontSize:13}}>{r.ticker}</span>
                            <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:`${ASSET_TYPES[r.type]?.color}22`,color:ASSET_TYPES[r.type]?.color,border:`1px solid ${ASSET_TYPES[r.type]?.color}44`}}>
                              {typeLabel(r.type)}
                            </span>
                            <span style={{fontSize:10,color:"var(--text-muted)"}}>{r.buyCurrency}</span>
                          </div>
                          <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                          <div style={{fontSize:10,color:"var(--text-muted)",marginTop:1}}>📡 {r.source}</div>
                        </div>
                        <div style={{textAlign:"right",marginLeft:12,flexShrink:0}}>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--green)"}}>
                            {r.buyCurrency==="USD"?fmtU(r.price,4):fmtA(r.price)}
                          </div>
                          <div style={{fontSize:10,color:"var(--text-muted)"}}>precio actual</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Instrumento seleccionado */}
              {selectedResult&&(
                <div style={{marginTop:8,background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.3)",borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                      <span style={{fontWeight:700,fontSize:13}}>{selectedResult.ticker}</span>
                      <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:`${ASSET_TYPES[selectedResult.type]?.color}22`,color:ASSET_TYPES[selectedResult.type]?.color}}>
                        {typeLabel(selectedResult.type)}
                      </span>
                    </div>
                    <div style={{fontSize:12,color:"var(--text-secondary)"}}>{selectedResult.name}</div>
                    <div style={{fontSize:10,color:"var(--text-muted)",marginTop:2}}>📡 {selectedResult.source} · {selectedResult.buyCurrency}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:16,fontWeight:700,color:"var(--green)"}}>
                      {selectedResult.buyCurrency==="USD"?fmtU(selectedResult.price,4):fmtA(selectedResult.price)}
                    </div>
                    <button onClick={()=>{setSelectedResult(null);setTickerStatus("idle");set("ticker","");setSearchResults([]);}}
                      style={{fontSize:10,color:"var(--text-muted)",background:"transparent",border:"none",cursor:"pointer",marginTop:2}}>
                      ✕ cambiar
                    </button>
                  </div>
                </div>
              )}
              {tickerStatus==="notfound"&&<div style={{marginTop:8,background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--yellow)"}}>⚠️ Sin resultados en data912 ni Yahoo — podés guardar igual ingresando los datos manualmente.</div>}
            </div>
          )}

          {/* NOMBRE */}
          <label style={{display:"flex",flexDirection:"column",gap:4}}>
            <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Nombre del instrumento</span>
            <input value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Se completa automático al seleccionar" style={inp}/>
          </label>

          {/* TIPO */}
          <label style={{display:"flex",flexDirection:"column",gap:4}}>
            <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Tipo de activo</span>
            {f.operacion==="venta"
              ?<div style={{...inp,color:"var(--text-secondary)",background:"var(--bg-card)",cursor:"default"}}>{ASSET_TYPES[f.type]?.icon} {ASSET_TYPES[f.type]?.label||f.type}</div>
              :<select value={f.type} onChange={e=>set("type",e.target.value)} style={inp}>{Object.entries(ASSET_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select>
            }
          </label>

          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12}}>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>{f.operacion==="venta"?"Cantidad a vender":"Nominales"}</span>
              <input type="number" min="0" max={f.operacion==="venta"?availableQty:undefined} value={f.qty}
                onChange={e=>{const v=+e.target.value;set("qty",f.operacion==="venta"?Math.min(v,availableQty):v||e.target.value);}}
                style={{...inp,borderColor:overSelling?"var(--red)":undefined}}/>
              {f.operacion==="venta"&&f.ticker&&<div style={{fontSize:10,color:overSelling?"var(--red)":"var(--text-muted)",marginTop:3}}>
                {overSelling?`⚠ Solo tenés ${availableQty.toLocaleString("es-AR")} nominales`:`Disponible: ${availableQty.toLocaleString("es-AR")} nominales`}
              </div>}
            </label>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>{f.operacion==="venta"?"Precio de venta":"Precio de compra (PPC)"}</span>
              <div style={{display:"flex",gap:8}}>
                <input type="number" min="0" value={f.buyPrice} onChange={e=>set("buyPrice",e.target.value)} style={{...inp,flex:1}}/>
                <select value={f.buyCurrency} onChange={e=>set("buyCurrency",e.target.value)} style={{...inp,width:90}}>
                  <option value="ARS">🇦🇷 ARS</option>
                  <option value="USD">🇺🇸 USD</option>
                </select>
              </div>
            </div>
          </div>

          {/* TC PARA BONOS DUALES — cuando se compra en ARS un bono que tiene versión D */}
          {f.operacion==="compra" && f.buyCurrency==="ARS" && (f.type==="bono_usd"||f.type==="bono_ars") && (
            <div style={{background:"rgba(249,115,22,0.07)",border:"1px solid rgba(249,115,22,0.25)",borderRadius:8,padding:"12px 14px"}}>
              <div style={{fontSize:11,color:"#F97316",fontWeight:600,marginBottom:8}}>💱 Bono con cotización en USD — ingresá el TC para registrar el equivalente en dólares</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <label style={{display:"flex",flexDirection:"column",gap:4}}>
                  <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>TC al momento de compra</span>
                  <input type="number" min="0" value={f.tcCompra||""} onChange={e=>set("tcCompra",e.target.value)}
                    placeholder="ej: 1460" style={inp}/>
                </label>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Equivalente en USD</span>
                  <div style={{...inp,background:"var(--bg-card)",color:"var(--green)",fontWeight:700,display:"flex",alignItems:"center"}}>
                    {f.qty>0&&f.buyPrice>0&&f.tcCompra>0
                      ? fmtU((+f.qty*+f.buyPrice)/(+f.tcCompra),2)
                      : <span style={{color:"var(--text-muted)"}}>—</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {f.qty>0&&f.buyPrice>0&&(
            <div style={{background:"var(--bg-input)",borderRadius:8,padding:"10px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:11,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Monto bruto</span>
                <span style={{fontSize:15,fontWeight:700,color:"var(--text-secondary)"}}>
                  {(()=>{
                    const isBondModal=f.type==="bono_ars"||f.type==="bono_usd";
                    const monto=+f.qty*(isBondModal?+f.buyPrice/100:+f.buyPrice);
                    return f.buyCurrency==="USD"?`USD ${monto.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`:`$ ${monto.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
                  })()}
                </span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:8}}>
                <span style={{fontSize:11,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,flexShrink:0}}>Comisión</span>
                <div style={{display:"flex",gap:8,alignItems:"center",flex:1}}>
                  {/* Monto */}
                  <div style={{display:"flex",alignItems:"center",gap:4,flex:1}}>
                    <span style={{fontSize:11,color:"var(--text-muted)"}}>{f.buyCurrency}</span>
                    <input type="number" min="0" value={f.comision||""}
                      onChange={e=>{
                        const monto=+e.target.value;
                        set("comision",monto);
                        const bruto=+f.qty*+f.buyPrice;
                        if(bruto>0)set("comisionPct",+((monto/bruto)*100).toFixed(4));
                      }}
                      placeholder="0.00"
                      style={{...inp,padding:"4px 8px",fontSize:13,textAlign:"right"}}/>
                  </div>
                  <span style={{color:"var(--text-muted)",fontSize:12}}>↔</span>
                  {/* Porcentaje */}
                  <div style={{display:"flex",alignItems:"center",gap:4,flex:1}}>
                    <input type="number" min="0" step="0.01" value={f.comisionPct||""}
                      onChange={e=>{
                        const pct=+e.target.value;
                        set("comisionPct",pct);
                        const bruto=+f.qty*+f.buyPrice;
                        if(bruto>0)set("comision",+(bruto*pct/100).toFixed(2));
                      }}
                      placeholder="0.00"
                      style={{...inp,padding:"4px 8px",fontSize:13,textAlign:"right"}}/>
                    <span style={{fontSize:11,color:"var(--text-muted)"}}>%</span>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid var(--border)",paddingTop:8}}>
                <span style={{fontSize:11,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Monto neto</span>
                <span style={{fontSize:16,fontWeight:700,color:f.operacion==="venta"?"var(--red)":"var(--green)"}}>
                  {(()=>{
                    const bruto=+f.qty*+f.buyPrice;
                    const com=+f.comision||0;
                    const neto=f.operacion==="venta"?bruto-com:bruto+com;
                    return f.buyCurrency==="USD"?`USD ${neto.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`:`$ ${neto.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
                  })()}
                </span>
              </div>
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
              onClick={()=>{
                const tcC=+f.tcCompra||0;
                const priceUSD=(f.buyCurrency==="ARS"&&tcC>0&&(f.type==="bono_usd"||f.type==="bono_ars"))
                  ? parseFloat(((+f.qty*+f.buyPrice)/tcC).toFixed(4))
                  : null;
                onSave({...f,ticker:f.ticker.toUpperCase(),qty:+f.qty,buyPrice:+f.buyPrice,id:f.id||Date.now(),currentPrice:selectedResult?.price||f.buyPrice,operacion:f.operacion||"compra",tcCompra:tcC||undefined,priceUSD:priceUSD||undefined});
              }}
              disabled={!canSave}
              style={{padding:"8px 18px",background:canSave?"var(--accent)":"var(--bg-input)",border:"none",borderRadius:8,color:canSave?"#fff":"var(--text-muted)",cursor:canSave?"pointer":"not-allowed",fontWeight:600}}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvoTab({en,trades,totUSD,totPct,benchPct,alpha,liveT10Y,byType,card,fxRate,fx,historicos}){
  const PERIODS=[
    {key:"mtd", label:"MTD",  days:null,mtd:true},
    {key:"30d", label:"30d",  days:30},
    {key:"90d", label:"90d",  days:90},
    {key:"ytd", label:"YTD",  days:null},
    {key:"1y",  label:"1 año",days:365},
    {key:"3y",  label:"3 años",days:1095},
  ];
  const [period,setPeriod]=useState("90d");
  const [currency,setCurrency]=useState("USD_CCL"); // "ARS" | "USD_CCL" | "USD_MEP"
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
  const getDates = (p, n=30) => {
    const end = new Date();
    let periodStart;
    if(p.key==="ytd")   periodStart = new Date(end.getFullYear()+"-01-01");
    else if(p.key==="mtd"||p.mtd) periodStart = new Date(end.getFullYear()+"-"+(String(end.getMonth()+1).padStart(2,"0"))+"-01");
    else { periodStart = new Date(); periodStart.setDate(periodStart.getDate()-p.days); }

    // La fecha de inicio es el máximo entre el período y la primera compra
    const firstBuy = trades.filter(t=>t.tipo==="compra").sort((a,b)=>a.date.localeCompare(b.date))[0]?.date;
    const firstBuyDate = firstBuy ? new Date(firstBuy) : end;
    const start = firstBuyDate > periodStart ? firstBuyDate : periodStart;

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

  // ── Interpolador: precio más cercano a una fecha ──────────────────────────
  const findPrice = (bars, dateStr) => {
    if(!bars||!bars.length) return null;
    const t = new Date(dateStr).getTime();
    const best = bars.reduce((b,x)=>
      Math.abs(new Date(x.date)-t) < Math.abs(new Date(b.date)-t) ? x : b
    , bars[0]);
    return best?.close || best?.price || null;
  };

  const getTickerBars = (ticker) => { const bars=historicos?.[ticker]; return bars?.length?bars:null; };
  const getCCLBars    = () => historicos?.CCL   || [];
  const getSPYBars    = () => historicos?.sp500  || [];

  const load = async (p, hist) => {
    setLoading(true); setErr(""); setChartData(null);
    // Usar hist pasado explícitamente para evitar closures obsoletos
    const _hist = hist || historicos || {};
    const _getCCL  = () => _hist.CCL  || [];
    const _getMEP  = () => _hist.MEP  || [];
    const _getSPY  = () => _hist.sp500 || [];
    const _getTicker = (t) => { const b=_hist[t]; return b?.length?b:null; };
    try {
      const dates = getDates(p, 16);
      const startDate = dates[0];

      const cclBars   = _getCCL();
      const spyBarsRaw = _getSPY();

      const mepBars2 = _getMEP();

      // SPY benchmark base-100 — convertido según moneda seleccionada
      let spy100 = null, spySource = "sin datos";
      // S&P500: usar historicos.sp500 (yfinance USD) si está disponible,
      // sino usar SPY.BA de BYMA dividido por TC
      const sp500Bars = _getSPY();
      const spyByma   = _getTicker("SPY") || [];

      if(sp500Bars.length >= 2 && currency!=="ARS"){
        // Datos reales S&P500 en USD desde yfinance
        const pts = dates.map(d=>({date:d, val:findPrice(sp500Bars,d)||null})).filter(x=>x.val);
        if(pts.length>=2){
          const base = pts[0].val;
          spy100 = pts.map(x=>({date:x.date, val:base>0?100*x.val/base:100}));
          spySource = "S&P500 USD (yfinance)";
        }
      } else if(spyByma.length >= 2){
        // SPY.BA en ARS desde BYMA, convertido según moneda
        const tcBars = currency==="USD_MEP" ? mepBars2 : cclBars;
        const pts = dates.map(d=>{
          const pARS = findPrice(spyByma,d);
          if(!pARS) return {date:d, val:null};
          if(currency==="ARS") return {date:d, val:pARS};
          const tc = tcBars.length ? (findPrice(tcBars,d)||fxRate) : fxRate;
          return {date:d, val:pARS/tc};
        }).filter(x=>x.val!=null);
        if(pts.length>=2){
          const base = pts[0].val;
          spy100 = pts.map(x=>({date:x.date, val:base>0?100*x.val/base:100}));
          spySource = "SPY.BA BYMA"+(currency!=="ARS"?" ÷ "+currency.replace("USD_",""):"");
        }
      }

      // CCL base-100 — solo en modo ARS
      let ccl100 = null, cclSource = "sin datos";
      if(currency==="ARS" && cclBars.length >= 2){
        const pts = dates.map(d=>({date:d, val:findPrice(cclBars,d)||cclBars[0].close}));
        const base = pts[0].val;
        ccl100 = pts.map(x=>({date:x.date, val:base>0?100*x.val/base:100}));
        cclSource = "ArgentinaDatos ("+cclBars.length+" pts)";
      }

      // MEP base-100 — solo en modo ARS
      let mep100 = null;
      if(currency==="ARS" && mepBars2.length >= 2){
        const pts = dates.map(d=>({date:d, val:findPrice(mepBars2,d)||mepBars2[0].close}));
        const base = pts[0].val;
        mep100 = pts.map(x=>({date:x.date, val:base>0?100*x.val/base:100}));
      }

      // T10Y base-100 — usar datos reales del histórico si existen
      const t10yBarsEvo=_getTicker("t10y")||[];
      let t10y100;
      if(currency==="ARS"&&t10yBarsEvo.length>=2){
        const startDate=dates[0];
        t10y100=dates.map(d=>{
          const rate=findPrice(t10yBarsEvo,d)||liveT10Y;
          const days=Math.max(0,(new Date(d)-new Date(startDate))/(1000*60*60*24));
          return{date:d,val:parseFloat((100*Math.pow(1+rate/100,days/365)).toFixed(4))};
        });
      } else {
        t10y100=dates.map(d=>{
          const days=Math.max(0,(new Date(d)-new Date(dates[0]))/(1000*60*60*24));
          return{date:d,val:100*Math.pow(1+liveT10Y/100,days/365)};
        });
      }

      // Histórico por ticker desde JSON pre-generado
      const allTickers = [...new Set(en.map(h=>h.ticker))];
      const tickerBars = {};
      for(const ticker of allTickers){
        const bars = _getTicker(ticker);
        if(bars) tickerBars[ticker] = bars;
      }


      // MEP bars para conversión
      const mepBars = _getMEP();

      // TWR — Time Weighted Return
      const today = todayAR();
      const datesWithToday=[...dates];
      if(datesWithToday[datesWithToday.length-1]!==today)datesWithToday.push(today);

      const port100 = calcTWR(datesWithToday,trades,en,tickerBars,cclBars,mepBars,currency,fxRate);
      const spyRet  = spy100 ? (spy100[spy100.length-1].val-100).toFixed(2) : null;
      const cclRet  = ccl100 ? (ccl100[ccl100.length-1].val-100).toFixed(2) : null;
      const t10yRet = (t10y100[t10y100.length-1].val-100).toFixed(2);
      const portRet = (port100[port100.length-1].val-100).toFixed(2);

      const mepRet = mep100 ? (mep100[mep100.length-1].val-100).toFixed(2) : null;
      setChartData({port100, t10y100, spy100, ccl100, mep100, spySource, cclSource,
        startDate:dates[0], endDate:dates[dates.length-1],
        portRet, t10yRet, spyRet, cclRet, mepRet,
        cclPoints: ccl100 ? ccl100.length : 0,
        currency,
      });
    } catch(e){
      setErr("Error: "+e.message);
    }
    setLoading(false);
  };

  useEffect(()=>{
    // Solo cargar cuando historicos está disponible (no null ni vacío)
    if(!historicos || Object.keys(historicos).length === 0) return;
    const p=PERIODS.find(x=>x.key===period);
    if(p) load(p, historicos);
  },[period, currency, historicos, trades]);

  // ── SVG line chart ─────────────────────────────────────────────────────────

  const cd = chartData;
  const series = cd ? [
    {key:"port", data:cd.port100, color:"var(--green)",  bold:true},
    ...(cd.spy100  ? [{key:"spy",  data:cd.spy100,  color:"#60A5FA", bold:false}] : []),
    ...(cd.currency==="ARS" ? [{key:"t10y", data:cd.t10y100, color:"var(--yellow)", bold:false}] : []),
    ...(cd.ccl100  ? [{key:"ccl",  data:cd.ccl100,  color:"#A78BFA", bold:false}] : []),
    ...(cd.mep100  ? [{key:"mep",  data:cd.mep100,  color:"#F472B6", bold:false}] : []),
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
            <div style={{fontWeight:600,fontSize:14,marginBottom:6}}>
              Rendimiento base 100 · {currency==="ARS"?"en ARS":currency==="USD_CCL"?"en USD (CCL)":"en USD (MEP)"}
            </div>
            <div style={{display:"flex",gap:12,fontSize:11,flexWrap:"wrap",alignItems:"center"}}>
              {/* Currency toggle */}
              {["ARS","USD_CCL","USD_MEP"].map(c=>(
                <button key={c} onClick={()=>setCurrency(c)}
                  style={{padding:"2px 8px",borderRadius:5,border:"1px solid var(--border)",cursor:"pointer",fontSize:10,
                    background:currency===c?"var(--accent)":"transparent",
                    color:currency===c?"#fff":"var(--text-muted)"}}>
                  {c==="ARS"?"ARS":c==="USD_CCL"?"USD CCL":"USD MEP"}
                </button>
              ))}
              <span style={{color:"var(--text-muted)",fontSize:10}}>|</span>
              <span style={{color:"var(--green)"}}>— Portfolio</span>
              {cd?.spy100&&<span style={{color:"#60A5FA"}}>— S&amp;P 500</span>}
              {cd?.currency==="ARS"&&<span style={{color:"var(--yellow)"}}>— T10Y</span>}
              {cd?.ccl100&&<span style={{color:"#A78BFA"}}>— CCL</span>}
              {cd?.mep100&&<span style={{color:"#F472B6"}}>— MEP</span>}
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
            {cd.currency==="ARS"&&<span style={{color:"var(--text-muted)"}}>T10Y: <b style={{color:"var(--yellow)"}}>{cd.t10yRet>=0?"+":""}{cd.t10yRet}%</b></span>}
            {cd.ccl100&&<span style={{color:"var(--text-muted)"}}>CCL: <b style={{color:pc(+cd.cclRet)}}>{cd.cclRet>=0?"+":""}{cd.cclRet}%</b></span>}
            {cd.mep100&&<span style={{color:"var(--text-muted)"}}>MEP: <b style={{color:"#F472B6"}}>{cd.mepRet>=0?"+":""}{cd.mepRet}%</b></span>}
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

function PortfolioTab({byType,en,totUSD,totCost,totPnl,totPct,fxRate,fxMode,setModal,del,card,hideAmounts=false,trades=[],historicos={}}){
  const [view,setView]=useState("dual");
  const fmtU=(n,d=0)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:d}).format(n);
  const fmtA=(n)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
  const fmtP=(n)=>`${n>=0?"+":""}${n.toFixed(2)}%`;
  const pc=(n)=>n>=0?"var(--green)":"var(--red)";

  const thS={padding:"8px 12px",textAlign:"left",fontSize:10,color:"var(--text-muted)",fontWeight:500,textTransform:"uppercase",letterSpacing:0.8,borderBottom:"1px solid var(--border)",whiteSpace:"nowrap"};
  const thR={...thS,textAlign:"center"};
  const tdL={padding:"10px 12px",color:"var(--text-secondary)",fontSize:13};
  const tdR={...tdL,textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:12};

  // Helper: encontrar TC histórico más cercano a una fecha
  const findHistCCL=(dateStr)=>{
    const bars=historicos?.CCL||[];
    if(!bars.length)return fxRate;
    const t=new Date(dateStr).getTime();
    return bars.reduce((b,x)=>Math.abs(new Date(x.date)-t)<Math.abs(new Date(b.date)-t)?x:b,bars[0])?.close||fxRate;
  };

  const renderRow=(h)=>{
    const isBond=h.type==="bono_usd"||h.type==="bono_ars";
    const qtyFactor=isBond?h.qty/100:h.qty;
    const isUSD=h.buyCurrency==="USD";

    // Valor actual en moneda propia
    const origVal=h.currentPrice*qtyFactor;

    // Costo en moneda propia (PPC × qty)
    const origCost=(h.ppc||h.buyPrice)*qtyFactor;
    const origPnl=origVal-origCost;
    const origPct=origCost>0?(origPnl/origCost)*100:0;

    // Costo en ARS usando TC histórico de cada lote de compra
    // Para activos USD: suma cada lote × precio_compra × TC_del_dia_de_compra
    // Para activos ARS: el costo ya está en ARS
    const buyLots=trades.filter(t=>t.ticker===h.ticker&&t.tipo==="compra");
    let costARSHist=0;
    if(isUSD){
      for(const lot of buyLots){
        const lotFactor=isBond?lot.qty/100:lot.qty;
        const tcLot=lot.tcCompra||findHistCCL(lot.date);
        costARSHist+=lot.price*lotFactor*tcLot;
      }
    } else {
      costARSHist=origCost; // ya está en ARS
    }

    // Valor actual en ARS (precio actual × qty × TC actual)
    const valARS=isUSD?origVal*fxRate:origVal;
    const pnlARS=valARS-costARSHist;
    const pctARS=costARSHist>0?(pnlARS/costARSHist)*100:0;

    // Costo en USD usando TC histórico de cada lote
    // Para activos ARS: suma cada lote ÷ TC_del_dia_de_compra
    // Para activos USD: el costo ya está en USD
    let costUSDHist=0;
    if(!isUSD){
      for(const lot of buyLots){
        const lotFactor=isBond?lot.qty/100:lot.qty;
        const tcLot=findHistCCL(lot.date);
        costUSDHist+=lot.price*lotFactor/tcLot;
      }
    } else {
      costUSDHist=origCost; // ya está en USD
    }

    // Valor actual en USD (precio actual × qty ÷ TC actual)
    const valUSD=isUSD?origVal:origVal/fxRate;
    const pnlUSD=valUSD-costUSDHist;
    const pctUSD=costUSDHist>0?(pnlUSD/costUSDHist)*100:0;

    // Qué % mostrar según vista
    const dispPct=view==="native"?origPct:view==="usd"?pctUSD:pctARS;
    return(
      <tr key={`${h.ticker}-${h.type}-${h.id||""}`} style={{borderTop:"1px solid var(--border)"}}>
        <td style={{...tdL,fontWeight:700,fontFamily:"monospace",color:"var(--accent)"}}>
          {h.ticker}
          {h.isLive&&<span style={{display:"block",fontSize:9,color:"var(--green)",fontFamily:"sans-serif",fontWeight:400}}>● live</span>}
        </td>
        <td style={{...tdL,color:"var(--text-secondary)",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</td>
        <td style={tdR}>{Number(h.qty).toLocaleString("es-AR",{maximumFractionDigits:4})}</td>
        <td style={{...tdR,color:"var(--text-muted)",fontSize:11}}>
          {(()=>{
            const ppcVal=h.ppc||h.buyPrice;
            return isUSD?fmtU(ppcVal,2):fmtA(ppcVal);
          })()}
          <span style={{display:"block",fontSize:9,color:"var(--text-muted)"}}>{h.buyCurrency} · PPC</span>
        </td>
        <td style={{...tdR,fontSize:11}}>
          {(()=>{
            const cp=h.currentPrice;
            return isUSD?fmtU(cp,2):fmtA(cp);
          })()}
          {h.liveChangePct!=null&&h.isLive&&<span style={{display:"block",fontSize:9,color:pc(h.liveChangePct)}}>{fmtP(h.liveChangePct)} hoy</span>}
          {!h.isLive&&<span style={{display:"block",fontSize:8,color:"var(--text-muted)"}}>guardado</span>}
        </td>
        {/* Columna ARS */}
        {(view==="dual"||view==="ars")&&(
          <td style={{...tdR,fontWeight:600,background:"rgba(96,165,250,0.08)"}}>
            {hideAmounts?"••••":fmtA(valARS)}
            {isUSD&&<span style={{display:"block",fontSize:9,color:"var(--text-muted)"}}>pesif. × {Math.round(fxRate).toLocaleString("es-AR")}</span>}
          </td>
        )}
        {(view==="dual"||view==="ars")&&(
          <td style={{...tdR,fontSize:11,background:"rgba(96,165,250,0.08)"}}>
            <span style={{color:pc(pnlARS),fontWeight:600}}>{hideAmounts?"••••":fmtA(pnlARS)}</span>
            <span style={{display:"block",fontSize:10,color:pc(pctARS),fontWeight:700}}>{fmtP(pctARS)}</span>
          </td>
        )}
        {/* Columna USD */}
        {(view==="dual"||view==="usd")&&(
          <td style={{...tdR,fontWeight:700,background:"rgba(52,211,153,0.08)"}}>
            {hideAmounts?"••••":fmtU(valUSD)}
            {!isUSD&&<span style={{display:"block",fontSize:9,color:"var(--text-muted)"}}>dolar. ÷ {Math.round(fxRate).toLocaleString("es-AR")}</span>}
          </td>
        )}
        {(view==="dual"||view==="usd")&&(
          <td style={{...tdR,fontSize:11,background:"rgba(52,211,153,0.08)"}}>
            <span style={{color:pc(pnlUSD),fontWeight:600}}>{hideAmounts?"••••":fmtU(pnlUSD)}</span>
            <span style={{display:"block",fontSize:10,color:pc(pctUSD),fontWeight:700}}>{fmtP(pctUSD)}</span>
          </td>
        )}
        {/* Columna moneda propia */}
        {view==="native"&&(
          <td style={{...tdR,fontWeight:600,background:"rgba(139,92,246,0.05)"}}>
            {hideAmounts?"••••":(isUSD?fmtU(origVal):fmtA(origVal))}
          </td>
        )}
        {view==="native"&&(
          <td style={{...tdR,fontSize:11,background:"rgba(139,92,246,0.05)"}}>
            <span style={{color:pc(origPnl),fontWeight:600}}>{hideAmounts?"••••":(isUSD?fmtU(origPnl):fmtA(origPnl))}</span>
            <span style={{display:"block",fontSize:10,color:pc(origPct),fontWeight:700}}>{fmtP(origPct)}</span>
          </td>
        )}
        {/* % resumen al final según vista */}
        {view==="dual"&&(
          <td style={{...tdR,fontSize:11}}>
            <span style={{display:"block",color:pc(pctARS),fontWeight:700}}>{fmtP(pctARS)} <span style={{fontSize:9,fontWeight:400}}>ARS</span></span>
            <span style={{display:"block",color:pc(pctUSD),fontWeight:700}}>{fmtP(pctUSD)} <span style={{fontSize:9,fontWeight:400}}>USD</span></span>
          </td>
        )}
        {view!=="dual"&&<td style={{...tdR,fontWeight:700,color:pc(dispPct)}}>{fmtP(dispPct)}</td>}
      </tr>
    );
  };

  const colSpan=(view==="dual"?9:view==="native"?7:7);

  return(
    <div className="fi" style={{display:"grid",gap:14}}>
      {/* Header view toggle */}
      <div style={{display:"flex",justifyContent:"flex-end",gap:4}}>
        {[["dual","⇄ ARS + USD"],["ars","Solo ARS"],["usd","Solo USD"],["native","Moneda propia"]].map(([k,l])=>(
          <button key={k} onClick={()=>setView(k)}
            style={{padding:"4px 12px",borderRadius:6,border:"1px solid var(--border)",cursor:"pointer",fontSize:11,
              background:view===k?"var(--accent)":"var(--bg-input)",color:view===k?"#fff":"var(--text-secondary)"}}>
            {l}
          </button>
        ))}
      </div>

      {/* Sección por tipo de activo */}
      {byType.map(t=>{
        const items=[...t.items].sort((a,b)=>b.valUSD-a.valUSD);
        const secVal=items.reduce((a,h)=>a+h.valUSD,0);
        const secCost=items.reduce((a,h)=>a+h.costUSD,0);
        const secPnl=secVal-secCost;
        const secPct=secCost>0?(secPnl/secCost)*100:0;
        return(
          <div key={`section-${t.key}`} style={{...card,overflow:"hidden"}}>
            {/* Encabezado de sección */}
            <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",background:'transparent'}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontWeight:700,fontSize:13,color:"var(--text-primary)"}}>{t.icon} {t.label}</span>
                <span style={{fontSize:11,color:"var(--text-muted)"}}>· {items.length} posición{items.length!==1?"es":""}</span>
              </div>
              <div style={{display:"flex",gap:20,alignItems:"center",fontSize:12}}>
                <span style={{color:"var(--text-muted)"}}>Saldo: <b style={{color:"var(--text-primary)"}}>{hideAmounts?"••••••":fmtU(secVal)}</b></span>
                <span style={{color:"var(--text-muted)"}}>PnL: <b style={{color:pc(secPnl)}}>{hideAmounts?"••••••":fmtU(secPnl,0)}</b></span>
                <span style={{fontWeight:700,color:pc(secPct),fontSize:13}}>{fmtP(secPct)}</span>
              </div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600,tableLayout:"fixed"}}>
                <thead>
                  <tr>
                    <th style={{...thS,width:70}}>Ticker</th>
                    <th style={{...thS}}>Nombre</th>
                    <th style={{...thR,width:100}}>Nominales</th>
                    <th style={{...thR,width:130}}>PPC</th>
                    <th style={{...thR,width:150}}>Precio actual</th>
                    {(view==="dual"||view==="ars")&&<><th style={{...thR,width:140,background:"rgba(96,165,250,0.08)"}}>Val. ARS</th><th style={{...thR,width:130,background:"rgba(96,165,250,0.08)"}}>PnL · % ARS</th></>}
                    {(view==="dual"||view==="usd")&&<><th style={{...thR,width:120,background:"rgba(52,211,153,0.1)"}}>Val. USD</th><th style={{...thR,width:130,background:"rgba(52,211,153,0.1)"}}>PnL · % USD</th></>}
                    {view==="native"&&<><th style={{...thR,width:140,background:"rgba(139,92,246,0.08)"}}>Val. moneda</th><th style={{...thR,width:130,background:"rgba(139,92,246,0.08)"}}>PnL · % moneda</th></>}
                    <th style={{...thR,width:110}}>Rend %</th>
                  </tr>
                </thead>
                <tbody>{items.map(renderRow)}</tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Totales globales */}
      <div style={{...card,padding:"12px 16px",display:"flex",gap:24,flexWrap:"wrap",fontSize:12}}>
        <span style={{color:"var(--text-muted)"}}>Total: <b style={{color:"var(--text-primary)"}}>{hideAmounts?"••••••":fmtU(totUSD)}</b></span>
        <span style={{color:"var(--text-muted)"}}>Costo: <b>{hideAmounts?"••••••":fmtU(totCost)}</b></span>
        <span style={{color:"var(--text-muted)"}}>PnL: <b style={{color:pc(totPnl)}}>{hideAmounts?"••••••":fmtU(totPnl)}</b></span>
        <span style={{color:"var(--text-muted)"}}>Rend: <b style={{color:pc(totPct)}}>{fmtP(totPct)}</b></span>
        <span style={{color:"var(--text-muted)",fontSize:10,marginLeft:"auto"}}>TC {fxMode}: {new Intl.NumberFormat("es-AR").format(Math.round(fxRate))}</span>
      </div>
    </div>
  );
}

function OperacionesTab({trades,port,setTrades,setPort,card,livePrices}){
  const [editId,setEditId]=useState(null);
  const [editData,setEditData]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [filterTicker,setFilterTicker]=useState("");
  const [filterDesde,setFilterDesde]=useState("");
  const [filterHasta,setFilterHasta]=useState("");
  const fmtA=(n)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:2}).format(n);
  const fmtU=(n,d=2)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:d}).format(n);
  const inp={background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:6,padding:"6px 10px",color:"var(--text-primary)",fontSize:13,width:"100%"};

  const allTickers=[...new Set(trades.map(t=>t.ticker))].sort();

  const sorted=[...trades]
    .filter(t=>{
      if(filterTicker&&t.ticker!==filterTicker)return false;
      if(filterDesde&&t.date<filterDesde)return false;
      if(filterHasta&&t.date>filterHasta)return false;
      return true;
    })
    .sort((a,b)=>b.date.localeCompare(a.date)||b.ts-a.ts);

  const startEdit=(t)=>{
    setEditId(t.id);
    setEditData({...t});
  };

  const saveEdit=()=>{
    if(!editData)return;
    setTrades(prev=>prev.map(t=>t.id===editId?{...editData,qty:+editData.qty,price:+editData.price,tcCompra:editData.tcCompra?+editData.tcCompra:undefined}:t));
    // Recalcular buyPrice del port si cambió
    setPort(prev=>prev.map(p=>{
      if(p.ticker!==editData.ticker)return p;
      return{...p,buyPrice:+editData.price};
    }));
    setEditId(null);setEditData(null);
  };

  const deleteTrade=(trade)=>{
    const newTrades=trades.filter(t=>t.id!==trade.id);
    setTrades(newTrades);
    // Si no quedan trades de ese ticker, eliminar del portfolio
    const remaining=newTrades.filter(t=>t.ticker===trade.ticker&&t.tipo==="compra");
    const sold=newTrades.filter(t=>t.ticker===trade.ticker&&t.tipo==="venta");
    const netQty=remaining.reduce((a,t)=>a+t.qty,0)-sold.reduce((a,t)=>a+t.qty,0);
    if(netQty<=0){
      setPort(prev=>prev.filter(p=>p.ticker!==trade.ticker));
    } else {
      // Actualizar qty y buyPrice del portfolio
      const totalCost=remaining.reduce((a,t)=>a+t.qty*t.price,0);
      const totalQty=remaining.reduce((a,t)=>a+t.qty,0);
      const newPpc=totalQty>0?totalCost/totalQty:0;
      setPort(prev=>prev.map(p=>p.ticker===trade.ticker?{...p,qty:netQty,buyPrice:newPpc}:p));
    }
    setConfirmDelete(null);
  };

  const thS={padding:"8px 12px",textAlign:"left",fontSize:10,color:"var(--text-muted)",fontWeight:500,textTransform:"uppercase",letterSpacing:0.8,borderBottom:"1px solid var(--border)",whiteSpace:"nowrap"};
  const thR={...thS,textAlign:"center"};
  const tdL={padding:"10px 12px",fontSize:13,color:"var(--text-secondary)"};
  const tdR={...tdL,textAlign:"center"};

  return(
    <div className="fi" style={{display:"grid",gap:14}}>
      {/* Filtros */}
      <div style={{...card,padding:"14px 16px",display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:160}}>
          <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Ticker</span>
          <select value={filterTicker} onChange={e=>setFilterTicker(e.target.value)} style={{...inp,width:"auto"}}>
            <option value="">Todos</option>
            {allTickers.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Desde</span>
          <input type="date" value={filterDesde} onChange={e=>setFilterDesde(e.target.value)} style={inp}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Hasta</span>
          <input type="date" value={filterHasta} onChange={e=>setFilterHasta(e.target.value)} style={inp}/>
        </div>
        {(filterTicker||filterDesde||filterHasta)&&(
          <button onClick={()=>{setFilterTicker("");setFilterDesde("");setFilterHasta("");}}
            style={{padding:"6px 14px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text-muted)",cursor:"pointer",fontSize:12,alignSelf:"flex-end"}}>
            ✕ Limpiar
          </button>
        )}
        <span style={{fontSize:11,color:"var(--text-muted)",marginLeft:"auto",alignSelf:"flex-end"}}>
          {sorted.length} de {trades.length} operación{trades.length!==1?"es":""}
        </span>
      </div>

      <div style={{...card,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:13,fontWeight:600}}>Historial de operaciones</div>
          <div style={{fontSize:11,color:"var(--text-muted)"}}>{sorted.length} resultado{sorted.length!==1?"s":""}</div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
            <thead>
              <tr>
                <th style={thS}>Fecha</th>
                <th style={thS}>Ticker</th>
                <th style={thS}>Nombre</th>
                <th style={thS}>Tipo</th>
                <th style={thR}>Cantidad</th>
                <th style={thR}>Precio</th>
                <th style={thR}>TC</th>
                <th style={thR}>Bruto</th>
                <th style={thR}>Comisión</th>
                <th style={thR}>Neto</th>
                <th style={{...thS,width:80}}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(t=>{
                const isEditing=editId===t.id;
                const bruto=+t.qty*+t.price;
                const com=t.comision?+t.comision:0;
                const neto=t.tipo==="compra"?bruto+com:bruto-com;
                return(
                  <tr key={t.id} style={{borderTop:"1px solid var(--border)",background:isEditing?"rgba(37,99,235,0.06)":undefined}}>
                    <td style={tdL}>
                      {isEditing
                        ?<input type="date" value={editData.date} onChange={e=>setEditData(p=>({...p,date:e.target.value}))} style={{...inp,width:130}}/>
                        :<span>{t.date}</span>}
                    </td>
                    <td style={{...tdL,fontWeight:700,fontFamily:"monospace",color:"var(--accent)"}}>{t.ticker}</td>
                    <td style={{...tdL,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--text-secondary)"}}>{t.name}</td>
                    <td style={tdL}>
                      <span style={{padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600,
                        background:t.tipo==="compra"?"rgba(52,211,153,0.1)":"rgba(248,113,113,0.1)",
                        color:t.tipo==="compra"?"var(--green)":"var(--red)"}}>
                        {t.tipo==="compra"?"Compra":"Venta"}
                      </span>
                    </td>
                    <td style={tdR}>
                      {isEditing
                        ?<input type="number" value={editData.qty} onChange={e=>setEditData(p=>({...p,qty:e.target.value}))} style={{...inp,width:90,textAlign:"right"}}/>
                        :Number(t.qty).toLocaleString("es-AR",{maximumFractionDigits:4})}
                    </td>
                    <td style={tdR}>
                      {isEditing
                        ?<input type="number" value={editData.price} onChange={e=>setEditData(p=>({...p,price:e.target.value}))} style={{...inp,width:110,textAlign:"right"}}/>
                        :<span>{(()=>{
                          const dp=t.price;
                          return t.currency==="USD"?fmtU(dp,2):fmtA(dp);
                        })()}<span style={{display:"block",fontSize:9,color:"var(--text-muted)"}}>{t.currency||"ARS"}</span></span>}
                    </td>
                    <td style={tdR}>
                      {isEditing&&(t.currency==="ARS")
                        ?<input type="number" value={editData.tcCompra||""} onChange={e=>setEditData(p=>({...p,tcCompra:e.target.value}))} placeholder="TC" style={{...inp,width:90,textAlign:"right"}}/>
                        :<span style={{color:"var(--text-muted)",fontSize:11}}>{t.tcCompra?fmtA(t.tcCompra):"—"}</span>}
                    </td>
                    <td style={tdR}>{t.currency==="USD"?fmtU(bruto,2):fmtA(bruto)}</td>
                    <td style={tdR}>
                      {isEditing
                        ?<input type="number" value={editData.comision||""} onChange={e=>setEditData(p=>({...p,comision:e.target.value}))} placeholder="0" style={{...inp,width:90,textAlign:"right"}}/>
                        :<span style={{color:com>0?"var(--yellow)":"var(--text-muted)",fontSize:11}}>{com>0?(t.currency==="USD"?fmtU(com,2):fmtA(com)):"—"}</span>}
                    </td>
                    <td style={{...tdR,fontWeight:600}}>
                      {t.currency==="USD"?fmtU(neto,2):fmtA(neto)}
                    </td>
                    <td style={{padding:"8px",textAlign:"right"}}>
                      {isEditing?(
                        <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                          <button onClick={saveEdit} style={{padding:"4px 10px",background:"var(--green)",border:"none",borderRadius:5,color:"#fff",cursor:"pointer",fontSize:11,fontWeight:600}}>✓</button>
                          <button onClick={()=>{setEditId(null);setEditData(null);}} style={{padding:"4px 8px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:5,color:"var(--text-muted)",cursor:"pointer",fontSize:11}}>✕</button>
                        </div>
                      ):(
                        <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                          <button onClick={()=>startEdit(t)} style={{padding:"4px 8px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:5,color:"var(--text-muted)",cursor:"pointer",fontSize:11}}>✏️</button>
                          <button onClick={()=>setConfirmDelete(t)} style={{padding:"4px 8px",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:5,color:"var(--red)",cursor:"pointer",fontSize:11}}>🗑</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal confirmación eliminar */}
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
          <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:28,width:420,maxWidth:"95vw"}}>
            <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:700,marginBottom:12}}>¿Eliminar operación?</div>
            <div style={{background:"var(--bg-input)",borderRadius:8,padding:"12px 14px",marginBottom:16,fontSize:13}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontWeight:700,fontFamily:"monospace",color:"var(--accent)"}}>{confirmDelete.ticker}</span>
                <span style={{padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600,
                  background:confirmDelete.tipo==="compra"?"rgba(52,211,153,0.1)":"rgba(248,113,113,0.1)",
                  color:confirmDelete.tipo==="compra"?"var(--green)":"var(--red)"}}>
                  {confirmDelete.tipo==="compra"?"Compra":"Venta"}
                </span>
              </div>
              <div style={{fontSize:12,color:"var(--text-muted)"}}>{confirmDelete.date} · {Number(confirmDelete.qty).toLocaleString("es-AR")} nominales · {confirmDelete.currency==="USD"?fmtU(confirmDelete.price,4):fmtA(confirmDelete.price)}</div>
            </div>
            <div style={{fontSize:12,color:"var(--yellow)",marginBottom:20}}>⚠ Esta acción elimina la operación del historial. Si era la única compra del activo, se elimina del portfolio.</div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setConfirmDelete(null)} style={{padding:"8px 18px",background:"transparent",border:"1px solid var(--border)",borderRadius:8,color:"var(--text-muted)",cursor:"pointer"}}>Cancelar</button>
              <button onClick={()=>deleteTrade(confirmDelete)} style={{padding:"8px 18px",background:"var(--red)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontWeight:600}}>Eliminar definitivo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RankingWidget({en, historicos, fxRate, currency}){
  const PERIODS=[
    {key:"30d", label:"30d"},
    {key:"90d", label:"90d"},
    {key:"ytd", label:"YTD"},
    {key:"1y",  label:"1 año"},
  ];
  const [period, setPeriod] = useState("30d");

  const fmtP=n=>`${n>=0?"+":""}${n.toFixed(2)}%`;
  const fmtU=(n)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
  const pc=n=>n>=0?"var(--green)":"var(--red)";
  const dolarLabel=currency==="MEP"?"MEP":currency==="oficial"?"Oficial":"CCL";

  const findPrice=(bars,dateStr)=>{
    if(!bars?.length)return null;
    const t=new Date(dateStr).getTime();
    return bars.reduce((b,x)=>Math.abs(new Date(x.date)-t)<Math.abs(new Date(b.date)-t)?x:b,bars[0])?.close||null;
  };

  const ranked=useMemo(()=>{
    const d=new Date();
    if(period==="ytd") d.setMonth(0,1);
    else if(period==="30d") d.setDate(d.getDate()-30);
    else if(period==="90d") d.setDate(d.getDate()-90);
    else if(period==="1y") d.setFullYear(d.getFullYear()-1);
    const startDate=d.toISOString().slice(0,10);
    const cclStart=historicos?.CCL?findPrice(historicos.CCL,startDate)||fxRate:fxRate;

    return en.map(h=>{
      const isBond=h.type==="bono_usd"||h.type==="bono_ars";
      const qtyFactor=isBond?h.qty/100:h.qty;
      const bars=historicos?.[h.ticker]||[];
      const priceNow=h.currentPrice;
      const priceThen=bars.length?findPrice(bars,startDate)||priceNow:priceNow;
      let pnlUSD,pctReturn;
      if(h.buyCurrency==="USD"){
        const vNow=priceNow*qtyFactor, vThen=priceThen*qtyFactor;
        pnlUSD=vNow-vThen; pctReturn=vThen>0?(pnlUSD/vThen)*100:0;
      } else {
        const vNow=priceNow*qtyFactor/fxRate, vThen=priceThen*qtyFactor/cclStart;
        pnlUSD=vNow-vThen; pctReturn=vThen>0?(pnlUSD/vThen)*100:0;
      }
      return{...h,periodPct:pctReturn,periodPnl:pnlUSD};
    }).sort((a,b)=>b.periodPct-a.periodPct);
  },[en,period,historicos,fxRate]);

  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? ranked : ranked.slice(0,5);
  const maxPct=Math.max(...ranked.map(x=>Math.abs(x.periodPct)),1);

  return(
    <div>
      <div style={{padding:"10px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Ranking · rendimiento del instrumento</span>
        <div style={{display:"flex",gap:3}}>
          {PERIODS.map(p=>(
            <button key={p.key} onClick={()=>setPeriod(p.key)}
              style={{padding:"3px 8px",borderRadius:5,border:"1px solid var(--border)",cursor:"pointer",fontSize:10,
                background:period===p.key?"var(--accent)":"var(--bg-input)",
                color:period===p.key?"#fff":"var(--text-secondary)"}}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cabecera columnas */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"5px 16px",borderBottom:"1px solid var(--border)"}}>
        <span style={{width:20}}/>
        <span style={{width:50,fontSize:9,color:"var(--text-muted)"}}>TICKER</span>
        <span style={{flex:1,fontSize:9,color:"var(--text-muted)"}}>INSTRUMENTO</span>
        <span style={{fontSize:9,color:"var(--text-muted)",minWidth:60,textAlign:"right"}}>REND %</span>
      </div>

      {visible.map((h,i)=>(
        <div key={h.ticker} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 16px",borderTop:"1px solid var(--border)",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${Math.min(Math.abs(h.periodPct)/maxPct*100,100)}%`,
            background:h.periodPct>=0?"rgba(52,211,153,0.07)":"rgba(248,113,113,0.07)"}}/>
          <span style={{fontSize:10,color:"var(--text-muted)",width:20,textAlign:"right",position:"relative"}}>{i+1}</span>
          <span style={{width:50,fontWeight:700,fontFamily:"monospace",fontSize:12,color:"var(--accent)",position:"relative"}}>{h.ticker}</span>
          <span style={{flex:1,fontSize:11,color:"var(--text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",position:"relative"}}>{h.name}</span>
          <span style={{fontSize:13,fontWeight:700,color:pc(h.periodPct),minWidth:60,textAlign:"right",position:"relative"}}>{fmtP(h.periodPct)}</span>
        </div>
      ))}

      {ranked.length>5&&(
        <div onClick={()=>setShowAll(x=>!x)}
          style={{padding:"8px 16px",borderTop:"1px solid var(--border)",cursor:"pointer",fontSize:11,color:"var(--text-muted)",textAlign:"center",
            background:"var(--bg-input)",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
          onMouseEnter={e=>e.currentTarget.style.color="var(--text-primary)"}
          onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}>
          {showAll?`▲ Ver menos`:`▼ Ver todos (${ranked.length})`}
        </div>
      )}

      <div style={{padding:"5px 16px",fontSize:9,color:"var(--text-muted)",borderTop:"1px solid var(--border)"}}>
        Rendimiento del instrumento en el período · dolarizado a {dolarLabel}
      </div>
    </div>
  );
}


function DayMoversWidget({en, historicos, fxRate, livePrices, card, hideAmounts=false}){
  const fmtU=(n,d=0)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:d}).format(n);
  const fmtA=(n)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
  const fmtP=(n)=>`${n>=0?"+":""}${n.toFixed(2)}%`;
  const pc=(n)=>n>=0?"var(--green)":"var(--red)";

  const ranked=useMemo(()=>{
    return en.map(h=>{
      const bars=historicos?.[h.ticker]||[];
      const prevBar=bars.length?bars[bars.length-1]:null;
      const prevPrice=prevBar?.close||null;
      const currPrice=h.currentPrice;
      if(!prevPrice||!currPrice)return null;
      const dayPct=((currPrice-prevPrice)/prevPrice)*100;
      const isBond=h.type==="bono_usd"||h.type==="bono_ars";
      const qtyFactor=isBond?h.qty/100:h.qty;
      const valNow=h.buyCurrency==="USD"?currPrice*qtyFactor:currPrice*qtyFactor/fxRate;
      const valPrev=h.buyCurrency==="USD"?prevPrice*qtyFactor:prevPrice*qtyFactor/fxRate;
      const dayPnl=valNow-valPrev;
      const hasLive=!!(livePrices&&livePrices[h.ticker]);
      return{...h,dayPct,dayPnl,hasLive,prevPrice};
    }).filter(Boolean).sort((a,b)=>b.dayPct-a.dayPct);
  },[en,historicos,fxRate,livePrices]);

  if(!ranked.length)return null;
  const top5=ranked.slice(0,5);
  const bot5=[...ranked].reverse().slice(0,5);

  const row=(h,isTop)=>(
    <div key={h.ticker} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderTop:"1px solid var(--border)"}}>
      <div style={{width:36,flexShrink:0}}>
        <div style={{fontWeight:700,fontFamily:"monospace",fontSize:12,color:"var(--accent)"}}>{h.ticker}</div>
        {h.hasLive
          ?<div style={{fontSize:9,color:"var(--green)"}}>● live</div>
          :<div style={{fontSize:9,color:"var(--text-muted)"}}>hist.</div>}
      </div>
      <div style={{flex:1,fontSize:11,color:"var(--text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontWeight:700,fontSize:13,color:pc(h.dayPct)}}>{fmtP(h.dayPct)}</div>
        <div style={{fontSize:10,color:pc(h.dayPnl)}}>{hideAmounts?"••••":(h.dayPnl>=0?"+":"")+fmtU(h.dayPnl,0)}</div>
      </div>
    </div>
  );

  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div style={{...card,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8,background:"rgba(52,211,153,0.08)"}}>
          <span>🚀</span>
          <span style={{fontWeight:700,fontSize:12,color:"var(--green)"}}>Top 5 · Mejores del día</span>
        </div>
        {top5.map(h=>row(h,true))}
      </div>
      <div style={{...card,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8,background:"rgba(248,113,113,0.05)"}}>
          <span>📉</span>
          <span style={{fontWeight:700,fontSize:12,color:"var(--red)"}}>Bottom 5 · Peores del día</span>
        </div>
        {bot5.map(h=>row(h,false))}
      </div>
    </div>
  );
}


function AnalisisTab({en, historicos, fxRate, currency, card, livePrices, hideAmounts=false}){
  const fmtU=(n,d=0)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:d}).format(n);
  const fmtA=(n)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
  const fmtP=(n)=>`${n>=0?"+":""}${n.toFixed(2)}%`;
  const pc=(n)=>n>=0?"var(--green)":"var(--red)";

  const withDayReturn=useMemo(()=>{
    return en.map(h=>{
      const hasLive=!!(livePrices&&livePrices[h.ticker]);
      const bars=historicos?.[h.ticker]||[];
      const prevBar=bars.length?bars[bars.length-1]:null;
      const prevPrice=prevBar?.close||null;
      const currPrice=h.currentPrice;
      let dayPct=null,dayPnlUSD=null;
      if(prevPrice&&prevPrice>0&&currPrice){
        dayPct=((currPrice-prevPrice)/prevPrice)*100;
        const isBond=h.type==="bono_usd"||h.type==="bono_ars";
        const qtyFactor=isBond?h.qty/100:h.qty;
        const valNow=h.buyCurrency==="USD"?currPrice*qtyFactor:currPrice*qtyFactor/fxRate;
        const valPrev=h.buyCurrency==="USD"?prevPrice*qtyFactor:prevPrice*qtyFactor/fxRate;
        dayPnlUSD=valNow-valPrev;
      }
      return{...h,dayPct,dayPnlUSD,hasLive,prevPrice};
    }).filter(h=>h.dayPct!=null);
  },[en,historicos,fxRate,livePrices]);

  const sorted=[...withDayReturn].sort((a,b)=>b.dayPct-a.dayPct);

  return(
    <div className="fi" style={{display:"grid",gap:16}}>

      {/* Ranking completo */}
      <div style={{...card,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,fontSize:13}}>Todos los activos · rendimiento del día</span>
          <span style={{fontSize:11,color:"var(--text-muted)"}}>{sorted.length} instrumentos</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:"1px solid var(--border)"}}>
                {["#","Ticker","Nombre","Tipo","Prev. cierre","Precio actual","Rend. día","P&L día (USD)","P&L total (USD)"].map((h,i)=>(
                  <th key={i} style={{padding:"8px 12px",textAlign:i>=6?"right":"left",fontSize:10,color:"var(--text-muted)",fontWeight:500,textTransform:"uppercase",letterSpacing:0.8,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((h,i)=>(
                <tr key={h.ticker} style={{borderTop:"1px solid var(--border)"}}>
                  <td style={{padding:"10px 12px",color:"var(--text-muted)",fontSize:11}}>{i+1}</td>
                  <td style={{padding:"10px 12px",fontWeight:700,fontFamily:"monospace",color:"var(--accent)"}}>{h.ticker}</td>
                  <td style={{padding:"10px 12px",color:"var(--text-secondary)",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</td>
                  <td style={{padding:"10px 12px",color:"var(--text-muted)",fontSize:11}}>{ASSET_TYPES[h.type]?.icon} {ASSET_TYPES[h.type]?.label}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:"var(--text-muted)",fontSize:11}}>{h.buyCurrency==="USD"?fmtU(h.prevPrice,4):fmtA(h.prevPrice)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontSize:11}}>
                    {h.buyCurrency==="USD"?fmtU(h.currentPrice,4):fmtA(h.currentPrice)}
                    {h.hasLive&&<span style={{display:"block",fontSize:9,color:"var(--green)"}}>● live</span>}
                  </td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:pc(h.dayPct)}}>{fmtP(h.dayPct)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:pc(h.dayPnlUSD||0)}}>{hideAmounts?"••••":(h.dayPnlUSD!=null?(h.dayPnlUSD>=0?"+":"")+fmtU(h.dayPnlUSD,0):"—")}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:pc(h.pnlUSD)}}>{hideAmounts?"••••":fmtU(h.pnlUSD,0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RankingWidget por período */}
      <div style={{...card,overflow:"hidden"}}>
        <RankingWidget en={en} historicos={historicos} fxRate={fxRate} currency={currency}/>
      </div>
    </div>
  );
}

export default function App(){
  // ── State ────────────────────────────────────────────────────────────────
  const SEED_TRADES = [
    // ── Posiciones al 01/01/26 (tenencia previa) ─────────────────────
    {id:1, ticker:"YPFD",      tipo:"compra", qty:78,       price:54214.29,  currency:"ARS", date:"2026-01-01", ts:1000,  name:"YPF Ordinarias D",                comision:0},
    {id:2, ticker:"TZXD6",     tipo:"compra", qty:781503,   price:179,       currency:"ARS", date:"2026-01-01", ts:2000,  name:"BONTES CER V15/12/26",            comision:0},
    {id:3, ticker:"TLCUD",     tipo:"compra", qty:7000,     price:100.0,     currency:"USD", date:"2026-01-01", ts:3000,  name:"ON Telecom C28 05/03/29",         comision:0},
    {id:4, ticker:"AO27D",     tipo:"compra", qty:2954,     price:102.0,     currency:"USD", date:"2026-01-01", ts:4000,  name:"Bono Tesoro 6% V29/10/27",        comision:0},
    {id:5, ticker:"GD38D",     tipo:"compra", qty:1681,     price:78.0,      currency:"USD", date:"2026-01-01", ts:5000,  name:"BONOS REP ARG U\$S V09/01/38",    comision:0},
    {id:6, ticker:"FIMA-PREM", tipo:"compra", qty:40284.34, price:74.457340, currency:"ARS", date:"2026-01-01", ts:6000,  name:"FIMA Premium Cl A",               comision:0},
    {id:7, ticker:"FIMA-AHP",  tipo:"compra", qty:9.88,     price:600.718,   currency:"ARS", date:"2026-01-01", ts:7000,  name:"FIMA Ahorro Pesos Cl A",          comision:0},
    {id:8, ticker:"FIMA-AHPP", tipo:"compra", qty:2.30,     price:147.952,   currency:"ARS", date:"2026-01-01", ts:8000,  name:"FIMA Ahorro Plus Cl A",           comision:0},
    {id:9, ticker:"FIMA-PREMD",tipo:"compra", qty:140,      price:1.012932,  currency:"USD", date:"2026-01-01", ts:9000,  name:"FIMA Premium Dólares Cl A",       comision:0},
    // ── Operaciones 2026 ──────────────────────────────────────────────
    // GLD
    {id:100,ticker:"GLD",  tipo:"compra",qty:74,  price:13490.5802,  currency:"ARS",date:"2026-02-05",ts:100000,name:"ETF SPDR Gold Trust",        comision:2994.91},
    {id:101,ticker:"GLD",  tipo:"compra",qty:103, price:14438.9393, currency:"ARS",date:"2026-03-03",ts:101000,name:"ETF SPDR Gold Trust",        comision:4461.63},
    // SPY
    {id:102,ticker:"SPY",  tipo:"compra",qty:19,  price:50117.189,   currency:"ARS",date:"2026-03-03",ts:102000,name:"SPDR S&P 500 ETF",           comision:2856.68},
    // TXAR (2 lotes al mismo precio, misma fecha)
    {id:103,ticker:"TXAR", tipo:"compra",qty:482, price:605.697,  currency:"ARS",date:"2026-03-03",ts:103000,name:"Siderar (Ternium Argentina)",comision:875.84},
    {id:104,ticker:"TXAR", tipo:"compra",qty:1985,price:605.697,currency:"ARS",date:"2026-03-03",ts:104000,name:"Siderar (Ternium Argentina)",comision:3606.93},
    // YPFD compra 2026
    {id:105,ticker:"YPFD", tipo:"compra",qty:9,   price:50890.5251,    currency:"ARS",date:"2026-03-04",ts:105000,name:"YPF Ordinarias D",           comision:1374.04},
    // YPFD ventas
    {id:106,ticker:"YPFD", tipo:"venta", qty:33,  price:53504.6011, currency:"ARS",date:"2026-03-11",ts:106000,name:"YPF Ordinarias D",comision:5265.27},
    {id:107,ticker:"YPFD", tipo:"venta", qty:1,   price:53504.6038,    currency:"ARS",date:"2026-03-11",ts:107000,name:"YPF Ordinarias D",comision:159.55},
    {id:108,ticker:"YPFD", tipo:"venta", qty:3,   price:53504.6005,   currency:"ARS",date:"2026-03-11",ts:108000,name:"YPF Ordinarias D",comision:478.66},
    {id:109,ticker:"YPFD", tipo:"venta", qty:8,   price:70327.495,   currency:"ARS",date:"2026-04-01",ts:109000,name:"YPF Ordinarias D",comision:1677.76},
    {id:110,ticker:"YPFD", tipo:"venta", qty:7,   price:68602.4344,   currency:"ARS",date:"2026-04-01",ts:110000,name:"YPF Ordinarias D",comision:1432.03},
    {id:111,ticker:"YPFD", tipo:"venta", qty:14,  price:67202.385,  currency:"ARS",date:"2026-04-06",ts:111000,name:"YPF Ordinarias D",comision:2805.62},
    {id:112,ticker:"YPFD", tipo:"venta", qty:2,   price:64345.1404,   currency:"ARS",date:"2026-04-10",ts:112000,name:"YPF Ordinarias D",comision:383.76},
    {id:113,ticker:"YPFD", tipo:"venta", qty:5,   price:64345.1394,   currency:"ARS",date:"2026-04-10",ts:113000,name:"YPF Ordinarias D",comision:959.4},
    {id:114,ticker:"YPFD", tipo:"venta", qty:14,  price:62402.2138,  currency:"ARS",date:"2026-04-15",ts:114000,name:"YPF Ordinarias D",comision:2605.21},
    // NU
    {id:115,ticker:"NU",   tipo:"compra",qty:189, price:10849.6173, currency:"ARS",date:"2026-03-12",ts:115000,name:"NU Holdings Cl A",           comision:6151.73},
    // GLOB venta
    {id:116,ticker:"GLOB", tipo:"venta", qty:80,  price:3594.2213,  currency:"ARS",date:"2026-03-30",ts:116000,name:"Globant S.A.",         comision:857.45},
    // VIST (2 lotes misma fecha y precio)
    {id:117,ticker:"VIST", tipo:"compra",qty:1,   price:35598.7438,     currency:"ARS",date:"2026-03-30",ts:117000,name:"Vista Oil & Gas",             comision:106.8},
    {id:118,ticker:"VIST", tipo:"compra",qty:13,  price:35598.7445,   currency:"ARS",date:"2026-03-30",ts:118000,name:"Vista Oil & Gas",             comision:1388.35},
    // META
    {id:119,ticker:"META", tipo:"compra",qty:17,  price:34778.7725,   currency:"ARS",date:"2026-04-01",ts:119000,name:"Meta Platforms Inc",          comision:1773.72},
    {id:120,ticker:"META", tipo:"compra",qty:2,   price:38930.6281,     currency:"ARS",date:"2026-04-10",ts:120000,name:"Meta Platforms Inc",          comision:233.58},
    {id:121,ticker:"META", tipo:"compra",qty:7,   price:38930.6267,    currency:"ARS",date:"2026-04-10",ts:121000,name:"Meta Platforms Inc",          comision:817.54},
    {id:122,ticker:"META", tipo:"compra",qty:6,   price:38930.6265,    currency:"ARS",date:"2026-04-10",ts:122000,name:"Meta Platforms Inc",          comision:700.75},
    {id:123,ticker:"META", tipo:"compra",qty:12,  price:41058.551,   currency:"ARS",date:"2026-04-15",ts:123000,name:"Meta Platforms Inc",          comision:1478.11},
    // MSFT
    {id:124,ticker:"MSFT", tipo:"compra",qty:27,  price:18299.3542,   currency:"ARS",date:"2026-04-06",ts:124000,name:"Microsoft Corp",              comision:1482.25},
    {id:125,ticker:"MSFT", tipo:"compra",qty:19,  price:19799.3016,   currency:"ARS",date:"2026-04-15",ts:125000,name:"Microsoft Corp",              comision:1128.56},
    // TZX27 (2 lotes misma fecha)
    {id:126,ticker:"TZX27",tipo:"compra",qty:315634,price:355.0,currency:"ARS",date:"2026-04-06",ts:126000,name:"BONO REP ARG CER V30/06/27",comision:3360.14},
    {id:127,ticker:"TZX27",tipo:"compra",qty:112815,price:356.0,currency:"ARS",date:"2026-04-06",ts:127000,name:"BONO REP ARG CER V30/06/27",comision:1200.99},
  ];

    const [port,setPort]         = useState(GALICIA_PORTFOLIO);
  const [trades,setTrades]     = useState(SEED_TRADES);
  const [storageReady,setStorageReady] = useState(false);
  const [historicos,setHistoricos] = useState(null);

  // Cargar históricos desde JSON generado por GitHub Actions
  useEffect(()=>{
    fetch("/historicos.json")
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d && Object.keys(d).length>1) setHistoricos(d); })
      .catch(()=>{});
  },[]);
  const [tab,setTab]           = useState("dashboard");
  const [modal,setModal]       = useState(null);
  const [ventaResult,setVentaResult] = useState(null);
  const [fx,setFx]             = useState("CCL");
  const [liveFX,setLiveFX]     = useState(FX_FALLBACK);
  const [livePrices,setLivePrices] = useState({});
  const [liveT10Y,setLiveT10Y] = useState(T10Y_FALLBACK);
  const [liveSP500,setLiveSP500] = useState(null);
  const [priceStatus,setPriceStatus] = useState("idle");
  const [lastRefresh,setLastRefresh] = useState(null);
  const [countdown,setCountdown]   = useState(300);

  useEffect(()=>{
    if(!lastRefresh)return;
    setCountdown(300);
    const tick=setInterval(()=>setCountdown(c=>c<=1?300:c-1),1000);
    return()=>clearInterval(tick);
  },[lastRefresh]);

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

  const portRef = React.useRef(port);
  useEffect(()=>{ portRef.current = port; },[port]);

  const refreshPrices = async (activeTickers_) => {
    setPriceStatus("loading");
    try {
      const activeTickers = activeTickers_ || [...new Set(portRef.current.map(h=>h.ticker))];
      const {fx:newFX,prices:newPrices,t10y:newT10Y} = await fetchAllLivePrices(activeTickers);
      setLiveFX(newFX);
      setLivePrices(newPrices);
      setLiveT10Y(newT10Y);
      // S&P500 en vivo via Yahoo proxy — usar meta.regularMarketPrice que siempre es el precio actual
      try{
        const r=await fetch(YAHOO_PROXY+"?symbol=%5EGSPC&range=1d&interval=5m",{signal:AbortSignal.timeout(6000)});
        if(r.ok){
          const d=await r.json();
          const meta=d?.chart?.result?.[0]?.meta;
          // Preferir regularMarketPrice del meta — es el precio en tiempo real
          const price=meta?.regularMarketPrice||meta?.chartPreviousClose||null;
          if(price&&price>1000)setLiveSP500(price);
        }
      }catch{}
      setLastRefresh(new Date());
      setPriceStatus(Object.keys(newPrices).length>0?"live":"partial");
    } catch { setPriceStatus("error"); }
  };

  // Refresh al cargar — esperar que localStorage esté listo
  useEffect(()=>{ if(storageReady){ refreshPrices(); const iv=setInterval(refreshPrices,5*60*1000); return()=>clearInterval(iv); } },[storageReady]);

  // ── Portfolio calcs ───────────────────────────────────────────────────────
  const ppcByTicker = port.reduce((acc,t)=>{
    const buys = trades.filter(tr=>tr.ticker===t.ticker&&tr.tipo==="compra");
    if(!buys.length){ acc[t.ticker]=t.buyPrice; return acc; }
    const totalCost=buys.reduce((a,tr)=>a+tr.qty*tr.price,0);
    const totalQty =buys.reduce((a,tr)=>a+tr.qty,0);
    acc[t.ticker]=totalQty>0?totalCost/totalQty:t.buyPrice;
    return acc;
  },{});

  const today = todayAR();
  const en=port.map(h=>{
    const live=livePrices[h.ticker];
    const isBondH=h.type==="bono_ars"; // solo ARS cotiza por 100 laminas diferente al historico
    const livePrice=live?live.price:null;
    const currentPrice=livePrice??h.currentPrice;
    const ppc=ppcByTicker[h.ticker]||h.buyPrice;
    let liveChangePct = live?.changePct ?? null;
    if(livePrice && historicos){
      const bars = historicos[h.ticker];
      if(bars && bars.length>=1){
        const prevClose = bars[bars.length-1].close;
        if(prevClose>0){
          liveChangePct = parseFloat(((livePrice-prevClose)/prevClose*100).toFixed(2));
        }
      } else {
        // Sin histórico: si fue dado de alta hoy, variación vs PPC de compra
        const buyToday = trades.some(t=>t.ticker===h.ticker&&t.tipo==="compra"&&t.date===today);
        if(buyToday && ppc>0){
          liveChangePct = parseFloat(((livePrice-ppc)/ppc*100).toFixed(2));
        }
      }
    }
    // Bonos cotizan por cada 100 VN — dividir por 100 para obtener valor real
    const isBond = h.type==="bono_usd" || h.type==="bono_ars";
    const qtyFactor = isBond ? h.qty/100 : h.qty;

    const cclBarsH = historicos?.CCL||[];
    const findCCL = (d) => {
      if(!cclBarsH.length) return fxRate;
      const t=new Date(d).getTime();
      return cclBarsH.reduce((b,x)=>Math.abs(new Date(x.date)-t)<Math.abs(new Date(b.date)-t)?x:b,cclBarsH[0])?.close||fxRate;
    };

    // costUSD: sumar cada lote de compra al TC de ese día + comisiones
    let costUSD;
    if(h.buyCurrency==="USD"){
      const buyLots = trades.filter(t=>t.ticker===h.ticker&&t.tipo==="compra");
      const lotsDescending = [...buyLots].sort((a,b)=>a.date.localeCompare(b.date));
      let costUSDTotal = 0;
      let qtyToAccount = h.qty;
      for(const lot of lotsDescending){
        if(qtyToAccount<=0)break;
        const lotUsed = Math.min(lot.qty, qtyToAccount);
        const isBondLot = h.type==="bono_usd"||h.type==="bono_ars";
        const lotFactor = isBondLot ? lotUsed/100 : lotUsed;
        const lotTotal = lot.price * lotFactor;
        // Comisión prorrateada por lote
        const lotComision = lot.comision ? (+lot.comision * lotUsed / lot.qty) : 0;
        costUSDTotal += lotTotal + lotComision;
        qtyToAccount -= lotUsed;
      }
      costUSD = costUSDTotal;
    } else {
      const buyLots = trades.filter(t=>t.ticker===h.ticker&&t.tipo==="compra");
      const lotsDescending = [...buyLots].sort((a,b)=>a.date.localeCompare(b.date));
      let costUSDTotal = 0;
      let qtyToAccount = h.qty;
      for(const lot of lotsDescending){
        if(qtyToAccount<=0)break;
        const lotUsed = Math.min(lot.qty, qtyToAccount);
        const isBondLot = h.type==="bono_usd"||h.type==="bono_ars";
        const lotFactor = isBondLot ? lotUsed/100 : lotUsed;
        const tcDia = findCCL(lot.date);
        const lotComision = lot.comision ? (+lot.comision * lotUsed / lot.qty) : 0;
        costUSDTotal += (lot.price * lotFactor + lotComision) / tcDia;
        qtyToAccount -= lotUsed;
      }
      costUSD = costUSDTotal;
    }

    const valARS=h.buyCurrency==="USD"?currentPrice*qtyFactor*fxRate:currentPrice*qtyFactor;
    const valUSD=valARS/fxRate;
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

  // ── Exporta portfolio_tickers.json — lo lee update_historicos.py ─────────────
  // Todos los tickers que alguna vez estuvieron en cartera (activos + vendidos)
  // para que el script descargue histórico completo sin perder datos de posiciones cerradas
  const downloadPortfolioTickers = (currentTrades) => {
    try {
      const allTickers = [...new Set(currentTrades.map(t=>t.ticker))];
      const data = { tickers: allTickers, updatedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "portfolio_tickers.json";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch(e) { console.warn("downloadPortfolioTickers error", e); }
  };

  const saveOrDelete=(h)=>{
    if(!h){
      const id=modal?.id;
      if(id){
        const pos=port.find(x=>x.id===id);
        if(pos){
          const ts=Date.now();
          const live=livePrices[pos.ticker];
          const sellPrice=live?live.price:pos.currentPrice;
          setTrades(t=>[...t,{id:ts,ticker:pos.ticker,tipo:"venta",qty:pos.qty,price:sellPrice,currency:pos.buyCurrency,date:todayAR(),ts,name:pos.name}]);
        }
        setPort(p=>p.filter(x=>x.id!==id));
      }
      setModal(null); return;
    }
    const existing=port.find(x=>x.id===h.id)||port.find(x=>x.ticker===h.ticker.toUpperCase());
    const ts=Date.now();
    const comision=h.comision?+h.comision:undefined;
    const tradeBase={ticker:h.ticker.toUpperCase(),currency:h.buyCurrency,date:h.buyDate||todayAR(),ts,name:h.name,...(comision?{comision}:{})};
    // Precio se guarda tal cual (data912 ya devuelve en laminas de 100)
    const priceToSave=+h.buyPrice;
    if(!existing){
      const newTicker=h.ticker.toUpperCase();
      const newTrades=[...trades,{id:ts,tipo:"compra",qty:+h.qty,price:priceToSave,...tradeBase}];
      setTrades(newTrades);
      setPort(p=>{
        const newPort=[...p,{...h,id:ts,buyPrice:priceToSave}];
        const allTickers=[...new Set(newPort.map(x=>x.ticker))];
        setTimeout(()=>refreshPrices(allTickers),100);
        return newPort;
      });
      // Auto-descarga portfolio_tickers.json para subir al repo
      setTimeout(()=>downloadPortfolioTickers(newTrades),300);
    } else if(h.operacion==="venta"){
      const sellQty=+h.qty; const sellPrice=isBondSave?+h.buyPrice/100:+h.buyPrice;
      const buyLots=trades.filter(t=>t.ticker===h.ticker.toUpperCase()&&t.tipo==="compra").sort((a,b)=>a.ts-b.ts);
      let remaining=sellQty,costFIFO=0;
      for(const lot of buyLots){ if(remaining<=0)break; const used=Math.min(lot.qty,remaining); costFIFO+=used*lot.price+(lot.comision?(+lot.comision*used/lot.qty):0); remaining-=used; }
      const proceeds=sellQty*sellPrice;
      const comisionVenta=comision||0;
      const proceedsNeto=proceeds-comisionVenta;
      const pnlAmt=proceedsNeto-costFIFO;
      const pnlPct=costFIFO>0?(pnlAmt/costFIFO)*100:0;
      setTrades(t=>[...t,{id:ts,tipo:"venta",qty:sellQty,price:sellPrice,pnlAmt:parseFloat(pnlAmt.toFixed(2)),pnlPct:parseFloat(pnlPct.toFixed(2)),...tradeBase}]);
      const newQty=existing.qty-sellQty;
      if(newQty<=0) setPort(p=>p.filter(x=>x.id!==existing.id));
      else setPort(p=>p.map(x=>x.id===existing.id?{...x,qty:newQty}:x));
      setVentaResult({ticker:h.ticker.toUpperCase(),name:h.name,currency:h.buyCurrency,sellQty,sellPrice,proceeds,proceedsNeto,comisionVenta,costFIFO,pnlAmt:parseFloat(pnlAmt.toFixed(2)),pnlPct:parseFloat(pnlPct.toFixed(2)),buyDate:buyLots[0]?.date||"2026-04-01",sellDate:tradeBase.date});
    } else {
      setTrades(t=>[...t,{id:ts,tipo:"compra",qty:+h.qty,price:priceToSave,...tradeBase}]);
      const matchId=existing.id;
      setPort(p=>p.map(x=>x.id===matchId?{...x,qty:x.qty+(+h.qty),buyPrice:+h.buyPrice}:x));
    }
    setModal(null);
  };

  const downloadTrades=()=>{
    if(!trades||!trades.length){alert("No hay movimientos.");return;}
    const sep=";";
    const fmtNum=(n,d=2)=>Number(n).toFixed(d).replace(".",",");
    const header=["Fecha","Ticker","Nombre","Tipo","Nominales","Precio","Moneda","Monto Bruto","Comisión","Monto Neto","PnL Monto","PnL %"].join(sep);
    const rows=[...trades].sort((a,b)=>a.date.localeCompare(b.date)).map(t=>{
      const qty=fmtNum(t.qty,Number(t.qty)%1===0?0:4);
      const bruto=Number(t.qty)*Number(t.price);
      const com=t.comision?Number(t.comision):0;
      const neto=t.tipo==="compra"?bruto+com:bruto-com;
      const pnlA=t.tipo==="venta"&&t.pnlAmt!=null?fmtNum(t.pnlAmt,2):"";
      const pnlP=t.tipo==="venta"&&t.pnlPct!=null?fmtNum(t.pnlPct,2)+"%":"";
      return[t.date,t.ticker,`"${(t.name||"").replace(/"/g,'""')}"`,t.tipo,qty,fmtNum(t.price,4),t.currency||"ARS",fmtNum(bruto,2),com?fmtNum(com,2):"",fmtNum(neto,2),pnlA,pnlP].join(sep);
    });
    const csv="\uFEFF"+header+"\n"+rows.join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url;
    a.download=`movimientos_${todayAR()}.csv`;
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

  const card={background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:14,boxShadow:"var(--card-glow)"};
  const [darkMode, setDarkMode] = useState(true);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [chartModal, setChartModal] = useState(false);

  return(
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:var(--bg);color:var(--text-primary);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
        .theme-dark{
          --bg:#060e1a;--bg-card:#0b1628;--bg-input:#111f33;--border:#1a2d45;
          --accent:#3b82f6;--accent2:#6366f1;
          --text-primary:#e2ecf8;--text-secondary:#6b8faf;
          --text-muted:#2e4560;--red:#f87171;--green:#34d399;--yellow:#fbbf24;
          --title-color:#ffffff;
          --card-glow:0 1px 3px rgba(0,0,0,0.4),0 0 0 1px rgba(59,130,246,0.04);
          --card-hover-glow:0 4px 20px rgba(59,130,246,0.08),0 0 0 1px rgba(59,130,246,0.1);
        }
        .theme-light{
          --bg:#f1f5fb;--bg-card:#ffffff;--bg-input:#e8eef6;--border:#dde5f0;
          --accent:#2563eb;--accent2:#4f46e5;
          --text-primary:#0f172a;--text-secondary:#475569;
          --text-muted:#94a3b8;--red:#ef4444;--green:#16a34a;--yellow:#d97706;
          --title-color:#0f172a;
          --card-glow:0 1px 3px rgba(0,0,0,0.06),0 0 0 1px rgba(0,0,0,0.04);
          --card-hover-glow:0 4px 16px rgba(37,99,235,0.1),0 0 0 1px rgba(37,99,235,0.12);
        }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fi{font-family:'DM Sans',system-ui,sans-serif;animation:fadeIn 0.3s ease;}
        .fi *{box-sizing:border-box;}
        .fi .kpi-card{transition:box-shadow 0.2s,transform 0.2s;}
        .fi .kpi-card:hover{box-shadow:var(--card-hover-glow);transform:translateY(-1px);}
        .fi .nav-btn{transition:color 0.15s;}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:var(--bg)}
        ::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
      `}</style>

      <div style={{minHeight:"100vh",background:"var(--bg)"}} className={darkMode?"theme-dark":"theme-light"}>
        {/* Header */}
        <div style={{background:"var(--bg-card)",borderBottom:"1px solid var(--border)",padding:"11px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,boxShadow:"0 2px 8px rgba(59,130,246,0.3)"}}>📊</div>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:"var(--title-color)",letterSpacing:"-0.3px"}}>Mi Portfolio</div>
              <div style={{fontSize:11,color:"var(--text-muted)"}}>
                {priceStatus==="live"&&<span style={{color:"var(--green)"}}>● {liveCount}/{port.length} activos · actualizado {lastRefresh?.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})} · próx. {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,"0")}</span>}
                {priceStatus==="partial"&&<span style={{color:"var(--yellow)"}}>◐ Parcial · actualizado {lastRefresh?.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})} · próx. {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,"0")}</span>}
                {priceStatus==="loading"&&<span style={{color:"var(--text-muted)"}}>⟳ Actualizando precios...</span>}
                {priceStatus==="idle"&&<span style={{color:"var(--text-muted)"}}>Cargando...</span>}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{display:"flex",flexDirection:"column",gap:1}}>
              <select value={fx} onChange={e=>setFx(e.target.value)} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 10px",color:"var(--text-secondary)",fontSize:12,cursor:"pointer"}}>
                <option value="CCL">💵 CCL {fmtA(liveFX.CCL)}</option>
                <option value="MEP">💵 MEP {fmtA(liveFX.MEP)}</option>
                <option value="oficial">💵 Oficial {fmtA(liveFX.oficial)}</option>
              </select>
              <div style={{fontSize:9,color:"var(--text-muted)",textAlign:"center"}}>dólar de valuación</div>
            </div>
            <button onClick={refreshPrices} disabled={priceStatus==="loading"} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 10px",color:"var(--text-secondary)",cursor:"pointer",fontSize:12}}>↻</button>
            <button onClick={downloadTrades} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,padding:"6px 10px",color:"var(--text-secondary)",cursor:"pointer",fontSize:13}}>⬇ CSV</button>
            <button onClick={()=>setHideAmounts(h=>!h)} title={hideAmounts?"Mostrar montos":"Ocultar montos"}
              style={{background:hideAmounts?"rgba(37,99,235,0.15)":"var(--bg-card)",border:hideAmounts?"1px solid var(--accent)":"1px solid var(--border)",borderRadius:6,padding:"6px 10px",color:hideAmounts?"var(--accent)":"var(--text-secondary)",cursor:"pointer",fontSize:14}}>
              {hideAmounts?"🙈":"👁"}
            </button>
            <button onClick={()=>setDarkMode(d=>!d)} title={darkMode?"Modo día":"Modo noche"}
              style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,padding:"6px 10px",color:"var(--text-secondary)",cursor:"pointer",fontSize:14}}>
              {darkMode?"☀️":"🌙"}
            </button>
            <button onClick={()=>setModal("add")} style={{background:"var(--accent)",border:"none",borderRadius:6,padding:"6px 14px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>+ Posición</button>
          </div>
        </div>

        {/* Nav */}
        <div style={{background:"var(--bg-card)",borderBottom:"1px solid var(--border)",padding:"0 20px",display:"flex",gap:0}}>
          {[["dashboard","📊 Dashboard"],["portfolio","💼 Portfolio"],["analisis","🔍 Análisis"],["operaciones","📋 Operaciones"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)} className="nav-btn" style={{padding:"13px 18px",background:"transparent",border:"none",borderBottom:tab===id?"2px solid var(--accent)":"2px solid transparent",color:tab===id?"var(--text-primary)":"var(--text-muted)",cursor:"pointer",fontSize:13,fontWeight:tab===id?600:400,letterSpacing:tab===id?"-0.1px":0}}>
              {lbl}
            </button>
          ))}
        </div>

        <div style={{padding:"22px 60px",maxWidth:"100%",boxSizing:"border-box"}}>

          {/* DASHBOARD */}
          {tab==="dashboard"&&(
            <div className="fi" style={{display:"grid",gap:16}}>
              {/* KPI Cards — rediseñados */}
              {(()=>{
                // Rendimiento diario: usar liveChangePct de cada activo (viene de data912, es el cambio vs cierre anterior real)
                // Esto es más preciso que comparar con el último bar del historicos.json
                const todayKPI=todayAR();
                let dayPnlUSD=0, baseValUSD=0;
                for(const h of en){
                  // Solo activos con precio live y cambio % del día
                  if(h.liveChangePct==null||!h.isLive)continue;
                  const isBond=h.type==="bono_usd"||h.type==="bono_ars";

                  // Qty de ayer (excluir compras de hoy para no inflar)
                  const buysAyer=trades.filter(t=>t.ticker===h.ticker&&t.tipo==="compra"&&t.date<todayKPI);
                  const ventasAyer=trades.filter(t=>t.ticker===h.ticker&&t.tipo==="venta"&&t.date<todayKPI);
                  const qtyAyer=Math.max(0,buysAyer.reduce((a,t)=>a+t.qty,0)-ventasAyer.reduce((a,t)=>a+t.qty,0));
                  if(qtyAyer<=0)continue;

                  const qtyFactor=isBond?qtyAyer/100:qtyAyer;
                  // Precio de ayer = precio actual / (1 + changePct/100)
                  const prevPrice=h.currentPrice/(1+h.liveChangePct/100);
                  const vHoy=h.buyCurrency==="USD"?h.currentPrice*qtyFactor:h.currentPrice*qtyFactor/fxRate;
                  const vAyer=h.buyCurrency==="USD"?prevPrice*qtyFactor:prevPrice*qtyFactor/fxRate;
                  dayPnlUSD+=vHoy-vAyer;
                  baseValUSD+=vAyer;
                }
                const dayPct=baseValUSD>0?(dayPnlUSD/baseValUSD)*100:0;

                const kpis=[
                  {
                    icon:"💼", lbl:"Valor total",
                    main:hideAmounts?"••••••":fmtU(totUSD),
                    sub:hideAmounts?"••••":fmtA(totUSD*fxRate),
                    subLabel:"ARS",
                    mainColor:"var(--accent)",
                    trend:null,
                    bigSub:true,
                  },
                  {
                    icon:"📈", lbl:"Rendimiento total",
                    main:fmtP(totPct),
                    sub:hideAmounts?"••••":fmtU(totPnl),
                    subLabel:"PnL acumulado",
                    mainColor:pc(totPct),
                    trend:totPct,
                  },
                  {
                    icon:"📅", lbl:"Rendimiento del día",
                    main:fmtP(dayPct),
                    sub:hideAmounts?"••••":(dayPnlUSD>=0?"+":"")+fmtU(dayPnlUSD),
                    subLabel:"P&L hoy USD",
                    mainColor:pc(dayPct),
                    trend:dayPct,
                  },
                ];
                return(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,maxWidth:860}}>
                    {kpis.map(k=>(
                      <div key={k.lbl} className="kpi-card" style={{
                        ...card,
                        padding:"16px 20px",
                        position:"relative",
                        overflow:"hidden",
                        borderLeft:`3px solid ${k.mainColor==="var(--text-secondary)"?"var(--border)":k.mainColor}`,
                      }}>
                        {k.trend!=null&&<div style={{position:"absolute",inset:0,background:`${k.trend>=0?"rgba(52,211,153,":"rgba(248,113,113,"}0.04)`,pointerEvents:"none"}}/>}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                          <span style={{fontSize:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1.2,fontWeight:600}}>{k.lbl}</span>
                          <span style={{fontSize:13,lineHeight:1,opacity:0.7}}>{k.icon}</span>
                        </div>
                        <div style={{fontSize:26,fontFamily:"'DM Sans',Georgia,serif",fontWeight:700,color:k.mainColor,lineHeight:1,marginBottom:8,letterSpacing:"-0.5px"}}>
                          {k.main}
                        </div>
                        <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                          <span style={{fontSize:k.bigSub?15:12,color:k.trend!=null?pc(k.trend):"var(--text-secondary)",fontWeight:k.bigSub?600:k.trend!=null?600:400}}>{k.sub}</span>
                          {k.subLabel&&<span style={{fontSize:8,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.8,marginLeft:3}}>{k.subLabel}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:14,alignItems:"stretch"}}>
                <div style={{...card,padding:"18px 16px",display:"flex",flexDirection:"column"}}>
                  <div style={{fontSize:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:12,fontWeight:600}}>Asignación por tipo</div>
                  <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
                    <Donut segs={byType.map(t=>({k:t.key,v:t.val,color:t.color,label:t.label}))} size={170}/>
                    <div style={{width:"100%",display:"grid",gap:8}}>
                      {byType.map(t=>(
                        <div key={t.key} style={{display:"flex",alignItems:"center",gap:7}}>
                          <div style={{width:7,height:7,borderRadius:"50%",background:t.color,flexShrink:0}}/>
                          <div style={{flex:1,fontSize:11,color:"var(--text-secondary)",whiteSpace:"nowrap"}}>{t.icon} {t.label}</div>
                          <div style={{fontSize:11,fontWeight:700,color:"var(--text-primary)"}}>{t.pct.toFixed(1)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{...card,padding:"10px 18px 18px",display:"flex",flexDirection:"column"}}>
                  <div style={{height:410}}>
                    <EvoMini en={en} trades={trades} fxRate={fxRate} liveT10Y={liveT10Y} liveFX={liveFX} liveSP500={liveSP500} historicos={historicos} livePricesAll={livePrices} onExpand={()=>setChartModal(true)}/>
                  </div>
                </div>
                {chartModal&&(
                  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:500,display:"flex",flexDirection:"column"}} className={darkMode?"theme-dark":"theme-light"}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 24px",borderBottom:"1px solid var(--border)",background:"var(--bg-card)",flexShrink:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>Rendimiento base 100</div>
                      <button onClick={()=>setChartModal(false)}
                        style={{background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:13,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:6}}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 4.5V1.5H4.5M7.5 1.5H10.5V4.5M10.5 7.5V10.5H7.5M4.5 10.5H1.5V7.5"/></svg>
                        Cerrar
                      </button>
                    </div>
                    <div style={{flex:1,padding:"24px",minHeight:0}}>
                      <EvoMini en={en} trades={trades} fxRate={fxRate} liveT10Y={liveT10Y} liveFX={liveFX} liveSP500={liveSP500} historicos={historicos} isModal={true} livePricesAll={livePrices}/>
                    </div>
                  </div>
                )}
              </div>

              {/* Top/Bottom 5 del día en Dashboard */}
              <DayMoversWidget en={enGrouped} historicos={historicos} fxRate={fxRate} livePrices={livePrices} card={card} hideAmounts={hideAmounts}/>



            </div>
          )}

          {/* PORTFOLIO */}
          {tab==="portfolio"&&(
            <PortfolioTab byType={byType} en={enGrouped} totUSD={totUSD} totCost={totCost}
              totPnl={totPnl} totPct={totPct} fxRate={fxRate} fxMode={fx}
              setModal={setModal} del={del} card={card} hideAmounts={hideAmounts}
              trades={trades} historicos={historicos}/>
          )}

          {/* ANÁLISIS */}
          {tab==="analisis"&&(
            <AnalisisTab en={enGrouped} historicos={historicos} fxRate={fxRate} currency={fx} card={card} livePrices={livePrices} hideAmounts={hideAmounts}/>
          )}

          {/* OPERACIONES */}
          {tab==="operaciones"&&(
            <OperacionesTab trades={trades} port={port} setTrades={setTrades} setPort={setPort} card={card} livePrices={livePrices}/>
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
