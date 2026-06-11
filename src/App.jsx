/* eslint-disable */
// v2.2 - modular split
import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from "react";
import { SEED_BOND_FLOWS, SEED_BOND_META } from './constants/bondFlows';
import { computeBondFlowsDelta, expandBondFlowsDelta } from './utils/bondUtils';
import BondWizard from './components/BondWizard';
import FlujoTab from './components/FlujoTab';
import { fetchFXLive, fetchAllLivePrices, fetchTreasury10Y } from './utils/priceUtils';
import Chart100 from './components/Chart100';
import { calcTWR, calcXIRR, deannualizeXIRR, calcModifiedDietzReturn, calcSeriesPeriodReturn } from './utils/calcUtils';
import OperacionesTab from './components/OperacionesTab';
import RankingWidget from './components/RankingWidget';
import DayMoversWidget from './components/DayMoversWidget';
import AnalisisTab from './components/AnalisisTab';
import Modal from './components/Modal';
import EvoTab from './components/EvoTab';
import PortfolioTab from './components/PortfolioTab';
import { ASSET_TYPES, todayAR } from './utils/shared';

// Componente de countdown — aislado para no re-renderizar el App entero
function CountdownDisplay({lastRefresh, priceStatus, liveCount, portLen}){
  const [display, setDisplay] = useState(300);
  useEffect(()=>{
    if(!lastRefresh) return;
    setDisplay(300);
    const iv = setInterval(()=>setDisplay(d=>d<=1?300:d-1), 1000);
    return()=>clearInterval(iv);
  },[lastRefresh]);
  if(priceStatus==="live") return <span style={{color:"var(--green)"}}>● {liveCount}/{portLen} activos · actualizado {lastRefresh?.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})} · próx. {Math.floor(display/60)}:{String(display%60).padStart(2,"0")}</span>;
  if(priceStatus==="partial") return <span style={{color:"var(--yellow)"}}>◐ Parcial</span>;
  if(priceStatus==="loading") return <span style={{color:"var(--text-muted)"}}>⟳ Actualizando...</span>;
  return null;
}

// Hook responsive — detecta pantalla mobile (<768px)
function useIsMobile(){ 
  const [m,setM]=useState(()=>{
    try{ return window.innerWidth<768; }catch{ return false; }
  });
  useEffect(()=>{
    const h=()=>{ try{ setM(window.innerWidth<768); }catch{} };
    window.addEventListener('resize',h);
    return()=>window.removeEventListener('resize',h);
  },[]);
  return m;
}

// ASSET_TYPES importado desde ./utils/shared

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
const TASA10Y_FALLBACK = 4.35;
// CER: se carga desde historicos.json (update_historicos.py lo descarga con el token del servidor)
const YAHOO_PROXY = "https://yahoo-proxy-blue.vercel.app/api/yahoo"; // proxy sin CORS

const fmtU = (n,d=0) => new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:d}).format(n);
const fmtA = (n) => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
const fmtP = (n) => `${n>=0?"+":""}${n.toFixed(2)}%`;
const pc   = (n) => n>=0?"var(--green)":"var(--red)";
// todayAR importado desde ./utils/shared

// Último día hábil (lunes-viernes) <= fecha dada
function lastHabil(dateStr) {
  const d = new Date(dateStr+'T12:00:00');
  const dow = d.getDay(); // 0=dom, 6=sab
  if(dow===0) d.setDate(d.getDate()-2); // dom → vie
  else if(dow===6) d.setDate(d.getDate()-1); // sab → vie
  return d.toISOString().slice(0,10);
}
function isHabil(dateStr) {
  const dow = new Date(dateStr+'T12:00:00').getDay();
  return dow!==0 && dow!==6;
}

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

// SEED_BOND_META importado desde ./constants/bondFlows



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


function EvoMini({en,trades,fxRate,liveT10Y,liveFX,liveSP500,historicos,isModal=false,livePricesAll={},onExpand=null}){
  const PERIODS=[{key:"mtd",label:"MTD",days:null,mtd:true},{key:"30d",label:"30d",days:30},{key:"90d",label:"90d",days:90},{key:"ytd",label:"YTD",days:null},{key:"1y",label:"1 año",days:365},{key:"3y",label:"3 años",days:1095}];
  // Persistir preferencias del gráfico en localStorage
  const _chartPrefs = ()=>{ try{ return JSON.parse(localStorage.getItem('gal_chart_prefs_v1')||'{}'); }catch{ return {}; } };
  const [period,setPeriodRaw]=useState(()=>_chartPrefs().period||"90d");
  const [currency,setCurrencyRaw]=useState(()=>_chartPrefs().currency||"USD_CCL");
  const [showUVA,setShowUVARaw]=useState(()=>_chartPrefs().showUVA??true);
  const [uvaTasa,setUvaTasaRaw]=useState(()=>_chartPrefs().uvaTasa??2.5);
  const uvaTasaRef = React.useRef(uvaTasa);
  useEffect(()=>{ uvaTasaRef.current = uvaTasa; },[uvaTasa]);
  const [showCER,setShowCERRaw]=useState(()=>_chartPrefs().showCER??false);
  const [showSP,setShowSPRaw]=useState(()=>_chartPrefs().showSP??true);
  const [showCCL,setShowCCLRaw]=useState(()=>_chartPrefs().showCCL??true);
  const [showMEP,setShowMEPRaw]=useState(()=>_chartPrefs().showMEP??false);

  // Guardar preferencias al cambiar
  const savePrefs = (patch) => {
    try{
      const cur = _chartPrefs();
      localStorage.setItem('gal_chart_prefs_v1', JSON.stringify({...cur,...patch}));
    }catch{}
  };
  const setPeriod = v => { setPeriodRaw(v); savePrefs({period:v}); };
  const setCurrency = v => { setCurrencyRaw(v); savePrefs({currency:v}); };
  const setShowUVA = fn => setShowUVARaw(prev=>{ const v=typeof fn==='function'?fn(prev):fn; savePrefs({showUVA:v}); return v; });
  const setUvaTasa = v => { setUvaTasaRaw(v); savePrefs({uvaTasa:v}); };
  const setShowCER = fn => setShowCERRaw(prev=>{ const v=typeof fn==='function'?fn(prev):fn; savePrefs({showCER:v}); return v; });
  const setShowSP  = fn => setShowSPRaw(prev=>{ const v=typeof fn==='function'?fn(prev):fn; savePrefs({showSP:v}); return v; });
  const setShowCCL = fn => setShowCCLRaw(prev=>{ const v=typeof fn==='function'?fn(prev):fn; savePrefs({showCCL:v}); return v; });
  const setShowMEP = fn => setShowMEPRaw(prev=>{ const v=typeof fn==='function'?fn(prev):fn; savePrefs({showMEP:v}); return v; });
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
    // Agregar hoy siempre como último punto
    if(!customEnd||customEnd>=today) filtered.push(today);
    return[...new Set(filtered)].sort();
  };

  const findPrice=(bars,dateStr)=>{
    if(!bars||!bars.length)return null;
    // Último precio <= fecha (nunca usar precio futuro)
    let lo=0,hi=bars.length-1,res=-1;
    while(lo<=hi){
      const mid=(lo+hi)>>1;
      if(bars[mid].date<=dateStr){res=mid;lo=mid+1;}else hi=mid-1;
    }
    if(res>=0) return bars[res].close||null;
    return bars[0].close||null;
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
      const liveSPYars=livePricesAll["SPY"]?.price||null;

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
            livePricesMap[h.ticker]=h.currentPrice; // all prices in per-100-laminas scale
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

      const port100=calcTWR(datesWithToday,trades,en,tickerBars,cclBars,mepBars,currency,fxRate,livePricesMap,customEnd,realToday2);

      // UVA benchmark — solo en modo ARS
      let uva100 = null;
      if(currency==="ARS" && hist?.uva?.length){
        const uvaBars = hist.uva;
        const startIdx = uvaBars.findIndex(x=>x.date>=datesWithToday[0]);
        const uvaStart = startIdx>=0 ? uvaBars[startIdx] : uvaBars[0];
        if(uvaStart){
          uva100 = datesWithToday.map(d=>{
            const uvaBar = uvaBars.filter(x=>x.date<=d);
            const uvaVal = uvaBar.length ? uvaBar[uvaBar.length-1].close : uvaStart.close;
            const dias = Math.round((new Date(d)-new Date(uvaStart.date))/(1000*60*60*24));
            const val = (uvaVal/uvaStart.close) * (1 + (uvaTasaRef.current/100) * dias/365) * 100;
            return {date:d, val:parseFloat(val.toFixed(4))};
          });
        }
      }

      // CER benchmark — solo en modo ARS
      let cer100 = null;
      if(currency==="ARS" && hist?.cer?.length){
        const cerBars = hist.cer;
        const startIdx = cerBars.findIndex(x=>x.date>=datesWithToday[0]);
        const cerStart = startIdx>=0 ? cerBars[startIdx] : cerBars[0];
        if(cerStart){
          cer100 = datesWithToday.map(d=>{
            const cerBar = cerBars.filter(x=>x.date<=d);
            const cerVal = cerBar.length ? cerBar[cerBar.length-1].close : cerStart.close;
            const val = (cerVal/cerStart.close) * 100;
            return {date:d, val:parseFloat(val.toFixed(4))};
          });
        }
      }

      setChartData({
        port100,t10y100,spy100,ccl100,mep100,uva100,cer100,currency,
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
  },[liveFX,liveSP500,livePricesAll,historicos,trades,showUVA,uvaTasa,showCER]);

  const cd=chartData;
  const periodPnL=useMemo(()=>{if(!cd||!cd.port100||cd.port100.length<2)return null;const p0=cd.port100[0].val,pN=cd.port100[cd.port100.length-1].val;if(!p0||p0<=0)return null;const portRetPct=(pN/p0-1)*100;let spyRetPct=null;if(cd.spy100&&cd.spy100.length>=2){const s0=cd.spy100[0].val,sN=cd.spy100[cd.spy100.length-1].val;if(s0>0)spyRetPct=(sN/s0-1)*100;}const totCostL=en.reduce((a,h)=>a+h.costUSD,0);let displayCost=totCostL,sym="US$ ";if(currency==="ARS"){displayCost=totCostL*fxRate;sym="$";}else if(currency==="USD_MEP"&&liveFX?.MEP>0){displayCost=totCostL*(liveFX.CCL||fxRate)/(liveFX.MEP);}const portPnL=displayCost*(portRetPct/100);const spPnL=spyRetPct!=null?displayCost*(spyRetPct/100):null;return{portPnL,spPnL,sym};},[cd,en,currency,fxRate,liveFX]);

  const _bT=useMemo(()=>{const m={};for(const h of en)if((h.type||"").startsWith("bono"))m[h.ticker]=true;return m;},[en]);
  const xirrData=useMemo(()=>{
    if(!cd||!cd.startDate||!cd.endDate||!trades) return {portXIRR:null,spyXIRR:null,alpha:null};
    const s=cd.startDate,e=cd.endDate;
    try{
      const _cclBarsXIRR=historicos?.CCL||[];
      const _getCCLForDate=(dateStr)=>{if(!_cclBarsXIRR.length)return liveFX?.CCL||fxRate||1;let lo=0,hi=_cclBarsXIRR.length-1,res=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(_cclBarsXIRR[mid].date<=dateStr){res=mid;lo=mid+1;}else hi=mid-1;}return res>=0?_cclBarsXIRR[res].close:(liveFX?.CCL||fxRate||1);};
      const isBondTicker=(tkr)=>{const T=String(tkr||'').toUpperCase();if(SEED_BOND_META&&SEED_BOND_META[T])return true;if(/\d/.test(T)&&(T.endsWith('D')||T.startsWith('TZX')||T.startsWith('GD')||T.startsWith('AL')||T.startsWith('AE')||T.startsWith('AO')||T.startsWith('TLCU')))return true;return false;};
      const currencyByTicker={};for(const t0 of(trades||[])){if(!t0?.ticker||!t0?.currency)continue;currencyByTicker[String(t0.ticker).toUpperCase()]=String(t0.currency).toUpperCase();}
      const _findHistPrice=(ticker,dateStr)=>{const bars=(historicos?.[ticker]||[]);if(!bars.length)return 0;let lo=0,hi=bars.length-1,res=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(bars[mid].date<=dateStr){res=mid;lo=mid+1;}else hi=mid-1;}if(res>=0)return bars[res].close||0;for(const b of bars){if(b.date>=dateStr)return b.close||0;}return 0;};
      const posAsOf=(dateStr,includeSameDay)=>{const pos={};for(const t of(trades||[])){if(!t?.ticker)continue;if(includeSameDay){if(t.date>dateStr)continue;}else{if(t.date>=dateStr)continue;}if(t.tipo==="compra")pos[t.ticker]=(pos[t.ticker]||0)+(+t.qty||0);if(t.tipo==="venta")pos[t.ticker]=(pos[t.ticker]||0)-(+t.qty||0);}return pos;};
      const valuePosUSD=(posMap,dateStr)=>{const ccl=_getCCLForDate(dateStr);let v=0;for(const[tkr,qty]of Object.entries(posMap||{})){if(!qty||qty<=0)continue;const T=String(tkr).toUpperCase();let price=_findHistPrice(T,dateStr);if(!price||price<=0){const lastBuy=(trades||[]).filter(t=>String(t.ticker||'').toUpperCase()===T&&t.tipo==="compra"&&t.date<=dateStr).sort((a,b)=>(b.ts||0)-(a.ts||0))[0];price=lastBuy?(+lastBuy.price||0):0;}if(!price||price<=0)continue;const isBond=isBondTicker(T);const qtyF=isBond?qty/100:qty;const cur=currencyByTicker[T]||(en.find(h=>h.ticker===T)?.buyCurrency||'ARS');const isUSD=String(cur).toUpperCase()==="USD";v+=isUSD?price*qtyF:(price*qtyF)/ccl;}return v;};
      const firstTradeDate=(trades||[]).map(t=>t?.date).filter(Boolean).sort()[0];
      const includeStartDayAsPosition=(s===firstTradeDate);
      const posStart=posAsOf(s,includeStartDayAsPosition);
      const posEnd=posAsOf(e,true);
      let startValUSD=valuePosUSD(posStart,s);
      let endValUSD=valuePosUSD(posEnd,e);
      const endValNow=en.reduce((a,h)=>a+h.valUSD,0);
      if(!endValUSD||endValUSD<=0)endValUSD=endValNow;
      const periodTrades=(trades||[]).filter(t=>((t.date>s)||(t.date===s&&!includeStartDayAsPosition))&&t.date<e);
      const flows=[];
      flows.push({date:s,amount:-startValUSD});
      for(const t of periodTrades){const T=String(t.ticker||'').toUpperCase();const isBond=isBondTicker(T);const rawAmt=(+t.qty||0)*(+t.price||0)*(isBond?0.01:1);const com=+t.comision||0;const amt=t.tipo==="compra"?rawAmt+com:rawAmt-com;const isUSD=(t.currency||'ARS')==='USD';const fxT=isUSD?1:_getCCLForDate(t.date);const usd=amt/fxT;flows.push({date:t.date,amount:t.tipo==="compra"?-usd:usd});}
      flows.push({date:e,amount:endValUSD});
      flows.sort((a,b)=>a.date.localeCompare(b.date));
      // Dias del periodo para des-anualizar
      const days=Math.max(1,Math.round((new Date(e)-new Date(s))/(1000*60*60*24)));
      // Portfolio XIRR: calcular anual y des-anualizar al periodo
      let portXIRR=null;
      if(flows.length>=2&&startValUSD>0&&endValUSD>0){const rAnual=calcXIRR(flows);if(rAnual!=null)portXIRR=deannualizeXIRR(rAnual,days)*100;}
      // SPY XIRR: mismos cashflows, terminal crecido por SPY, des-anualizado
      let spyXIRR=null;
      if(cd.spy100&&cd.spy100.length>=2){const spy100=cd.spy100;const spyEnd=spy100[spy100.length-1].val;const spyAt=(dateStr)=>{let best=spy100[0];for(const p of spy100){if(p.date<=dateStr)best=p;else break;}return best.val||100;};if(spyEnd>0){const spyFlows=[];spyFlows.push({date:s,amount:-startValUSD});for(const fl of flows.slice(1,-1))spyFlows.push({...fl});let spyFinalVal=0;for(const fl of spyFlows){const spyAtFlow=spyAt(fl.date);const growth=spyAtFlow>0?spyEnd/spyAtFlow:1;spyFinalVal+=(-fl.amount)*growth;}spyFlows.push({date:e,amount:spyFinalVal});spyFlows.sort((a,b)=>a.date.localeCompare(b.date));if(spyFlows.length>=2&&startValUSD>0&&spyFinalVal>0){const rAnualSpy=calcXIRR(spyFlows);if(rAnualSpy!=null)spyXIRR=deannualizeXIRR(rAnualSpy,days)*100;}}}
      const alpha=(portXIRR!=null&&spyXIRR!=null)?portXIRR-spyXIRR:null;
      return {portXIRR,spyXIRR,alpha};
    }catch(err){console.warn('XIRR error:',err);return {portXIRR:null,spyXIRR:null,alpha:null};}
  },[cd,trades,en,fxRate,liveFX,currency,_bT,historicos]);

  const series=cd?[
    {key:"port",data:cd.port100,color:"var(--green)",bold:true},
    ...(showSP&&cd.spy100?[{key:"spy",data:cd.spy100,color:"#60A5FA",bold:false}]:[]),
    ...(showSP&&cd.currency!=="ARS"&&cd.t10y100?[{key:"t10y",data:cd.t10y100,color:"var(--yellow)",bold:false}]:[]),
    ...(showCCL&&cd.ccl100?[{key:"ccl",data:cd.ccl100,color:"#A78BFA",bold:false}]:[]),
    ...(showMEP&&cd.mep100?[{key:"mep",data:cd.mep100,color:"#F472B6",bold:false}]:[]),
    ...(showUVA&&cd.uva100?[{key:"uva",data:cd.uva100,color:"#FB923C",bold:false}]:[]),
    ...(showCER&&cd.cer100?[{key:"cer",data:cd.cer100,color:"#A3E635",bold:false}]:[]),
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
          <span style={{fontSize:window.innerWidth<768?14:10,color:"var(--green)"}}>— Portfolio</span>
          {/* Benchmarks toggleables */}
          {cd?.spy100&&<button onClick={()=>setShowSP(v=>!v)}
            style={{padding:"2px 8px",borderRadius:5,border:"1px solid rgba(96,165,250,0.4)",cursor:"pointer",fontSize:10,
              background:showSP?"rgba(96,165,250,0.15)":"transparent",color:showSP?"#60A5FA":"var(--text-muted)"}}>
            — S&P 500
          </button>}
          {cd?.ccl100&&<button onClick={()=>setShowCCL(v=>!v)}
            style={{padding:"2px 8px",borderRadius:5,border:"1px solid rgba(167,139,250,0.4)",cursor:"pointer",fontSize:10,
              background:showCCL?"rgba(167,139,250,0.15)":"transparent",color:showCCL?"#A78BFA":"var(--text-muted)"}}>
            — CCL
          </button>}
          {cd?.mep100&&<button onClick={()=>setShowMEP(v=>!v)}
            style={{padding:"2px 8px",borderRadius:5,border:"1px solid rgba(244,114,182,0.4)",cursor:"pointer",fontSize:10,
              background:showMEP?"rgba(244,114,182,0.15)":"transparent",color:showMEP?"#F472B6":"var(--text-muted)"}}>
            — MEP
          </button>}
          {cd?.currency!=="ARS"&&cd?.t10y100&&showSP&&<span style={{fontSize:10,color:"var(--yellow)"}}>— T10Y</span>}
          {/* UVA y CER — solo en ARS */}
          {currency==="ARS"&&<>
            <span style={{display:"flex",alignItems:"center",gap:2}}>
              <button onClick={()=>setShowUVA(v=>!v)}
                style={{padding:"2px 8px",borderRadius:5,border:"1px solid rgba(251,146,60,0.4)",cursor:"pointer",fontSize:10,
                  background:showUVA?"rgba(251,146,60,0.2)":"transparent",color:showUVA?"#FB923C":"var(--text-muted)"}}>
                — UVA
              </button>
              {showUVA&&<>
                <span style={{fontSize:10,color:"#FB923C"}}>+</span>
                <input type="number" min="0" max="20" step="0.1" value={uvaTasa}
                  onChange={e=>{setUvaTasa(parseFloat(e.target.value)||0); const p=PERIODS.find(x=>x.key===period); if(p)setTimeout(()=>load(p,historicos,scrubStart,scrubEnd),50);}}
                  style={{width:42,background:"var(--bg-input)",border:"1px solid rgba(251,146,60,0.4)",borderRadius:4,padding:"1px 4px",color:"#FB923C",fontSize:10,textAlign:"center"}}/>
                <span style={{fontSize:10,color:"#FB923C"}}>% anual</span>
              </>}
            </span>
            <button onClick={()=>setShowCER(v=>!v)}
              style={{padding:"2px 8px",borderRadius:5,border:"1px solid rgba(163,230,53,0.4)",cursor:"pointer",fontSize:10,
                background:showCER?"rgba(163,230,53,0.15)":"transparent",color:showCER?"#A3E635":"var(--text-muted)"}}>
              — CER
            </button>
          </>}
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
      {xirrData&&(()=>{
        const{portXIRR,spyXIRR,alpha}=xirrData;
        const fXP=v=>v!=null?(v>=0?"+":"")+v.toFixed(1)+"%":"—";
        const pcX=v=>v>=0?"var(--green)":"var(--red)";
        const pillX=(l,v,col,bg,bd)=>(<div key={l} style={{display:"inline-flex",alignItems:"center",gap:isModal?8:5,background:bg,padding:isModal?"5px 14px":"3px 10px",borderRadius:8,border:"1px solid "+bd}}><span style={{fontSize:isModal?11:9,color:"var(--text-muted)",fontWeight:500}}>{l}</span><span style={{fontSize:isModal?16:12,fontWeight:700,color:col,fontFamily:"monospace"}}>{fXP(v)}</span></div>);
        return(
          <div style={{display:"flex",alignItems:"center",gap:isModal?14:8,marginTop:isModal?10:6,paddingTop:isModal?10:6,borderTop:"1px solid var(--border)",flexWrap:"wrap"}}>
            <span style={{fontSize:isModal?10:8,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700}}>XIRR</span>
            {portXIRR!=null&&pillX("Portfolio",portXIRR,pcX(portXIRR),portXIRR>=0?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",portXIRR>=0?"rgba(16,185,129,0.25)":"rgba(239,68,68,0.25)")}
            {spyXIRR!=null&&pillX("S&P 500",spyXIRR,"#60A5FA","rgba(96,165,250,0.1)","rgba(96,165,250,0.25)")}
            {alpha!=null&&pillX("Alpha",alpha,pcX(alpha),alpha>=0?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",alpha>=0?"rgba(16,185,129,0.25)":"rgba(239,68,68,0.25)")}
            <span style={{fontSize:isModal?9:7,color:"var(--text-muted)",marginLeft:"auto"}}>anualizado</span>
          </div>
        );
      })()}
      {periodPnL&&(()=>{const{portPnL,spPnL,sym}=periodPnL;const fN=n=>{const a=Math.abs(n);return(n>=0?"+":"\u2212")+sym+(a>=1e6?(a/1e6).toFixed(1)+"M":a>=1e3?Math.round(a).toLocaleString("es-AR"):a.toFixed(0));};const pcc=n=>n>=0?"var(--green)":"var(--red)";const pill=(l,v,col)=>{const bg=col==="#60A5FA"?"rgba(96,165,250,0.1)":v>=0?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)";const bd=col==="#60A5FA"?"rgba(96,165,250,0.25)":v>=0?"rgba(16,185,129,0.25)":"rgba(239,68,68,0.25)";return(<div key={l} style={{display:"inline-flex",alignItems:"center",gap:isModal?8:5,background:bg,padding:isModal?"5px 14px":"3px 10px",borderRadius:8,border:"1px solid "+bd}}><span style={{fontSize:isModal?11:9,color:"var(--text-muted)",fontWeight:500}}>{l}</span><span style={{fontSize:isModal?16:12,fontWeight:700,color:col,fontFamily:"monospace"}}>{fN(v)}</span></div>);};return(<div style={{display:"flex",alignItems:"center",gap:isModal?14:8,marginTop:isModal?10:6,paddingTop:isModal?10:6,borderTop:"1px solid var(--border)",flexWrap:"wrap"}}><span style={{fontSize:isModal?10:8,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700}}>P&L</span>{pill("Portfolio",portPnL,pcc(portPnL))}{spPnL!=null&&pill("S&P 500",spPnL,"#60A5FA")}</div>);})()}

    </div>
  );
} 

function App(){
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

    const [port,setPort]         = useState(()=>{ try{ const s=localStorage.getItem("gal_port_v1"); if(s) return JSON.parse(s); }catch{} return GALICIA_PORTFOLIO; });
  const [trades,setTrades]     = useState(()=>{ try{ const s=localStorage.getItem("gal_trades_v3"); if(s) return JSON.parse(s); }catch{} return SEED_TRADES; });
  const [bondFlows,setBondFlows] = useState(()=>{ try{ const s=localStorage.getItem("gal_bond_flows_v1"); if(s) return {...SEED_BOND_FLOWS,...JSON.parse(s)}; }catch{} return SEED_BOND_FLOWS; });
  const [storageReady,setStorageReady] = useState(false);
  const [syncChecked,setSyncChecked] = useState(false);
  const [historicos,setHistoricos] = useState(null);

  // Cargar históricos desde JSON generado por GitHub Actions
  useEffect(()=>{
    fetch("/historicos.json")
      .then(r=>r.ok?r.text():null)
      .then(t=>{if(!t)return null;try{return JSON.parse(t.replace(/\bNaN\b/g,"null"));}catch(e){console.error("historicos.json parse error:",e);return null;}})
      .then(d=>{ if(d && Object.keys(d).length>1) setHistoricos(d); })
      .catch(e=>{console.error("historicos.json fetch error:",e);});
  },[]);
  const isMobile = useIsMobile();
  const [tab,setTab]           = useState(()=>{try{return localStorage.getItem("gal_tab")||"dashboard";}catch{return "dashboard";}});
  const [visitedTabs, setVisitedTabs] = useState(()=>{const t=localStorage.getItem("gal_tab")||"dashboard";return new Set(["dashboard",t]);});
  const handleTabChange = (t) => { setTab(t); setVisitedTabs(prev=>new Set([...prev,t])); };
  React.useEffect(()=>{try{localStorage.setItem("gal_tab",tab);}catch{};},[tab]);
  const [modal,setModal]       = useState(null);
  const [bondWizard,setBondWizard] = useState(null); // {ticker, onConfirm}
  const [ventaResult,setVentaResult] = useState(null);
  const [fx,setFx]             = useState("CCL");
  const [liveFX,setLiveFX]     = useState(FX_FALLBACK);
  const [livePrices,setLivePrices] = useState({});
  const [liveT10Y,setLiveT10Y] = useState(TASA10Y_FALLBACK);
  const [liveSP500,setLiveSP500] = useState(null);
  const [liveSP500DayPct,setLiveSP500DayPct] = useState(null);
  const [priceStatus,setPriceStatus] = useState("idle");
  const [lastRefresh,setLastRefresh] = useState(null);
  const [countdown,setCountdown]   = useState(300);

  // countdown movido a CountdownDisplay component — no re-renderiza el App

  // ── GitHub Sync ──────────────────────────────────────────────────────────
  const REPO = "MoloMolinaCa/mi-portfolio";
  const DATA_FILE = "public/portfolio_data.json";
  const [syncStatus, setSyncStatus] = useState("idle"); // idle|loading|saving|error
  const [ghSha, setGhSha] = useState(null); // SHA del archivo en GitHub para updates

  // GitHub data se carga via /api/sync (unica fuente de verdad)

  // Guardar datos via /api/sync (Vercel serverless — token seguro en servidor)
  const saveToGitHub = async (newPort, newTrades, newFlows, newMeta) => {
    try{
      setSyncStatus("saving");
      const deviceId = localStorage.getItem('gal_device_id')||'unknown';
      const res = await fetch('/api/sync', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          port: newPort, trades: newTrades,
          bondFlowsDelta: newFlows||{}, bondMeta: newMeta||{},
          sha: ghSha, deviceId
        })
      });
      if(res.ok){
        const d = await res.json();
        if(d.sha) setGhSha(d.sha);
        localStorage.setItem('gal_last_save', Date.now().toString());
        setSyncStatus("idle");
      } else if(res.status===409){
        // SHA desactualizado — refrescar y reintentar una vez
        try{
          const r2 = await fetch('/api/sync');
          if(r2.ok){ const d2=await r2.json(); setGhSha(d2.sha); }
        }catch{}
        setSyncStatus("idle"); // reintentar en el próximo save
      } else {
        console.warn("Sync save error:", res.status);
        setSyncStatus("error");
      }
    }catch(e){
      console.warn("Sync save error:", e);
      setSyncStatus("error");
    }
  };

  // ── Storage ───────────────────────────────────────────────────────────────
  const [bondMetaFromGH, setBondMetaFromGH] = useState(null);
  useEffect(()=>{
    // 0. Generar device ID único para este dispositivo
    if(!localStorage.getItem('gal_device_id')){
      localStorage.setItem('gal_device_id', Math.random().toString(36).slice(2)+Date.now().toString(36));
    }

    // 1. Cargar localStorage inmediatamente (siempre)

    try{
      const sp=localStorage.getItem("gal_port_v1");
      const st=localStorage.getItem("gal_trades_v3");
      if(sp) setPort(JSON.parse(sp));
      if(st) setTrades(JSON.parse(st));
      const bf=localStorage.getItem('gal_bond_flows_v1');
      if(bf){
        const saved=JSON.parse(bf);
        const merged={...SEED_BOND_FLOWS,...saved};
        setBondFlows(merged);
      }
    }catch{}
    setStorageReady(true);

    // 2. Cargar desde /api/sync — SOLO si localStorage está vacío (dispositivo nuevo)
    const localPortData = localStorage.getItem("gal_port_v1");
    const localTradesData = localStorage.getItem("gal_trades_v3");
    const localHasData = localPortData && JSON.parse(localPortData||'[]').length > 0;

    // Cargar desde GitHub y aplicar si es de otro dispositivo o no hay datos locales
    setSyncStatus("loading");
    fetch('/api/sync')
      .then(r=>r.ok?r.json():null)
      .then(data=>{
        if(!data){ setSyncChecked(true); setSyncStatus("idle"); return; }
        if(data.sha) setGhSha(data.sha);
        const myDeviceId = localStorage.getItem('gal_device_id');
        const ghDeviceId = data.deviceId;
        const localTs = parseInt(localStorage.getItem('gal_last_save')||'0');
        const ghTs = new Date(data.updatedAt||0).getTime();
        // Aplicar si: no tengo datos locales, O si GitHub es más nuevo Y fue otro dispositivo
        const shouldApply = true;
        if(shouldApply){
          isLoadingFromGH.current = true;
          if(data.port?.length)   setPort(data.port);
          if(data.trades?.length) setTrades(data.trades);
          if(data.bondFlowsDelta && Object.keys(data.bondFlowsDelta).length){
            setBondFlows(expandBondFlowsDelta(data.bondFlowsDelta));
          } else if(data.bondFlows && Object.keys(data.bondFlows).length){
            setBondFlows(expandBondFlowsDelta(computeBondFlowsDelta({...SEED_BOND_FLOWS,...data.bondFlows})));
          }
          localStorage.setItem('gal_last_save', ghTs.toString());
          setTimeout(()=>{ isLoadingFromGH.current = false; }, 500);
        }
        setSyncChecked(true);
        setSyncStatus("idle");
        // Si GitHub no tiene datos pero hay datos locales -> guardar inmediatamente
        if(!data.port?.length && !data.trades?.length) {
          try {
            const lp=JSON.parse(localStorage.getItem("gal_port_v1")||"[]");
            const lt=JSON.parse(localStorage.getItem("gal_trades_v3")||"[]");
            const lf=JSON.parse(localStorage.getItem("gal_bond_flows_v1")||"{}");
            const lm=JSON.parse(localStorage.getItem("gal_bond_meta_v1")||"{}");
            if(lp.length>0||lt.length>0) {
              saveToGitHub(lp, lt, computeBondFlowsDelta({...SEED_BOND_FLOWS,...lf}), lm);
            }
          } catch{}
        }
      })
      .catch(()=>{ setSyncChecked(true); setSyncStatus("idle"); });
  },[]);

  // Guardar en localStorage + GitHub cuando cambian los datos
  const saveTimerRef = React.useRef(null);
  useEffect(()=>{
    if(!storageReady) return;
    try{ 
      localStorage.setItem("gal_port_v1",JSON.stringify(port));
    }catch{}
  },[port,storageReady]);

  useEffect(()=>{
    if(!storageReady) return;
    try{
      localStorage.setItem("gal_trades_v3",JSON.stringify(trades));
    }catch{}
  },[trades,storageReady]);

  useEffect(()=>{
    if(!storageReady) return;
    try{ 
      localStorage.setItem("gal_bond_flows_v1",JSON.stringify(bondFlows));
    }catch{}
  },[bondFlows,storageReady]);

  // Sync a GitHub con debounce de 2s — solo si hubo cambio local reciente
  const isLoadingFromGH = React.useRef(false); // true mientras se cargan datos de GitHub
  const lastSyncRef = React.useRef(0); // timestamp del último sync exitoso
  useEffect(()=>{
    if(!storageReady || !syncChecked) return;
    if(saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const saveTs = Date.now();
    saveTimerRef.current = setTimeout(()=>{
      // No guardar si estamos cargando datos desde GitHub
      if(isLoadingFromGH.current) return;
      // No sobreescribir GitHub si tenemos menos datos
      if(port.length===0 && trades.length===0) return;
      // Solo guardar si este save es más nuevo que el último sync
      if(saveTs < lastSyncRef.current) return;
      const meta = (() => { try{ return JSON.parse(localStorage.getItem('gal_bond_meta_v1')||'{}'); }catch{ return {}; } })();
      lastSyncRef.current = saveTs;
      saveToGitHub(port, trades, computeBondFlowsDelta(bondFlows), meta);
    }, 800);
    return ()=>{ if(saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  },[port, trades, bondFlows, storageReady, syncChecked]);

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
          if(price&&price>1000){
            setLiveSP500(price);
            const prev=meta?.chartPreviousClose||meta?.previousClose||null;
            if(prev&&prev>1000)setLiveSP500DayPct(parseFloat(((price-prev)/prev*100).toFixed(2)));
          }
        }
      }catch{}
      setLastRefresh(new Date());
      setPriceStatus(Object.keys(newPrices).length>0?"live":"partial");
    } catch { setPriceStatus("error"); }
  };

  // Refresh al cargar — esperar que localStorage esté listo
  useEffect(()=>{ if(storageReady){
      refreshPrices();
      const iv=setInterval(refreshPrices,5*60*1000);
      // Auto-sync cuando el usuario vuelve a la app (ej: cel)
      const onVisible=()=>{
        if(document.visibilityState==='visible'){if(isLoadingFromGH.current)return;
          fetch('/api/sync').then(r=>r.ok?r.json():null).then(data=>{
            if(!data) return;
            const localTs=parseInt(localStorage.getItem('gal_last_save')||'0');
            const ghTs=new Date(data.updatedAt||0).getTime();
            if(ghTs>localTs){
              isLoadingFromGH.current=true;
              if(data.port?.length) setPort(data.port);
              if(data.trades?.length) setTrades(data.trades);
              if(data.bondFlowsDelta&&Object.keys(data.bondFlowsDelta).length) setBondFlows(expandBondFlowsDelta(data.bondFlowsDelta)); else if(data.bondFlows&&Object.keys(data.bondFlows).length) setBondFlows(expandBondFlowsDelta(computeBondFlowsDelta({...SEED_BOND_FLOWS,...data.bondFlows})));
              localStorage.setItem('gal_last_save',ghTs.toString());
              setTimeout(()=>{isLoadingFromGH.current=false;},500);
            }
          }).catch(()=>{});
          refreshPrices();
        }
      };
      document.addEventListener('visibilitychange',onVisible);
      return()=>{clearInterval(iv);document.removeEventListener('visibilitychange',onVisible);};
    } },[storageReady]);

  // ── Portfolio calcs ───────────────────────────────────────────────────────
  const ppcByTicker = useMemo(()=>port.reduce((acc,t)=>{
    const buys = trades.filter(tr=>tr.ticker===t.ticker&&tr.tipo==="compra");
    if(!buys.length){ acc[t.ticker]=t.buyPrice; return acc; }
    const totalCost=buys.reduce((a,tr)=>a+tr.qty*tr.price,0);
    const totalQty =buys.reduce((a,tr)=>a+tr.qty,0);
    acc[t.ticker]=totalQty>0?totalCost/totalQty:t.buyPrice;
    return acc;
  },{}),[port,trades]);

  const today = todayAR();
  const en = useMemo(()=>port.map(h=>{
    const live=livePrices[h.ticker];
    const isBondH=h.type==="bono_ars"; // solo ARS cotiza por 100 laminas diferente al historico
    const livePrice=live?live.price:null;
    const histBars=historicos?.[h.ticker];
    const lastHistClose=histBars?.length?histBars[histBars.length-1].close:null;
    const currentPrice=livePrice??lastHistClose??h.currentPrice;
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
  }),[port,trades,livePrices,historicos,fxRate,ppcByTicker,today]);

  const enGrouped = useMemo(()=>Object.values(en.reduce((acc,h)=>{
    if(!acc[h.ticker]){acc[h.ticker]={...h};return acc;}
    const prev=acc[h.ticker];
    const totalQty=prev.qty+h.qty;
    const newPpc=(prev.ppc*prev.qty+h.ppc*h.qty)/totalQty;
    const merged={...prev,qty:totalQty,ppc:newPpc,valUSD:prev.valUSD+h.valUSD,costUSD:prev.costUSD+h.costUSD,pnlUSD:prev.pnlUSD+h.pnlUSD,isLive:prev.isLive||h.isLive};
    merged.pnlPct=merged.costUSD>0?(merged.pnlUSD/merged.costUSD)*100:0;
    acc[h.ticker]=merged;
    return acc;
  },{})),[en]);

  const {totUSD,totCost,totPnl,totPct} = useMemo(()=>{
    const totUSD=en.reduce((a,h)=>a+h.valUSD,0);
    const totCost=en.reduce((a,h)=>a+h.costUSD,0);
    const totPnl=totUSD-totCost;
    const totPct=totCost>0?(totPnl/totCost)*100:0;
    return {totUSD,totCost,totPnl,totPct};
  },[en]);

  // P&L realizado: suma de pnlAmt de todas las ventas ya ejecutadas
  // pnlAmt en ARS → convertir a USD usando CCL de la fecha de la venta
  const pnlRealizado = useMemo(()=>{
    const cclBars = historicos?.CCL||[];
    // Para cada venta, calcular P&L en USD comparando proceeds vs costo en USD
    // Evita el problema de convertir pnlAmt en moneda local con cantidades nominales enormes
    const cclCacheP={};
    const toUSDamt = (monto, currency, date) => {
      if(currency==="USD") return monto;
      if(cclCacheP[date]) return monto/cclCacheP[date];
      let lo=0,hi=cclBars.length-1,res=-1;
      while(lo<=hi){ const mid=(lo+hi)>>1; if(cclBars[mid].date<=date){res=mid;lo=mid+1;}else hi=mid-1; }
      const ccl = res>=0 ? cclBars[res].close : (cclBars.slice(-1)[0]?.close||1200);
      cclCacheP[date]=ccl;
      return monto/ccl;
    };
    const ventasTrades = trades.filter(t=>t.tipo==="venta");
    return ventasTrades.reduce((acc, venta)=>{
      const isBond = /\d/.test(venta.ticker);
      const qty    = venta.qty||0;
      const qtyF   = isBond ? qty/100 : qty;
      // Proceeds en USD
      const proceedsUSD = toUSDamt((venta.price||0)*qtyF, venta.currency||"ARS", venta.date);
      // Costo FIFO en USD: buscar lotes de compra anteriores
      const buyLots = trades
        .filter(t=>t.ticker===venta.ticker&&t.tipo==="compra"&&t.ts<venta.ts)
        .sort((a,b)=>a.ts-b.ts);
      let remaining=qty, costUSD=0;
      for(const lot of buyLots){
        if(remaining<=0) break;
        const used = Math.min(lot.qty, remaining);
        const lotQtyF = isBond ? used/100 : used;
        costUSD += toUSDamt((lot.price||0)*lotQtyF, lot.currency||"ARS", lot.date);
        remaining -= used;
      }
      return acc + proceedsUSD - costUSD;
    }, 0);
  },[trades, historicos]);

  const totPnlTotal = totPnl + pnlRealizado; // no realizado + realizado

  // TWR anualizado + P&L real por año
  const twrStats = useMemo(()=>{
    try{
    if(!historicos||!trades.length) return null;
    const cclBars  = historicos?.CCL||[];
    const mepBars  = historicos?.MEP||[];
    const livePricesMap = {};
    Object.entries(livePrices||{}).forEach(([t,p])=>{ livePricesMap[t]=p; });

    // tickerBars: todos los tickers que aparecen en trades (incluyendo vendidos)
    const allTradeTickers = [...new Set(trades.map(t=>t.ticker))];
    const tickerBars = {};
    allTradeTickers.forEach(ticker=>{
      if(historicos?.[ticker]) tickerBars[ticker]=historicos[ticker];
    });

    const firstDate = trades.map(t=>t.date).sort()[0];
    if(!firstDate) return null;
    const today = todayAR();

    // Construir serie TWR — usar solo fechas con datos reales para acelerar
    // (no necesitamos cada día del calendario, solo los días con barras de precio)
    const allDatesSet = new Set();
    allTradeTickers.forEach(ticker=>{
      (tickerBars[ticker]||[]).forEach(b=>{ if(b.date>=firstDate) allDatesSet.add(b.date); });
    });
    // Agregar fechas de trades (cash flows)
    trades.forEach(t=>allDatesSet.add(t.date));
    allDatesSet.add(today);
    const allDates = [...allDatesSet].sort();
    if(allDates.length<2) return null;

    const serie = calcTWR(allDates, trades, en, tickerBars, cclBars, mepBars, "USD_CCL", fxRate, {}, null, today);
    if(!serie||serie.length<2) return null;

    const first = serie[0]?.val||100;
    const last  = serie[serie.length-1]?.val||100;
    const twrTotal = (last/first) - 1;
    const dias = Math.max(1, Math.round((new Date(today)-new Date(firstDate))/(1000*60*60*24)));
    const twrAnual = (Math.pow(1+twrTotal, 365/dias) - 1) * 100;

    // Helper: convertir monto en moneda a USD usando CCL de esa fecha — bisección
    const cclCacheT={};
    const getCCLT=(date)=>{
      if(cclCacheT[date]) return cclCacheT[date];
      let lo=0,hi=cclBars.length-1,res=-1;
      while(lo<=hi){ const mid=(lo+hi)>>1; if(cclBars[mid].date<=date){res=mid;lo=mid+1;}else hi=mid-1; }
      const v = res>=0 ? cclBars[res].close : (cclBars.slice(-1)[0]?.close||1200);
      cclCacheT[date]=v; return v;
    };
    const toUSD = (monto, currency, date) => {
      if(currency==="USD") return monto;
      return monto / getCCLT(date);
    };

    // P&L por año: solo TWR % por año
    // El P&L en USD total lo calculamos desde pnlRealizado + totPnl (más confiable)
    const years = [...new Set(allDates.map(d=>d.slice(0,4)))];
    const byYear = {};

    // P&L realizado por año (ventas FIFO en USD, por año de la venta)
    const pnlRealizadoPorAnio = {};
    trades.filter(t=>t.tipo==="venta").forEach(t=>{
      const y = t.date.slice(0,4);
      const isBondT = /[0-9]/.test(t.ticker);
      const qty = t.qty||0;
      const qtyF = isBondT ? qty/100 : qty;
      const toUSDv = (monto, currency, date) => {
        if(currency==="USD") return monto;
        const bar = cclBars.filter(b=>b.date<=date).pop();
        return monto / (bar?.close||cclBars.slice(-1)[0]?.close||1200);
      };
      const proceedsUSD = toUSDv((t.price||0)*qtyF, t.currency||"ARS", t.date);
      const buyLots = trades
        .filter(b=>b.ticker===t.ticker&&b.tipo==="compra"&&b.ts<t.ts)
        .sort((a,b)=>a.ts-b.ts);
      let rem=qty, costUSD=0;
      for(const lot of buyLots){
        if(rem<=0) break;
        const used=Math.min(lot.qty,rem);
        const lqF=isBondT?used/100:used;
        costUSD+=toUSDv((lot.price||0)*lqF, lot.currency||"ARS", lot.date);
        rem-=used;
      }
      pnlRealizadoPorAnio[y] = (pnlRealizadoPorAnio[y]||0) + proceedsUSD - costUSD;
    });

    years.forEach(y=>{
      const yStart = y+"-01-01";
      const yEnd   = y+"-12-31" < today ? y+"-12-31" : today;

      const puntos = serie.filter(p=>p.date>=yStart&&p.date<=yEnd);
      if(!puntos.length) return;
      const twrInicio = puntos[0].val;
      const twrFin    = puntos[puntos.length-1].val;
      const rendAnio  = ((twrFin/twrInicio)-1)*100;

      // P&L USD del año = realizado en el año + cambio en valor de cartera
      // Para el año en curso: no realizado = totPnl (ya calculado fuera)
      // Para años cerrados: no realizado = 0 (todo fue realizado o rolado)
      const esAnioActual = y === today.slice(0,4);
      const realizadoAnio = pnlRealizadoPorAnio[y]||0;
      const noRealizadoAnio = esAnioActual ? totPnl : 0;
      const pnlAnio = realizadoAnio + noRealizadoAnio;

      byYear[y] = { rend: rendAnio, pnl: pnlAnio, twrInicio, twrFin };
    });

    return { twrTotal: twrTotal*100, twrAnual, dias, serie, byYear, firstDate };
    }catch(e){ console.error("twrStats error:",e); return null; }
  },[trades, en, historicos, fxRate]); // sin livePrices — no recalcular por cada precio

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
    // Fetch historicos on-demand para tickers nuevos (Yahoo + BYMA fallback)
    const existingHistTickers=Object.keys(historicos||{});
    const newTickers=allTickers.filter(t=>!existingHistTickers.includes(t));
    if(newTickers.length>0){
      (async()=>{
        const updated={...historicos};
        const now=Math.floor(Date.now()/1000);
        const twoYearsAgo=now-2*365*86400;
        for(const ticker of newTickers){
          let found=false;
          // 1. Intentar Yahoo (.BA y directo)
          try{
            for(const sym of [ticker+'.BA', ticker]){
              const r=await fetch(YAHOO_PROXY+'?symbol='+encodeURIComponent(sym)+'&range=2y&interval=1d',{signal:AbortSignal.timeout(8000)});
              if(!r.ok)continue;
              const d2=await r.json();
              const res2=d2?.chart?.result?.[0];
              if(!res2?.timestamp)continue;
              const ts=res2.timestamp;
              const closes=res2.indicators?.quote?.[0]?.close||[];
              const bars=[];
              for(let k=0;k<ts.length;k++){
                if(closes[k]==null)continue;
                const dt=new Date(ts[k]*1000);
                const dateStr=dt.toISOString().slice(0,10);
                bars.push({date:dateStr,close:parseFloat(closes[k].toFixed(4))});
              }
              if(bars.length>0){
                updated[ticker]=bars.sort((a,b)=>a.date.localeCompare(b.date));
                found=true; break;
              }
            }
          }catch{}
          // 2. Si Yahoo no tiene, intentar BYMA open data
          if(!found){
            const settlements=['24HS','48HS','CDO'];
            for(const sett of settlements){
              try{
                const bymaUrl='https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/chart/historical-series/history';
                const params=new URLSearchParams({symbol:ticker+' '+sett,resolution:'D',from:String(twoYearsAgo),to:String(now)});
                const r=await fetch(bymaUrl+'?'+params,{signal:AbortSignal.timeout(10000)});
                if(!r.ok)continue;
                const d3=await r.json();
                if(d3.s!=='ok'||!d3.t||!d3.c)continue;
                const bars=[];
                for(let k=0;k<d3.t.length;k++){
                  if(d3.c[k]==null)continue;
                  const dt=new Date(d3.t[k]*1000);
                  const dateStr=dt.toISOString().slice(0,10);
                  bars.push({date:dateStr,close:parseFloat(Number(d3.c[k]).toFixed(4))});
                }
                if(bars.length>0){
                  updated[ticker]=bars.sort((a,b)=>a.date.localeCompare(b.date));
                  found=true; break;
                }
              }catch{}
            }
          }
          if(!found) console.warn('No historical data found for '+ticker);
        }
        if(Object.keys(updated).length>Object.keys(historicos||{}).length){
          setHistoricos(updated);
        }
      })();
    }
        return newPort;
      });
      // portfolio_tickers.json se descarga manualmente desde el botón CSV
      // Si es bono/ON sin flujos cargados → disparar wizard
      const isBond = h.type==='bono_ars'||h.type==='bono_usd';
      const yaFlows = bondFlows[h.ticker.toUpperCase()]?.length > 0;
      if(isBond && !yaFlows){
        const tkr = h.ticker.toUpperCase();
        setTimeout(()=>setBondWizard({ticker:tkr}), 200);
      }
    } else if(h.operacion==="venta"){
      const sellQty=+h.qty; const sellPrice=+h.buyPrice;
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
        const spyBars = historicos?.sp500 || [];
        if(spyBars.length){
          const pb=findPrice(spyBars,buyDate), ps=findPrice(spyBars,sellDate);
          if(pb&&ps){result.sp500Pct=((ps-pb)/pb)*100;result.sources.sp500="historicos.json";}
        }

        const cclBars = historicos?.CCL || [];
        if(cclBars.length){
          const pb=findPrice(cclBars,buyDate), ps=findPrice(cclBars,sellDate);
          if(pb&&ps){result.cclPct=((ps-pb)/pb)*100;result.cclBuy=pb;result.cclSell=ps;result.sources.ccl="historicos.json";}
        }

        const mepBars = historicos?.MEP || [];
        if(mepBars.length){
          const pb=findPrice(mepBars,buyDate), ps=findPrice(mepBars,sellDate);
          if(pb&&ps){result.mepPct=((ps-pb)/pb)*100;result.sources.mep="historicos.json";}
        }

        // CER como proxy de inflación ARS
        const cerBars = historicos?.CER || [];
        if(cerBars.length){
          const pb=findPrice(cerBars,buyDate), ps=findPrice(cerBars,sellDate);
          if(pb&&ps){result.infArPct=((ps-pb)/pb)*100;result.sources.infAr="CER";}
        }

        setBenchmarkData(result);
      }catch{setBenchmarkData({loading:false,error:true,sources:{}});}
    })();
  },[ventaResult?.ticker,ventaResult?.buyDate,ventaResult?.sellDate]);

  const card={background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:14,boxShadow:"var(--card-glow)"};
  const [darkMode, setDarkMode] = useState(()=>{try{const v=localStorage.getItem("gal_dark");return v!==null?v==="true":true;}catch{return true;}});
  const [hideAmounts, setHideAmounts] = useState(()=>{try{return localStorage.getItem("gal_hide")==="true";}catch{return false;}});
  React.useEffect(()=>{try{localStorage.setItem("gal_dark",String(darkMode));}catch{};},[darkMode]);
  React.useEffect(()=>{try{localStorage.setItem("gal_hide",String(hideAmounts));}catch{};},[hideAmounts]);
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
        .fi{font-family:'DM Sans',system-ui,sans-serif;animation:fadeIn 0.3s ease;color:var(--text-primary);}
        .fi *{box-sizing:border-box;color:inherit;}
        .theme-dark{color:var(--text-primary);}
        .theme-light{color:var(--text-primary);}
        .fi .kpi-card{transition:box-shadow 0.2s,transform 0.2s;}
        .fi .kpi-card:hover{box-shadow:var(--card-hover-glow);transform:translateY(-1px);}
        .fi .nav-btn{transition:color 0.15s;}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:var(--bg)}
        ::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
        @media(max-width:768px){
          .fi table{font-size:11px;}
          .fi .kpi-grid{grid-template-columns:1fr 1fr!important;}
          .mobile-hide{display:none!important;}
          .mobile-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}
          .mobile-stack{flex-direction:column!important;}
          .mobile-full{width:100%!important;min-width:0!important;}
        }
      `}</style>

      <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--text-primary)",overflowX:"hidden",maxWidth:"100vw"}} className={darkMode?"theme-dark":"theme-light"}>
        {/* Header */}
        <div style={{background:"var(--bg-card)",borderBottom:"1px solid var(--border)",padding:isMobile?"8px 12px":"11px 24px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
              <div style={{width:28,height:28,flexShrink:0,borderRadius:8,background:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>📊</div>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700,fontSize:isMobile?13:15,color:"var(--title-color)",letterSpacing:"-0.3px"}}>Mi Portfolio</div>
                {!isMobile&&<div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:8}}>
                  <CountdownDisplay lastRefresh={lastRefresh} priceStatus={priceStatus} liveCount={liveCount} portLen={port.length}/>
                  {syncStatus==="saving"&&<span style={{color:"var(--yellow)"}}>↑ guardando...</span>}
                  {syncStatus==="error"&&<span style={{color:"var(--red)"}}>⚠ error de sync</span>}
                  {syncStatus==="loading"&&<span style={{color:"var(--text-muted)"}}>↓ cargando datos...</span>}
                </div>}
              </div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
              {!isMobile&&<div style={{display:"flex",flexDirection:"column",gap:1}}>
                <select value={fx} onChange={e=>setFx(e.target.value)} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 10px",color:"var(--text-secondary)",fontSize:12,cursor:"pointer"}}>
                  <option value="CCL">💵 CCL {fmtA(liveFX.CCL)}</option>
                  <option value="MEP">💵 MEP {fmtA(liveFX.MEP)}</option>
                  <option value="oficial">💵 Oficial {fmtA(liveFX.oficial)}</option>
                </select>
                <div style={{fontSize:9,color:"var(--text-muted)",textAlign:"center"}}>dólar de valuación</div>
              </div>}
              <button onClick={refreshPrices} disabled={priceStatus==="loading"} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 8px",color:"var(--text-secondary)",cursor:"pointer",fontSize:12}}>↻</button>
              {!isMobile&&<button onClick={downloadTrades} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,padding:"6px 10px",color:"var(--text-secondary)",cursor:"pointer",fontSize:13}}>⬇ CSV</button>}
              <button onClick={()=>setHideAmounts(h=>!h)}
                style={{background:hideAmounts?"rgba(37,99,235,0.15)":"var(--bg-card)",border:hideAmounts?"1px solid var(--accent)":"1px solid var(--border)",borderRadius:6,padding:"5px 8px",color:hideAmounts?"var(--accent)":"var(--text-secondary)",cursor:"pointer",fontSize:13}}>
                {hideAmounts?"🙈":"👁"}
              </button>
              <button onClick={()=>setDarkMode(d=>!d)}
                style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 8px",color:"var(--text-secondary)",cursor:"pointer",fontSize:13}}>
                {darkMode?"☀️":"🌙"}
              </button>
              <button onClick={()=>setModal("add")} style={{background:"var(--accent)",border:"none",borderRadius:6,padding:"6px 12px",color:"#fff",cursor:"pointer",fontSize:isMobile?12:13,fontWeight:600}}>+ Posición</button>
            </div>
          </div>
          {isMobile&&<div style={{marginTop:6,display:"flex",gap:8,alignItems:"center",justifyContent:"space-between"}}>
            <select value={fx} onChange={e=>setFx(e.target.value)} style={{background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:6,padding:"4px 8px",color:"var(--text-secondary)",fontSize:11,cursor:"pointer",flex:1}}>
              <option value="CCL">CCL {fmtA(liveFX.CCL)}</option>
              <option value="MEP">MEP {fmtA(liveFX.MEP)}</option>
              <option value="oficial">Oficial {fmtA(liveFX.oficial)}</option>
            </select>
            <span style={{fontSize:10,display:"flex",alignItems:"center",gap:6}}>
              <CountdownDisplay lastRefresh={lastRefresh} priceStatus={priceStatus} liveCount={liveCount} portLen={port.length}/>
              {syncStatus==="saving"&&<span style={{color:"var(--yellow)",fontSize:9}}>↑ sync</span>}
              {syncStatus==="error"&&<span style={{color:"var(--red)",fontSize:9}}>⚠ sync</span>}
              {syncStatus==="loading"&&<span style={{color:"var(--text-muted)",fontSize:9}}>↓ cargando</span>}
            </span>
            <button onClick={downloadTrades} style={{background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:6,padding:"4px 8px",color:"var(--text-secondary)",cursor:"pointer",fontSize:11}}>⬇ CSV</button>
          </div>}
        </div>

        {/* Nav */}
        <div style={{background:"var(--bg-card)",borderBottom:"1px solid var(--border)",padding:"0 12px",display:"flex",gap:0,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
          {[["dashboard","📊 Dashboard"],["portfolio","💼 Portfolio"],["analisis","🔍 Análisis"],["flujos","💸 Flujos"],["operaciones","📋 Operaciones"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>handleTabChange(id)} className="nav-btn"
              style={{padding:isMobile?"10px 12px":"13px 18px",background:"transparent",border:"none",
                borderBottom:tab===id?"2px solid var(--accent)":"2px solid transparent",
                color:tab===id?"var(--text-primary)":"var(--text-muted)",cursor:"pointer",
                fontSize:isMobile?12:13,fontWeight:tab===id?600:400,
                letterSpacing:tab===id?"-0.1px":0,whiteSpace:"nowrap",flexShrink:0}}>
              {isMobile?lbl.split(" ").slice(1).join(" "):lbl}
            </button>
          ))}
        </div>

        <div style={{padding:isMobile?"10px 12px":"22px 60px",maxWidth:"100%",boxSizing:"border-box",overflowX:"hidden"}}>
          {/* Notificación flujos pendientes */}
          {(()=>{
            const todayN=todayAR();
            if(!bondFlows||typeof bondFlows!=='object')return null;
            const bonos=port.filter(h=>h.type==='bono_ars'||h.type==='bono_usd');
            const pending=bonos.flatMap(b=>{
              const flows=bondFlows[b.ticker]||[];
              return flows.filter(f=>!f.cobrado&&f.date<=todayN).map(f=>({...f,ticker:b.ticker,name:b.name,currency:b.buyCurrency,qty:b.qty}));
            });
            if(!pending.length)return null;
            return(
              <div style={{marginBottom:16,display:'flex',flexDirection:'column',gap:8}}>
                {pending.map(f=>{
                  const total=f.monto*(f.qty/100);
                  return(
                    <div key={f.id} style={{background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.25)',borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:18}}>💰</span>
                        <div>
                          <span style={{fontWeight:700,color:'var(--yellow)',fontSize:13}}>{f.ticker}</span>
                          <span style={{color:'var(--text-secondary)',fontSize:12,marginLeft:8}}>{f.tipo==='amortizacion'?'Amortización':'Cupón'} · {f.date?.slice(8)+'/'+f.date?.slice(5,7)+'/'+f.date?.slice(0,4)}</span>
                          <span style={{color:'var(--text-primary)',fontWeight:700,fontSize:13,marginLeft:8,fontFamily:"'DM Mono',monospace"}}>
                            {f.currency==='USD'?'US$':'$'}{total.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})}
                          </span>
                        </div>
                      </div>
                      <button onClick={()=>{
                        setBondFlows(prev=>({...prev,[f.ticker]:(prev[f.ticker]||[]).map(x=>x.id===f.id?{...x,cobrado:true,fechaCobro:todayN}:x)}));
                      }} style={{background:'rgba(251,191,36,0.15)',border:'1px solid rgba(251,191,36,0.4)',borderRadius:6,padding:'5px 14px',color:'var(--yellow)',cursor:'pointer',fontSize:12,fontWeight:600,whiteSpace:'nowrap'}}>
                        ✓ Confirmar cobro
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}

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
                // Usar cambio real del ^GSPC (USD) si disponible, sino SPY CEDEAR como fallback
                const spyDayPct = liveSP500DayPct ?? en.find(x=>x.ticker==="SPY")?.liveChangePct ?? null;

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
                    icon:"📈", lbl:"TWR anualizado",
                    main:twrStats?fmtP(twrStats.twrAnual):fmtP(totPct),
                    sub:twrStats?fmtP(twrStats.twrTotal)+" total · "+twrStats.dias+"d":(hideAmounts?"••••":fmtU(totPnl)),
                    subLabel:twrStats?"Rendimiento acumulado":"No realizado",
                    mainColor:twrStats?pc(twrStats.twrAnual):pc(totPct),
                    trend:twrStats?twrStats.twrAnual:totPct,
                  },

                  {
                    icon:"📊", lbl:"Rendimiento del día",
                    main:fmtP(dayPct),
                    sub:hideAmounts?"••••":(dayPnlUSD>=0?"+":"")+fmtU(dayPnlUSD),spyBadge:spyDayPct,
                    subLabel:"P&L hoy USD",
                    mainColor:pc(dayPct),
                    trend:dayPct,
                  },
                ];
                // Próximo vencimiento de bonos
                const allBonds = port.filter(h=>h.type==='bono_ars'||h.type==='bono_usd');
                const proxVto = allBonds.flatMap(b=>{
                  const flows = (bondFlows[b.ticker]||[]);
                  return flows
                    .filter(f=>!f.cobrado && f.date>=todayKPI)
                    .map(f=>({ticker:b.ticker, date:f.date, currency:b.buyCurrency, qty:b.qty, monto:f.monto, tipo:f.tipo}));
                }).sort((a,b)=>a.date.localeCompare(b.date))[0];

                return(
                  <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr) auto",gap:isMobile?6:12,maxWidth:1100,alignItems:"stretch",width:"100%",paddingRight:isMobile?2:0}}>
                    {kpis.map(k=>(
                      <div key={k.lbl} className="kpi-card" style={{
                        ...card,
                        padding:isMobile?"10px 12px":"16px 20px",
                        position:"relative",
                        overflow:"hidden",
                        minWidth:0,
                        boxSizing:"border-box",
                        borderLeft:`3px solid ${k.mainColor==="var(--text-secondary)"?"var(--border)":k.mainColor}`,
                      }}>
                        {k.trend!=null&&<div style={{position:"absolute",inset:0,background:`${k.trend>=0?"rgba(52,211,153,":"rgba(248,113,113,"}0.04)`,pointerEvents:"none"}}/>}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                          <span style={{fontSize:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1.2,fontWeight:600}}>{k.lbl}</span>
                          <span style={{fontSize:13,lineHeight:1,opacity:0.7}}>{k.icon}</span>
                        </div>
                        <div style={{fontSize:isMobile?20:26,fontFamily:"'DM Sans',Georgia,serif",fontWeight:700,color:k.mainColor,lineHeight:1,marginBottom:8,letterSpacing:"-0.5px"}}>
                          {k.main}
                        </div>
                        <div style={{display:"flex",alignItems:"baseline",gap:4,flexWrap:"wrap"}}>
                          <span style={{fontSize:k.bigSub?(isMobile?12:15):(isMobile?10:12),color:k.trend!=null?pc(k.trend):"var(--text-secondary)",fontWeight:k.bigSub?600:k.trend!=null?600:400}}>{k.sub}</span>
                          {k.subLabel&&!isMobile&&<span style={{fontSize:8,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.8,marginLeft:3}}>{k.subLabel}</span>}
                          {k.spyBadge!=null&&<span style={{background:"#2563eb",color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600,marginLeft:6}}>S&P {k.spyBadge>=0?"+":""}{k.spyBadge.toFixed(2)}%</span>}
                        </div>
                      </div>
                    ))}
                  {proxVto&&(
                    <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderLeft:"3px solid var(--yellow)",borderRadius:10,padding:"16px 20px",display:"flex",flexDirection:"column",justifyContent:"center",gap:6,minWidth:160}}>
                      <span style={{fontSize:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1.2,fontWeight:600}}>Próx. vencimiento</span>
                      <span style={{fontSize:20,fontWeight:700,color:"var(--yellow)",fontFamily:"'DM Mono',monospace"}}>{proxVto.ticker}</span>
                      <span style={{fontSize:13,color:"var(--text-secondary)",fontFamily:"'DM Mono',monospace"}}>{proxVto.date.slice(8)+'/'+proxVto.date.slice(5,7)+'/'+proxVto.date.slice(0,4)}</span>
                      <span style={{fontSize:11,color:"var(--text-muted)"}}>{Math.round((new Date(proxVto.date)-new Date(todayKPI))/(1000*60*60*24))} días</span>
                    </div>
                  )}
                  </div>
                );
              })()}

              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"220px 1fr",gap:14,alignItems:"stretch"}}>
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
                  <div style={{height:window.innerWidth<768?340:410}}>
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

              <DayMoversWidget en={enGrouped} historicos={historicos} fxRate={fxRate} livePrices={livePrices} card={card} hideAmounts={hideAmounts}/>

              {/* Rendimiento por año */}
              {twrStats&&Object.keys(twrStats.byYear||{}).length>0&&(()=>{
                try{
                const entries = Object.entries(twrStats.byYear).sort(([a],[b])=>a.localeCompare(b));
                const maxAbs  = Math.max(...entries.map(([,d])=>Math.abs(d.rend)), 1);
                const BAR_MAX = 80; // px altura máxima de barra
                return(
                <div style={{...card,padding:"20px 24px"}}>
                  {/* Header */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:600,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Rendimiento anual · TWR</div>
                      <div style={{fontSize:10,color:"var(--text-muted)",marginTop:2,opacity:0.7}}>Incluye activos ya vendidos · punta a punta por año calendario</div>
                    </div>
                    <div style={{display:"flex",gap:20,alignItems:"center"}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.8}}>TWR anualizado</div>
                        <div style={{fontSize:18,fontWeight:700,color:pc(twrStats.twrAnual),fontFamily:"'DM Mono',monospace"}}>
                          {twrStats.twrAnual>=0?"+":""}{twrStats.twrAnual.toFixed(1)}%<span style={{fontSize:11,fontWeight:400,opacity:0.6}}>/año</span>
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.8}}>Acumulado</div>
                        <div style={{fontSize:18,fontWeight:700,color:pc(twrStats.twrTotal),fontFamily:"'DM Mono',monospace"}}>
                          {twrStats.twrTotal>=0?"+":""}{twrStats.twrTotal.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Layout: barras a la izquierda, panel total a la derecha */}
                  <div style={{display:"flex",gap:20,alignItems:"stretch"}}>

                    {/* Barras por año */}
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:0,alignItems:"flex-end",borderBottom:"1px solid var(--border)"}}>
                        {entries.map(([year,data],i)=>{
                          const isPos = data.rend>=0;
                          const barH  = Math.max(3, Math.abs(data.rend)/maxAbs*BAR_MAX);
                          const color = isPos?"var(--green)":"var(--red)";
                          const isLast = i===entries.length-1;
                          return(
                            <div key={year} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                              borderRight:isLast?"none":"1px solid rgba(255,255,255,0.04)",padding:"0 16px 0"}}>
                              <div style={{fontSize:14,fontWeight:700,color,marginBottom:3,fontFamily:"'DM Mono',monospace"}}>
                                {isPos?"+":""}{data.rend.toFixed(1)}%
                              </div>
                              <div style={{fontSize:11,fontWeight:600,color:data.pnl>=0?"var(--green)":"var(--red)",marginBottom:10,fontFamily:"'DM Mono',monospace"}}>
                                {hideAmounts?"••••":(data.pnl>=0?"+":"")+fmtU(data.pnl,0)}
                              </div>
                              <div style={{width:28,height:barH,background:color,borderRadius:"3px 3px 0 0",opacity:0.8,transition:"height 0.5s ease"}}/>
                            </div>
                          );
                        })}
                      </div>
                      {/* Años debajo */}
                      <div style={{display:"flex",gap:0}}>
                        {entries.map(([year,,],i)=>(
                          <div key={year} style={{flex:1,textAlign:"center",padding:"7px 0",
                            borderRight:i===entries.length-1?"none":"1px solid rgba(255,255,255,0.04)"}}>
                            <span style={{fontSize:12,fontWeight:600,color:"var(--text-secondary)"}}>{year}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Panel total — a la derecha, mismo alto que las barras */}
                    <div style={{background:"var(--bg-input)",borderRadius:10,padding:"16px 20px",minWidth:180,display:"flex",flexDirection:"column",justifyContent:"space-between",flexShrink:0}}>
                      <div>
                        <div style={{fontSize:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.8,marginBottom:6}}>P&L total acumulado</div>
                        <div style={{fontSize:30,fontWeight:700,color:pc(totPnlTotal),fontFamily:"'DM Mono',monospace",lineHeight:1.1}}>
                          {hideAmounts?"••••":(totPnlTotal>=0?"+":"")+fmtU(totPnlTotal,0)}
                        </div>
                      </div>
                      <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:6}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:10,color:"var(--text-muted)"}}>Realizado</span>
                          <span style={{fontSize:12,fontWeight:600,color:pc(pnlRealizado),fontFamily:"'DM Mono',monospace"}}>
                            {hideAmounts?"••••":(pnlRealizado>=0?"+":"")+fmtU(pnlRealizado,0)}
                          </span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:10,color:"var(--text-muted)"}}>No realizado</span>
                          <span style={{fontSize:12,fontWeight:600,color:pc(totPnl),fontFamily:"'DM Mono',monospace"}}>
                            {hideAmounts?"••••":(totPnl>=0?"+":"")+fmtU(totPnl,0)}
                          </span>
                        </div>
                        <div style={{borderTop:"1px solid var(--border)",paddingTop:6,marginTop:2,fontSize:10,color:"var(--text-muted)"}}>
                          {twrStats.dias} días de historia
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                );
                }catch(e){ return <div style={{color:"var(--red)",fontSize:11,padding:8}}>Error cargando rendimiento anual</div>; }
              })()}

              {/* Top/Bottom 5 del día en Dashboard */}




            </div>
          )}

          {/* PORTFOLIO */}
          {tab==="portfolio"&&(
            <PortfolioTab byType={byType} en={enGrouped} totUSD={totUSD} totCost={totCost}
              totPnl={totPnl} totPct={totPct} fxRate={fxRate} fxMode={fx}
              setModal={setModal} del={del} card={card} hideAmounts={hideAmounts}
              trades={trades} historicos={historicos} isMobile={isMobile}/>
          )}

          {/* ANÁLISIS */}
          {tab==="analisis"&&visitedTabs.has("analisis")&&(
            <AnalisisTab en={enGrouped} historicos={historicos} fxRate={fxRate} currency={fx} card={card} livePrices={livePrices} hideAmounts={hideAmounts} trades={trades} isMobile={isMobile}/>
          )}

          {/* OPERACIONES */}
          {tab==="operaciones"&&visitedTabs.has("operaciones")&&(
            <OperacionesTab trades={trades} port={port} setTrades={setTrades} setPort={setPort} card={card} livePrices={livePrices} darkMode={darkMode}/>
          )}
          {tab==="flujos"&&visitedTabs.has("flujos")&&(
            <FlujoTab port={port} trades={trades} bondFlows={bondFlows} setBondFlows={setBondFlows} card={card} fxRate={fxRate} historicos={historicos} isMobile={isMobile}/>
          )}

        </div>
      </div>

      {/* Venta result modal */}
      {ventaResult&&(
        <div className={darkMode?"theme-dark":"theme-light"} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
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
              const isCurrencyARS = ventaResult.currency==="ARS";
              const benchmarks=[
                {label:"Tu operación",val:ventaResult.pnlPct,color:ventaResult.pnlPct>=0?"var(--green)":"var(--red)",bold:true},
                // T10Y: solo USD
                ...(!isCurrencyARS?[{label:"Treasury 10Y ("+liveT10Y+"%)",val:t10yPeriod,color:"var(--yellow)"}]:[]),
                // S&P 500: solo USD
                ...(!isCurrencyARS?[{label:"S&P 500",val:bd?.sp500Pct??null,color:"#60A5FA"}]:[]),
                // CCL y MEP: siempre (son benchmarks útiles en ambas monedas)
                {label:"Dólar CCL",val:bd?.cclPct??null,color:"#A78BFA"},
                {label:"Dólar MEP",val:bd?.mepPct??null,color:"#818CF8"},
                // CER (inflación ARS): siempre
                {label:"Inflación ARS (CER)",val:bd?.infArPct??null,color:"#F97316"},
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

      {modal&&<Modal h={modal==="add"?null:modal} port={port} onSave={saveOrDelete} onClose={()=>setModal(null)} darkMode={darkMode}/>}
      {bondWizard&&(
        <BondWizard
          ticker={bondWizard.ticker}
          darkMode={darkMode}
          onConfirm={(flows, meta)=>{
            setBondFlows(prev=>({...prev,[bondWizard.ticker]:flows}));
            if(meta){
              // bondMeta vive en FlujoTab — actualizar localStorage para que lo levante
              try{
                const saved = localStorage.getItem('gal_bond_meta_v1');
                const cur = saved ? JSON.parse(saved) : {};
                cur[bondWizard.ticker] = {tna:meta.tna, base:meta.base, emisionDate:meta.emisionDate||null};
                localStorage.setItem('gal_bond_meta_v1', JSON.stringify(cur));
              }catch{}
            }
            setBondWizard(null);
          }}
          onSkip={()=>setBondWizard(null)}
        />
      )}
    </>
  );
}

export default App;

