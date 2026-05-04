/* eslint-disable */
import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from "react";

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
const TASA10Y_FALLBACK = 4.35;
// CER: se carga desde historicos.json (update_historicos.py lo descarga con el token del servidor)
const YAHOO_PROXY = "https://yahoo-proxy-blue.vercel.app/api/yahoo"; // proxy sin CORS

const fmtU = (n,d=0) => new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:d}).format(n);
const fmtA = (n) => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
const fmtP = (n) => `${n>=0?"+":""}${n.toFixed(2)}%`;
const pc   = (n) => n>=0?"var(--green)":"var(--red)";
// Fecha de hoy en horario Argentina (UTC-3)
function todayAR() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset() - 180);
  return d.toISOString().slice(0,10);
}

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

// ── Flujos de bonos preconfigurados ─────────────────────────────────────────
// monto = % del VN según prospecto (por cada 100 VN nominales)
// adjustsBy: variable que ajusta el capital/cupón ('CER', 'CER+TNA', null)
const SEED_BOND_META = {
  "TZXD6": {adjustsBy:"CER", emisionDate:"2022-03-15", cerBase:null, desc:"BONTES a Descuento CER V15/12/26 · Cupón 0% + ajuste CER · Ley Argentina"},
  "TZX27": {adjustsBy:"CER", emisionDate:"2022-12-30", cerBase:null, desc:"BONO CER V30/06/27 · Cupón 2% s/VN ajustado · Ley Argentina"},
  "AO27D": {adjustsBy:null,  desc:"Bono Tesoro 6% V29/10/27 · Cupón mensual 6% anual base 30/360 · Bullet al vencimiento · Ley Nueva York"},
  "GD38D": {adjustsBy:null,  desc:"Global 2038 · Tasa escalonada hasta 5% anual · 22 cuotas de amort. (4.5455% c/u) desde jul/2027 · Ley Nueva York"},
  "TLCUD": {adjustsBy:null,  desc:"ON Telecom Argentina C28 05/03/29 · Cupón 7% anual (3.5% semestral) · Ley Argentina"},
  "GD29D": {adjustsBy:null, desc:"Global 2029 · 2% hasta ene/28, 2.5% hasta ene/30 · 8 cuotas amort. 12.5% desde jul/2026 · Ley Nueva York"},
  "GD30D": {adjustsBy:null, desc:"Global 2030 · 4.125% · 16 cuotas amort. 6.25% desde ene/2024 · Ley Nueva York"},
  "GD35D": {adjustsBy:null, desc:"Global 2035 · 3.625% bullet · Ley Nueva York"},
  "GD41D": {adjustsBy:null, desc:"Global 2041 · 4.875% · 20 cuotas amort. 5% desde ene/2027 · Ley Nueva York"},
  "AE38D": {adjustsBy:null, desc:"Argentina 2038 · 4.625% bullet · Ley Nueva York"},
  "AL29D": {adjustsBy:null, desc:"Bonar 2029 · 2% hasta ene/28, 2.5% hasta ene/30 · 8 cuotas amort. 12.5% desde jul/2026 · Ley Argentina"},
  "AL30D": {adjustsBy:null, desc:"Bonar 2030 · 4.125% · 16 cuotas amort. 6.25% desde ene/2024 · Ley Argentina"},
  "AL35D": {adjustsBy:null, desc:"Bonar 2035 · 3.625% bullet · Ley Argentina"},
  "AL41D": {adjustsBy:null, desc:"Bonar 2041 · 4.875% · 20 cuotas amort. 5% desde ene/2027 · Ley Argentina"},
};

const SEED_BOND_FLOWS = {
  "TZXD6": [
    // BONTES a Descuento CER: no paga cupones, ajusta capital por CER y paga todo al vencimiento
    {id:1001,date:"2026-12-15",tipo:"amortizacion",monto:100.0,cobrado:false,fechaCobro:null,fuente:"auto",nota:"100% VN ajustado CER"},
  ],
  "TZX27": [
    // Cupón 2% sobre VN ajustado por CER, semestral
    {id:1002,date:"2026-06-30",tipo:"cupon",        monto:1.0,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"1% s/VN ajustado CER"},
    {id:1003,date:"2026-12-31",tipo:"cupon",        monto:1.0,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"1% s/VN ajustado CER"},
    {id:1004,date:"2027-06-30",tipo:"cupon",        monto:1.0,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"1% s/VN ajustado CER"},
    {id:1005,date:"2027-06-30",tipo:"amortizacion", monto:100.0,cobrado:false,fechaCobro:null,fuente:"auto",nota:"Amort. 100% VN ajustado"},
  ],
  "AO27D": [
    // Bono Tesoro 6% V29/10/27 — cupón mensual, tasa 6% anual base 30/360
    // Amortización bullet al vencimiento (cupón 20 · 29/10/2027)
    // Cupón 1 (31/03/2026): cobrado. Cupón 2 en adelante: pendientes.
    {id:1006,date:"2026-03-31",tipo:"cupon",        monto:0.5667,cobrado:true, fechaCobro:"2026-03-31",fuente:"auto",nota:"días: 34 · 6%×34/360"},
    {id:1007,date:"2026-04-30",tipo:"cupon",        monto:0.5000,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 30 · 6%×30/360"},
    {id:1008,date:"2026-05-29",tipo:"cupon",        monto:0.4833,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 29 · 6%×29/360"},
    {id:1009,date:"2026-06-30",tipo:"cupon",        monto:0.5167,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 31 · 6%×31/360"},
    {id:1010,date:"2026-07-31",tipo:"cupon",        monto:0.5000,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 30 · 6%×30/360"},
    {id:1011,date:"2026-08-31",tipo:"cupon",        monto:0.5000,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 30 · 6%×30/360"},
    {id:1012,date:"2026-09-30",tipo:"cupon",        monto:0.5000,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 30 · 6%×30/360"},
    {id:1013,date:"2026-10-30",tipo:"cupon",        monto:0.5000,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 30 · 6%×30/360"},
    {id:1014,date:"2026-11-30",tipo:"cupon",        monto:0.5000,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 30 · 6%×30/360"},
    {id:1015,date:"2026-12-30",tipo:"cupon",        monto:0.5000,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 30 · 6%×30/360"},
    {id:1016,date:"2027-01-29",tipo:"cupon",        monto:0.4833,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 29 · 6%×29/360"},
    {id:1017,date:"2027-02-26",tipo:"cupon",        monto:0.4500,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 27 · 6%×27/360"},
    {id:1018,date:"2027-03-31",tipo:"cupon",        monto:0.5833,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 35 · 6%×35/360"},
    {id:1019,date:"2027-04-30",tipo:"cupon",        monto:0.5000,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 30 · 6%×30/360"},
    {id:1020,date:"2027-05-31",tipo:"cupon",        monto:0.5000,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 30 · 6%×30/360"},
    {id:1021,date:"2027-06-30",tipo:"cupon",        monto:0.5000,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 30 · 6%×30/360"},
    {id:1022,date:"2027-07-30",tipo:"cupon",        monto:0.5000,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 30 · 6%×30/360"},
    {id:1023,date:"2027-08-31",tipo:"cupon",        monto:0.5000,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 30 · 6%×30/360"},
    {id:1024,date:"2027-09-30",tipo:"cupon",        monto:0.5000,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 30 · 6%×30/360"},
    {id:1025,date:"2027-10-29",tipo:"cupon",        monto:0.4833,cobrado:false,fechaCobro:null,        fuente:"auto",nota:"días: 29 · 6%×29/360"},
    {id:1026,date:"2027-10-29",tipo:"amortizacion", monto:100.0, cobrado:false,fechaCobro:null,        fuente:"auto",nota:"Amort. 100% VN · bullet"},
  ],
  "GD38D": [
    // Global 2038 — Schedule completo del prospecto (fechas efectivas)
    // Tasa escalonada: 0.2125% (c11), 2% (c2-3), 3.875% (c4-5), 4.25% (c6-7), 5% (c8→)
    // Amortización: 22 cuotas de 4.5455% (1/22) semestral desde jul/2027 → ene/2038
    // Cupones 1-10 (2021-2025): ya cobrados antes de la posición actual
    // Cupón 11 (13/07/2026): próximo pendiente
    {id:1011,date:"2026-07-13",tipo:"cupon",        monto:2.5000,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% anual s/VN · c11"},
    {id:1012,date:"2027-01-11",tipo:"cupon",        monto:2.5000,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% anual s/VN · c12"},
    // Desde c13: amort 4.5455% (1/22) + interés s/VN residual
    {id:1013,date:"2027-07-12",tipo:"cupon",        monto:2.5000,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 100% · c13"},
    {id:1057,date:"2027-07-12",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 1/22"},
    {id:1014,date:"2028-01-10",tipo:"cupon",        monto:2.3864,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 95.45% · c14"},
    {id:1058,date:"2028-01-10",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 2/22"},
    {id:1015,date:"2028-07-10",tipo:"cupon",        monto:2.2727,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 90.91% · c15"},
    {id:1059,date:"2028-07-10",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 3/22"},
    {id:1016,date:"2029-01-09",tipo:"cupon",        monto:2.1591,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 86.36% · c16"},
    {id:1060,date:"2029-01-09",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 4/22"},
    {id:1017,date:"2029-07-10",tipo:"cupon",        monto:2.0455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 81.82% · c17"},
    {id:1061,date:"2029-07-10",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 5/22"},
    {id:1018,date:"2030-01-09",tipo:"cupon",        monto:1.9318,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 77.27% · c18"},
    {id:1062,date:"2030-01-09",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 6/22"},
    {id:1019,date:"2030-07-10",tipo:"cupon",        monto:1.8182,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 72.73% · c19"},
    {id:1063,date:"2030-07-10",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 7/22"},
    {id:1020,date:"2031-01-09",tipo:"cupon",        monto:1.7045,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 68.18% · c20"},
    {id:1064,date:"2031-01-09",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 8/22"},
    {id:1021,date:"2031-07-09",tipo:"cupon",        monto:1.5909,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 63.64% · c21"},
    {id:1065,date:"2031-07-09",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 9/22"},
    {id:1022,date:"2032-01-09",tipo:"cupon",        monto:1.4773,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 59.09% · c22"},
    {id:1066,date:"2032-01-09",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 10/22"},
    {id:1023,date:"2032-07-09",tipo:"cupon",        monto:1.3636,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 54.55% · c23"},
    {id:1067,date:"2032-07-09",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 11/22"},
    {id:1024,date:"2033-01-10",tipo:"cupon",        monto:1.2500,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 50.00% · c24"},
    {id:1068,date:"2033-01-10",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 12/22"},
    {id:1025,date:"2033-07-11",tipo:"cupon",        monto:1.1364,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 45.45% · c25"},
    {id:1069,date:"2033-07-11",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 13/22"},
    {id:1026,date:"2034-01-09",tipo:"cupon",        monto:1.0227,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 40.91% · c26"},
    {id:1070,date:"2034-01-09",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 14/22"},
    {id:1027,date:"2034-07-10",tipo:"cupon",        monto:0.9091,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 36.36% · c27"},
    {id:1071,date:"2034-07-10",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 15/22"},
    {id:1028,date:"2035-01-09",tipo:"cupon",        monto:0.7955,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 31.82% · c28"},
    {id:1072,date:"2035-01-09",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 16/22"},
    {id:1029,date:"2035-07-09",tipo:"cupon",        monto:0.6818,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 27.27% · c29"},
    {id:1073,date:"2035-07-09",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 17/22"},
    {id:1030,date:"2036-01-09",tipo:"cupon",        monto:0.5682,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 22.73% · c30"},
    {id:1074,date:"2036-01-09",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 18/22"},
    {id:1031,date:"2036-07-09",tipo:"cupon",        monto:0.4545,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 18.18% · c31"},
    {id:1075,date:"2036-07-09",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 19/22"},
    {id:1032,date:"2037-01-09",tipo:"cupon",        monto:0.3409,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 13.64% · c32"},
    {id:1076,date:"2037-01-09",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 20/22"},
    {id:1033,date:"2037-07-09",tipo:"cupon",        monto:0.2273,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 9.09% · c33"},
    {id:1077,date:"2037-07-09",tipo:"amortizacion", monto:4.5455,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5455% VN · cuota 21/22"},
    {id:1034,date:"2038-01-11",tipo:"cupon",        monto:0.1136,cobrado:false,fechaCobro:null,fuente:"auto",nota:"5% s/VN 4.55% · c34"},
    {id:1078,date:"2038-01-11",tipo:"amortizacion", monto:4.5454,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.5454% VN · cuota 22/22 (último)"},
  ],
  "TLCUD": [
    // ON Telecom 7% anual semestral
    {id:1030,date:"2026-09-05",tipo:"cupon",        monto:3.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.5% s/VN · 7% anual"},
    {id:1031,date:"2027-03-05",tipo:"cupon",        monto:3.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.5% s/VN · 7% anual"},
    {id:1032,date:"2027-09-05",tipo:"cupon",        monto:3.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.5% s/VN · 7% anual"},
    {id:1033,date:"2028-03-05",tipo:"cupon",        monto:3.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.5% s/VN · 7% anual"},
    {id:1034,date:"2028-09-05",tipo:"cupon",        monto:3.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.5% s/VN · 7% anual"},
    {id:1035,date:"2029-03-05",tipo:"cupon",        monto:3.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.5% s/VN · 7% anual"},
    {id:1036,date:"2029-03-05",tipo:"amortizacion", monto:100.0,cobrado:false,fechaCobro:null,fuente:"auto",nota:"Amort. 100% VN"},
  ],

  // ─── Soberanos Ley NY — Serie GD ──────────────────────────────────────────

  // GD29D — Global 2029 · 1% hasta jul/23, 2% hasta ene/28, 2.5% hasta ene/29
  // Amort: 8 cuotas de 12.5% desde jul/2027
  "GD29D": [
    {id:2001,date:"2026-07-09",tipo:"cupon",        monto:1.0,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"2% anual s/VN residual"},
    {id:2002,date:"2026-07-09",tipo:"amortizacion", monto:12.5, cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 1/8"},
    {id:2003,date:"2027-01-09",tipo:"cupon",        monto:1.09375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"2% anual s/VN residual 87.5"},
    {id:2004,date:"2027-01-09",tipo:"amortizacion", monto:12.5, cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 2/8"},
    {id:2005,date:"2027-07-09",tipo:"cupon",        monto:0.9375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"2% anual s/VN residual 75"},
    {id:2006,date:"2027-07-09",tipo:"amortizacion", monto:12.5, cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 3/8"},
    {id:2007,date:"2028-01-09",tipo:"cupon",        monto:0.9375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"2.5% anual s/VN residual 62.5"},
    {id:2008,date:"2028-01-09",tipo:"amortizacion", monto:12.5, cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 4/8"},
    {id:2009,date:"2028-07-09",tipo:"cupon",        monto:0.78125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"2.5% anual s/VN residual 50"},
    {id:2010,date:"2028-07-09",tipo:"amortizacion", monto:12.5, cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 5/8"},
    {id:2011,date:"2029-01-09",tipo:"cupon",        monto:0.625, cobrado:false,fechaCobro:null,fuente:"auto",nota:"2.5% anual s/VN residual 37.5"},
    {id:2012,date:"2029-01-09",tipo:"amortizacion", monto:12.5, cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 6/8"},
    {id:2013,date:"2029-07-09",tipo:"cupon",        monto:0.46875,cobrado:false,fechaCobro:null,fuente:"auto",nota:"2.5% anual s/VN residual 25"},
    {id:2014,date:"2029-07-09",tipo:"amortizacion", monto:12.5, cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 7/8"},
    {id:2015,date:"2030-01-09",tipo:"cupon",        monto:0.15625,cobrado:false,fechaCobro:null,fuente:"auto",nota:"2.5% anual s/VN residual 12.5"},
    {id:2016,date:"2030-01-09",tipo:"amortizacion", monto:12.5, cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 8/8"},
  ],

  // GD30D — Global 2030 · 0.125% hasta ene/23, escalonado hasta 4.125%
  // Amort: 16 cuotas de 6.25% desde jul/2024 — las primeras ya cobradas
  "GD30D": [
    {id:2020,date:"2026-07-09",tipo:"cupon",        monto:1.546875,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 75"},
    {id:2021,date:"2026-07-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 5/16"},
    {id:2022,date:"2027-01-09",tipo:"cupon",        monto:1.40625,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 68.75"},
    {id:2023,date:"2027-01-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 6/16"},
    {id:2024,date:"2027-07-09",tipo:"cupon",        monto:1.265625,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 62.5"},
    {id:2025,date:"2027-07-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 7/16"},
    {id:2026,date:"2028-01-09",tipo:"cupon",        monto:1.125,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 56.25"},
    {id:2027,date:"2028-01-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 8/16"},
    {id:2028,date:"2028-07-09",tipo:"cupon",        monto:0.984375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 50"},
    {id:2029,date:"2028-07-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 9/16"},
    {id:2030,date:"2029-01-09",tipo:"cupon",        monto:0.84375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 43.75"},
    {id:2031,date:"2029-01-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 10/16"},
    {id:2032,date:"2029-07-09",tipo:"cupon",        monto:0.703125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 37.5"},
    {id:2033,date:"2029-07-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 11/16"},
    {id:2034,date:"2030-01-09",tipo:"cupon",        monto:0.5625, cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 31.25"},
    {id:2035,date:"2030-01-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 12/16"},
    {id:2036,date:"2030-07-09",tipo:"cupon",        monto:0.421875,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 25"},
    {id:2037,date:"2030-07-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 13/16"},
    {id:2038,date:"2031-01-09",tipo:"cupon",        monto:0.28125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 18.75"},
    {id:2039,date:"2031-01-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 14/16"},
    {id:2040,date:"2031-07-09",tipo:"cupon",        monto:0.140625,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 12.5"},
    {id:2041,date:"2031-07-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 15/16"},
    {id:2042,date:"2032-01-09",tipo:"cupon",        monto:0.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 6.25"},
    {id:2043,date:"2032-01-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 16/16"},
  ],

  // GD35D — Global 2035 · 3.625% fijo · Bullet
  "GD35D": [
    {id:2050,date:"2026-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2051,date:"2027-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2052,date:"2027-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2053,date:"2028-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2054,date:"2028-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2055,date:"2029-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2056,date:"2029-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2057,date:"2030-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2058,date:"2030-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2059,date:"2031-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2060,date:"2031-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2061,date:"2032-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2062,date:"2032-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2063,date:"2033-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2064,date:"2033-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2065,date:"2034-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2066,date:"2034-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2067,date:"2035-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2068,date:"2035-01-09",tipo:"amortizacion", monto:100.0, cobrado:false,fechaCobro:null,fuente:"auto",nota:"Amort. bullet 100%"},
  ],

  // GD41D — Global 2041 · 4.875% · Amort 20 cuotas de 5% desde ene/2027
  "GD41D": [
    {id:2070,date:"2026-07-09",tipo:"cupon",        monto:2.4375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/100 VN"},
    {id:2071,date:"2027-01-09",tipo:"cupon",        monto:2.4375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/100 VN"},
    {id:2072,date:"2027-01-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 1/20"},
    {id:2073,date:"2027-07-09",tipo:"cupon",        monto:2.31563,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 95"},
    {id:2074,date:"2027-07-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 2/20"},
    {id:2075,date:"2028-01-09",tipo:"cupon",        monto:2.19375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 90"},
    {id:2076,date:"2028-01-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 3/20"},
    {id:2077,date:"2028-07-09",tipo:"cupon",        monto:2.07188,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 85"},
    {id:2078,date:"2028-07-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 4/20"},
    {id:2079,date:"2029-01-09",tipo:"cupon",        monto:1.95,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 80"},
    {id:2080,date:"2029-01-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 5/20"},
    {id:2081,date:"2029-07-09",tipo:"cupon",        monto:1.82813,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 75"},
    {id:2082,date:"2029-07-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 6/20"},
    {id:2083,date:"2030-01-09",tipo:"cupon",        monto:1.70625,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 70"},
    {id:2084,date:"2030-01-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 7/20"},
    {id:2085,date:"2030-07-09",tipo:"cupon",        monto:1.58438,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 65"},
    {id:2086,date:"2030-07-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 8/20"},
    {id:2087,date:"2031-01-09",tipo:"cupon",        monto:1.4625, cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 60"},
    {id:2088,date:"2031-01-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 9/20"},
    {id:2089,date:"2031-07-09",tipo:"cupon",        monto:1.34063,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 55"},
    {id:2090,date:"2031-07-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 10/20"},
    {id:2091,date:"2032-01-09",tipo:"cupon",        monto:1.21875,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 50"},
    {id:2092,date:"2032-01-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 11/20"},
    {id:2093,date:"2032-07-09",tipo:"cupon",        monto:1.09688,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 45"},
    {id:2094,date:"2032-07-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 12/20"},
    {id:2095,date:"2033-01-09",tipo:"cupon",        monto:0.975,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 40"},
    {id:2096,date:"2033-01-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 13/20"},
    {id:2097,date:"2033-07-09",tipo:"cupon",        monto:0.85313,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 35"},
    {id:2098,date:"2033-07-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 14/20"},
    {id:2099,date:"2034-01-09",tipo:"cupon",        monto:0.73125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 30"},
    {id:2100,date:"2034-01-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 15/20"},
    {id:2101,date:"2034-07-09",tipo:"cupon",        monto:0.60938,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 25"},
    {id:2102,date:"2034-07-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 16/20"},
    {id:2103,date:"2035-01-09",tipo:"cupon",        monto:0.4875, cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 20"},
    {id:2104,date:"2035-01-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 17/20"},
    {id:2105,date:"2035-07-09",tipo:"cupon",        monto:0.36563,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 15"},
    {id:2106,date:"2035-07-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 18/20"},
    {id:2107,date:"2036-01-09",tipo:"cupon",        monto:0.24375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 10"},
    {id:2108,date:"2036-01-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 19/20"},
    {id:2109,date:"2036-07-09",tipo:"cupon",        monto:0.12188,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 5"},
    {id:2110,date:"2036-07-09",tipo:"amortizacion", monto:5.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 20/20"},
  ],

  // AE38D — Global 2038 Ley NY · 4.625% · Bullet (mismo schedule que GD38D pero ley NY)
  "AE38D": [
    {id:2120,date:"2026-07-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2121,date:"2027-01-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2122,date:"2027-07-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2123,date:"2028-01-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2124,date:"2028-07-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2125,date:"2029-01-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2126,date:"2029-07-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2127,date:"2030-01-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2128,date:"2030-07-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2129,date:"2031-01-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2130,date:"2031-07-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2131,date:"2032-01-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2132,date:"2032-07-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2133,date:"2033-01-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2134,date:"2033-07-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2135,date:"2034-01-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2136,date:"2034-07-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2137,date:"2035-01-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2138,date:"2035-07-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2139,date:"2036-01-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2140,date:"2036-07-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2141,date:"2037-01-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2142,date:"2037-07-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2143,date:"2038-01-09",tipo:"cupon",        monto:2.3125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.625% s/100 VN"},
    {id:2144,date:"2038-01-09",tipo:"amortizacion", monto:100.0, cobrado:false,fechaCobro:null,fuente:"auto",nota:"Amort. bullet 100%"},
  ],

  // ─── Soberanos Ley AR — Serie AL ──────────────────────────────────────────
  // AL29 = mismo schedule que GD29 pero ley argentina
  "AL29D": [
    {id:2200,date:"2026-07-09",tipo:"cupon",        monto:1.0,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"2% anual s/VN residual"},
    {id:2201,date:"2026-07-09",tipo:"amortizacion", monto:12.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 1/8"},
    {id:2202,date:"2027-01-09",tipo:"cupon",        monto:1.09375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"2% anual s/VN residual 87.5"},
    {id:2203,date:"2027-01-09",tipo:"amortizacion", monto:12.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 2/8"},
    {id:2204,date:"2027-07-09",tipo:"cupon",        monto:0.9375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"2% anual s/VN residual 75"},
    {id:2205,date:"2027-07-09",tipo:"amortizacion", monto:12.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 3/8"},
    {id:2206,date:"2028-01-09",tipo:"cupon",        monto:0.9375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"2.5% anual s/VN residual 62.5"},
    {id:2207,date:"2028-01-09",tipo:"amortizacion", monto:12.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 4/8"},
    {id:2208,date:"2028-07-09",tipo:"cupon",        monto:0.78125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"2.5% anual s/VN residual 50"},
    {id:2209,date:"2028-07-09",tipo:"amortizacion", monto:12.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 5/8"},
    {id:2210,date:"2029-01-09",tipo:"cupon",        monto:0.625,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"2.5% anual s/VN residual 37.5"},
    {id:2211,date:"2029-01-09",tipo:"amortizacion", monto:12.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 6/8"},
    {id:2212,date:"2029-07-09",tipo:"cupon",        monto:0.46875,cobrado:false,fechaCobro:null,fuente:"auto",nota:"2.5% anual s/VN residual 25"},
    {id:2213,date:"2029-07-09",tipo:"amortizacion", monto:12.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 7/8"},
    {id:2214,date:"2030-01-09",tipo:"cupon",        monto:0.15625,cobrado:false,fechaCobro:null,fuente:"auto",nota:"2.5% anual s/VN residual 12.5"},
    {id:2215,date:"2030-01-09",tipo:"amortizacion", monto:12.5,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 8/8"},
  ],

  // AL30D = mismo schedule que GD30 pero ley argentina
  "AL30D": [
    {id:2220,date:"2026-07-09",tipo:"cupon",        monto:1.546875,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 75"},
    {id:2221,date:"2026-07-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 5/16"},
    {id:2222,date:"2027-01-09",tipo:"cupon",        monto:1.40625,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 68.75"},
    {id:2223,date:"2027-01-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 6/16"},
    {id:2224,date:"2027-07-09",tipo:"cupon",        monto:1.265625,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 62.5"},
    {id:2225,date:"2027-07-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 7/16"},
    {id:2226,date:"2028-01-09",tipo:"cupon",        monto:1.125,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 56.25"},
    {id:2227,date:"2028-01-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 8/16"},
    {id:2228,date:"2028-07-09",tipo:"cupon",        monto:0.984375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 50"},
    {id:2229,date:"2028-07-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 9/16"},
    {id:2230,date:"2029-01-09",tipo:"cupon",        monto:0.84375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 43.75"},
    {id:2231,date:"2029-01-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 10/16"},
    {id:2232,date:"2029-07-09",tipo:"cupon",        monto:0.703125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 37.5"},
    {id:2233,date:"2029-07-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 11/16"},
    {id:2234,date:"2030-01-09",tipo:"cupon",        monto:0.5625, cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 31.25"},
    {id:2235,date:"2030-01-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 12/16"},
    {id:2236,date:"2030-07-09",tipo:"cupon",        monto:0.421875,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 25"},
    {id:2237,date:"2030-07-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 13/16"},
    {id:2238,date:"2031-01-09",tipo:"cupon",        monto:0.28125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 18.75"},
    {id:2239,date:"2031-01-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 14/16"},
    {id:2240,date:"2031-07-09",tipo:"cupon",        monto:0.140625,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 12.5"},
    {id:2241,date:"2031-07-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 15/16"},
    {id:2242,date:"2032-01-09",tipo:"cupon",        monto:0.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.125% s/VN residual 6.25"},
    {id:2243,date:"2032-01-09",tipo:"amortizacion", monto:6.25,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 16/16"},
  ],

  // AL35D = mismo schedule que GD35 pero ley argentina
  "AL35D": [
    {id:2250,date:"2026-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2251,date:"2027-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2252,date:"2027-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2253,date:"2028-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2254,date:"2028-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2255,date:"2029-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2256,date:"2029-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2257,date:"2030-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2258,date:"2030-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2259,date:"2031-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2260,date:"2031-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2261,date:"2032-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2262,date:"2032-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2263,date:"2033-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2264,date:"2033-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2265,date:"2034-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2266,date:"2034-07-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2267,date:"2035-01-09",tipo:"cupon",        monto:1.8125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"3.625% anual s/100 VN"},
    {id:2268,date:"2035-01-09",tipo:"amortizacion", monto:100.0, cobrado:false,fechaCobro:null,fuente:"auto",nota:"Amort. bullet 100%"},
  ],

  // AL41D = mismo schedule que GD41 pero ley argentina
  "AL41D": [
    {id:2270,date:"2026-07-09",tipo:"cupon",        monto:2.4375, cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/100 VN"},
    {id:2271,date:"2027-01-09",tipo:"cupon",        monto:2.4375, cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/100 VN"},
    {id:2272,date:"2027-01-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 1/20"},
    {id:2273,date:"2027-07-09",tipo:"cupon",        monto:2.31563,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 95"},
    {id:2274,date:"2027-07-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 2/20"},
    {id:2275,date:"2028-01-09",tipo:"cupon",        monto:2.19375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 90"},
    {id:2276,date:"2028-01-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 3/20"},
    {id:2277,date:"2028-07-09",tipo:"cupon",        monto:2.07188,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 85"},
    {id:2278,date:"2028-07-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 4/20"},
    {id:2279,date:"2029-01-09",tipo:"cupon",        monto:1.95,   cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 80"},
    {id:2280,date:"2029-01-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 5/20"},
    {id:2281,date:"2029-07-09",tipo:"cupon",        monto:1.82813,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 75"},
    {id:2282,date:"2029-07-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 6/20"},
    {id:2283,date:"2030-01-09",tipo:"cupon",        monto:1.70625,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 70"},
    {id:2284,date:"2030-01-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 7/20"},
    {id:2285,date:"2030-07-09",tipo:"cupon",        monto:1.58438,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 65"},
    {id:2286,date:"2030-07-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 8/20"},
    {id:2287,date:"2031-01-09",tipo:"cupon",        monto:1.4625, cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 60"},
    {id:2288,date:"2031-01-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 9/20"},
    {id:2289,date:"2031-07-09",tipo:"cupon",        monto:1.34063,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 55"},
    {id:2290,date:"2031-07-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 10/20"},
    {id:2291,date:"2032-01-09",tipo:"cupon",        monto:1.21875,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 50"},
    {id:2292,date:"2032-01-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 11/20"},
    {id:2293,date:"2032-07-09",tipo:"cupon",        monto:1.09688,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 45"},
    {id:2294,date:"2032-07-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 12/20"},
    {id:2295,date:"2033-01-09",tipo:"cupon",        monto:0.975,  cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 40"},
    {id:2296,date:"2033-01-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 13/20"},
    {id:2297,date:"2033-07-09",tipo:"cupon",        monto:0.85313,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 35"},
    {id:2298,date:"2033-07-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 14/20"},
    {id:2299,date:"2034-01-09",tipo:"cupon",        monto:0.73125,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 30"},
    {id:2300,date:"2034-01-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 15/20"},
    {id:2301,date:"2034-07-09",tipo:"cupon",        monto:0.60938,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 25"},
    {id:2302,date:"2034-07-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 16/20"},
    {id:2303,date:"2035-01-09",tipo:"cupon",        monto:0.4875, cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 20"},
    {id:2304,date:"2035-01-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 17/20"},
    {id:2305,date:"2035-07-09",tipo:"cupon",        monto:0.36563,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 15"},
    {id:2306,date:"2035-07-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 18/20"},
    {id:2307,date:"2036-01-09",tipo:"cupon",        monto:0.24375,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 10"},
    {id:2308,date:"2036-01-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 19/20"},
    {id:2309,date:"2036-07-09",tipo:"cupon",        monto:0.12188,cobrado:false,fechaCobro:null,fuente:"auto",nota:"4.875% s/VN residual 5"},
    {id:2310,date:"2036-07-09",tipo:"amortizacion", monto:5.0,    cobrado:false,fechaCobro:null,fuente:"auto",nota:"Cuota 20/20"},
  ],
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
    return price ? parseFloat(price.toFixed(2)) : TASA10Y_FALLBACK;
  } catch { return TASA10Y_FALLBACK; }
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
  const LABELS={port:"Portfolio",spy:"S&P 500",ccl:"CCL",mep:"MEP",t10y:"T10Y",uva:"UVA",cer:"CER"};
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
function calcTWR(dates, trades, en, tickerBars, cclBars, mepBars, currency, fxRate, livePricesMap, customEnd=null, realTodayStr=null){
  if(!dates||dates.length<2) return [];
  if(!realTodayStr){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset()-180);realTodayStr=d.toISOString().slice(0,10);}
  const todayStr=customEnd&&customEnd<realTodayStr?null:realTodayStr;
  const liveMap=(todayStr&&livePricesMap)||{};

  // Pre-indexar trades por ticker para O(1) lookup en vez de O(n) filter en cada fecha
  const tradesByTicker={};
  for(const t of trades){
    if(!tradesByTicker[t.ticker]) tradesByTicker[t.ticker]=[];
    tradesByTicker[t.ticker].push({...t, _ts: new Date(t.date).getTime()});
  }

  // Último precio disponible <= fecha (bisección O(log n))
  // IMPORTANTE: nunca usar precio futuro — solo pasado o igual
  function findPrice2(bars,d){
    if(!bars?.length)return null;
    // Bisección: encontrar último bar con date <= d
    let lo=0,hi=bars.length-1,res=-1;
    while(lo<=hi){
      const mid=(lo+hi)>>1;
      if(bars[mid].date<=d){ res=mid; lo=mid+1; }
      else hi=mid-1;
    }
    if(res>=0) return bars[res].close||null;
    // Si no hay barra anterior, usar la primera disponible (inicio del histórico)
    return bars[0].close||null;
  }

  const getPortVal=(dateStr, dateT)=>{
    let total=0;
    const isToday=dateStr===todayStr;
    for(const h of en){
      const ticks=tradesByTicker[h.ticker]||[];
      const buys=ticks.filter(t=>t.tipo==="compra"&&t._ts<=dateT);
      const sells=ticks.filter(t=>t.tipo==="venta"&&t._ts<=dateT);
      const qty=Math.max(0,buys.reduce((a,t)=>a+t.qty,0)-sells.reduce((a,t)=>a+t.qty,0));
      if(qty<=0)continue;
      const isBond=h.type==="bono_usd"||h.type==="bono_ars";
      const qtyFactor=isBond?qty/100:qty;
      const bars=tickerBars[h.ticker];
      let price;
      if(isToday&&liveMap[h.ticker]){
        // liveMap is already in per-unit scale (bono_ars /100 applied earlier)
        price=liveMap[h.ticker];
      } else if(bars&&bars.length){
        if(dateStr<bars[0].date)continue;
        // findPrice2 returns nearest bar — handles weekends/holidays by using last available
        const rawP=findPrice2(bars,dateStr);
        if(!rawP)continue;
        price=rawP; // historicos already in per-100-laminas scale
      } else {
        const firstBuy=buys.slice().sort((a,b)=>a.date.localeCompare(b.date))[0];
        if(!firstBuy||dateStr<firstBuy.date)continue;
        const totalCost=buys.reduce((a,t)=>a+t.qty*t.price,0);
        const totalQty=buys.reduce((a,t)=>a+t.qty,0);
        price=totalQty>0?totalCost/totalQty:h.currentPrice;
        // all prices in per-100-laminas scale, qtyFactor=qty/100 handles the rest
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
          <span style={{fontSize:10,color:"var(--green)"}}>— Portfolio</span>
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
    // Solo el sufijo D o C indica que cotiza en USD (cable/MEP/CCL)
    // No usar descripción — bonos CER como TZX28 dicen "U$S" pero son ARS
    const endsD = ticker.endsWith("D");
    const endsC = ticker.endsWith("C");
    return (endsD||endsC) ? "bono_usd" : "bono_ars";
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


// ── BondWizard ────────────────────────────────────────────────────────────────
// Wizard para cargar flujos de un bono/ON al dar de alta
// Paso 1: si tiene SEED_BOND_FLOWS → mostrar para confirmar
// Paso 2: si no → preguntar parámetros y generar flujos
function BondWizard({ticker, onConfirm, onSkip, darkMode=true}){
  const seedFlows = SEED_BOND_FLOWS[ticker]||null;
  const seedMeta  = SEED_BOND_META[ticker]||null;

  // Cache de feriados propio del wizard
  const feriadosWiz = React.useRef({});
  const fetchFeriadosWiz = async (year) => {
    if(feriadosWiz.current[year]) return feriadosWiz.current[year];
    try{
      const r = await fetch(`https://api.argentinadatos.com/v1/feriados/${year}`,{signal:AbortSignal.timeout(5000)});
      if(r.ok){
        const data = await r.json();
        const s = new Set((Array.isArray(data)?data:[]).map(f=>(f.fecha||f.date||'').slice(0,10)).filter(Boolean));
        feriadosWiz.current[year] = s; return s;
      }
    }catch{}
    feriadosWiz.current[year] = new Set();
    return new Set();
  };
  // Avanzar al siguiente día hábil (lunes-viernes, sin feriados AR)
  // Usar T12:00:00 para evitar desfase UTC en timezones negativas (Argentina UTC-3)
  const nextBusinessDay = async (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    for(let i=0;i<20;i++){
      // getDay() sobre fecha con hora local → día correcto en Argentina
      const dow = d.getDay();
      // Reconstruir string YYYY-MM-DD desde componentes locales para evitar desfase UTC
      const ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      const fer = feriadosWiz.current[d.getFullYear()] || await fetchFeriadosWiz(d.getFullYear());
      if(dow!==0 && dow!==6 && !fer.has(ds)) return ds;
      d.setDate(d.getDate()+1);
    }
    return dateStr; // fallback
  };

  // Wizard manual
  const [step, setStep] = useState(seedFlows ? 'confirm' : 'params');
  const [params, setParams] = useState({
    vto: '',
    tna: '',
    frecuencia: 'semestral',
    amortTipo: 'bullet', // bullet | cuotas
    cuotas: '',
    emisionDate: '',
    primerCupon: '', // fecha exacta del primer cupón (YYYY-MM-DD) — el schedule se proyecta desde acá
    base: '30/360',  // base de cálculo: '30/360' | 'dias/365'
    ajuste: 'ninguno', // ninguno | CER | UVA
  });
  const [generatedFlows, setGeneratedFlows] = useState(null);
  const set = (k,v) => setParams(p=>({...p,[k]:v}));

  const inp = {background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 12px",color:"var(--text-primary)",fontSize:13,width:"100%"};
  const lbl = {fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:5,fontWeight:600};
  const btn = (color) => ({background:color,border:"none",borderRadius:8,padding:"9px 20px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600});

  // ── Helpers de cálculo (mirror de FlujoTab) ──────────────────────────────
  const dias30_360wiz = (d1str, d2str) => {
    const a=new Date(d1str+'T12:00:00'), b=new Date(d2str+'T12:00:00');
    const [y1,m1,day1]=[a.getFullYear(),a.getMonth()+1,a.getDate()];
    const [y2,m2,day2]=[b.getFullYear(),b.getMonth()+1,b.getDate()];
    const D1=Math.min(day1,30);
    const D2=(day1>=30&&day2===31)?30:day2;
    return (y2-y1)*360+(m2-m1)*30+(D2-D1);
  };
  const diasRealesWiz = (d1str, d2str) =>
    Math.max(0, Math.round((new Date(d2str+'T12:00:00')-new Date(d1str+'T12:00:00'))/(1000*60*60*24)));
  const calcDiasWiz = (base, d1str, d2str) =>
    base==='30/360' ? dias30_360wiz(d1str,d2str) : diasRealesWiz(d1str,d2str);

  // Genera tabla de filas — dos fechas por fila:
  //   dateCalc: fecha teórica (para cálculo de días/intereses, puede ser inhábil)
  //   datePago: siguiente día hábil (fecha efectiva de cobro)
  const generateRows = async () => {
    const {vto, tna, frecuencia, amortTipo, cuotas, emisionDate, primerCupon} = params;
    if(!vto || !tna || !primerCupon) return null;

    const freqMonths = {mensual:1, trimestral:3, semestral:6, anual:12}[frecuencia] || 6;
    const tnaNum = parseFloat(tna)/100;
    const endDate = new Date(vto+'T12:00:00');
    const firstDate = new Date(primerCupon+'T12:00:00');
    // Día del mes del primer cupón — se repite en cada período
    const diaNum = firstDate.getDate();

    // Pre-cargar feriados de todos los años involucrados
    const startYear = firstDate.getFullYear();
    const endYear = endDate.getFullYear();
    for(let y=startYear; y<=endYear; y++) await fetchFeriadosWiz(y);

    // Helper: construir YYYY-MM-DD desde componentes locales (evita desfase UTC en AR)
    const toLocalStr = (d) => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');

    // Generar fechas teóricas (dateCalc): primer cupón + freqMonths sucesivos, mismo día
    const calcDates = [primerCupon]; // primera fecha exacta como la ingresó el usuario
    const cur = new Date(primerCupon+'T12:00:00');
    cur.setMonth(cur.getMonth() + freqMonths);
    while(cur <= endDate){
      const year=cur.getFullYear(), month=cur.getMonth();
      const lastDay = new Date(year, month+1, 0).getDate();
      // Usar hora 12 para evitar desfase, construir string local
      calcDates.push(toLocalStr(new Date(year, month, Math.min(diaNum,lastDay), 12)));
      cur.setMonth(cur.getMonth() + freqMonths);
    }
    // Asegurar que el vto esté incluido al final
    if(calcDates[calcDates.length-1] !== vto){
      if(calcDates[calcDates.length-1] > vto) calcDates[calcDates.length-1] = vto;
      else calcDates.push(vto);
    }

    // datePago: siguiente día hábil de cada dateCalc (vto no se ajusta)
    const pagoDates = await Promise.all(
      calcDates.map((d,i) => i===calcDates.length-1 ? Promise.resolve(d) : nextBusinessDay(d))
    );

    const divisor = params.base === 'dias/365' ? 365 : 360;
    const amortPorCuota = amortTipo==='bullet' ? 0 : (cuotas ? parseFloat((100/parseInt(cuotas)).toFixed(6)) : 0);
    let vnResidual = 100;
    // Cálculo de días usa fechas TEÓRICAS (dateCalc), empezando desde la emisión
    let prevCalcDate = emisionDate || primerCupon;

    const rows = calcDates.map((dateCalc, i) => {
      const dias = calcDiasWiz(params.base, prevCalcDate, dateCalc);
      const cupon = parseFloat((tnaNum * dias/divisor * vnResidual).toFixed(6));
      const esUltimo = i === calcDates.length-1;
      const amort = amortTipo==='bullet' ? (esUltimo ? 100 : 0) : amortPorCuota;
      const row = {dateCalc, datePago:pagoDates[i], dias, cupon, amort, vnResidual};
      vnResidual = parseFloat(Math.max(0, vnResidual - amort).toFixed(6));
      prevCalcDate = dateCalc;
      return row;
    });
    return rows;
  };

  // Convierte las rows editables en flows para guardar
  // date = datePago (hábil), dateCalc guardado en nota para referencia
  const rowsToFlows = (rows) => {
    let id = Date.now();
    const flows = [];
    rows.forEach(row => {
      const pago = row.datePago || row.date || row.dateCalc;
      const calc = row.dateCalc || pago;
      const diffDias = (pago !== calc) ? ` · pago ${pago}` : '';
      if(row.cupon > 0){
        const divisorNota = params.base==='dias/365'?365:360;
        flows.push({id:id++, date:pago, dateCalc:calc, tipo:'cupon', monto:row.cupon, cobrado:false, fechaCobro:null, fuente:'wizard', nota:`${row.dias}d · ${params.tna}%×${row.dias}/${divisorNota}${diffDias}`});
      }
      if(row.amort > 0){
        flows.push({id:id++, date:pago, dateCalc:calc, tipo:'amortizacion', monto:row.amort, cobrado:false, fechaCobro:null, fuente:'wizard', nota:`Amort. ${row.amort.toFixed(4)}%${diffDias}`});
      }
    });
    return flows;
  };

  const [editRows, setEditRows] = useState(null); // filas editables por fecha
  const [generating, setGenerating] = useState(false);
  const handleGenerate = async () => {
    setGenerating(true);
    try{
      const rows = await generateRows();
      if(rows){ setEditRows(rows); }
      setStep('review');
    }finally{ setGenerating(false); }
  };

  // Recalcula los cupones usando las fechas actuales de editRows + params de tasa
  const [recalculating, setRecalculating] = useState(false);
  const recalcularTasas = async () => {
    if(!editRows||!params.tna) return;
    setRecalculating(true);
    try{
      const tnaNum = parseFloat(params.tna)/100;
      const divisorR = params.base==='dias/365' ? 365 : 360;
      // Ordenar por fecha teórica
      const sorted = [...editRows].sort((a,b)=>(a.dateCalc||a.date).localeCompare(b.dateCalc||b.date));
      let prevDate = params.emisionDate || (sorted[0].dateCalc||sorted[0].date);
      let vnResidual = 100;
      const newRows = sorted.map((row) => {
        const calcDate = row.dateCalc || row.date;
        const dias = calcDiasWiz(params.base, prevDate, calcDate);
        const cupon = parseFloat((tnaNum * dias/divisorR * vnResidual).toFixed(6));
        const newRow = {...row, dias, cupon};
        vnResidual = parseFloat(Math.max(0, vnResidual - (parseFloat(row.amort)||0)).toFixed(6));
        prevDate = calcDate;
        return newRow;
      });
      setEditRows(newRows);
    }finally{ setRecalculating(false); }
  };

  const handleConfirm = (flows) => {
    // Pasar tna/base/emisionDate para que el caller actualice bondMeta
    const meta = params.tna ? {tna:parseFloat(params.tna), base:params.base||'30/360', emisionDate:params.emisionDate||null} : null;
    onConfirm(flows, meta);
  };

  return(
    <div className={darkMode?"theme-dark":"theme-light"} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:28,width:560,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <h3 style={{fontFamily:"Georgia,serif",fontSize:16,color:"var(--text-primary)",margin:0}}>
              📋 Flujos de {ticker}
            </h3>
            <p style={{fontSize:11,color:"var(--text-muted)",margin:"4px 0 0"}}>
              {step==='confirm' ? 'Encontré el schedule en el sistema. Confirmá antes de cargar.' :
               step==='params'  ? 'No encontré el schedule. Ingresá los parámetros para generarlo.' :
               'Revisá los flujos generados antes de confirmar.'}
            </p>
          </div>
          <button onClick={onSkip} style={{background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
        </div>

        {/* PASO: CONFIRM — flujos del seed */}
        {step==='confirm' && seedFlows && (
          <>
            {seedMeta?.desc && (
              <div style={{background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.15)",borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:12,color:"var(--text-secondary)"}}>
                📌 {seedMeta.desc}
              </div>
            )}
            {(()=>{
              const hasDualDates = seedFlows.some(f=>f.dateCalc && f.dateCalc!==f.date);
              const fmtD = d => d ? d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4) : '—';
              return (
              <div style={{maxHeight:280,overflowY:"auto",marginBottom:16}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid var(--border)"}}>
                      {hasDualDates
                        ? [
                            <th key="fc" style={{padding:"6px 8px",textAlign:"left",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase"}}>F. Cálculo</th>,
                            <th key="fp" style={{padding:"6px 8px",textAlign:"left",fontSize:10,color:"#60A5FA",fontWeight:600,textTransform:"uppercase"}}>F. Pago</th>,
                          ]
                        : <th style={{padding:"6px 10px",textAlign:"left",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase"}}>Fecha</th>
                      }
                      <th style={{padding:"6px 10px",textAlign:"left",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase"}}>Tipo</th>
                      <th style={{padding:"6px 10px",textAlign:"right",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase"}}>Monto %VN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seedFlows.map((f,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid var(--border)"}}>
                        {hasDualDates ? <>
                          <td style={{padding:"6px 8px",fontFamily:"'DM Mono',monospace",fontSize:11,color:"var(--text-secondary)"}}>{fmtD(f.dateCalc||f.date)}</td>
                          <td style={{padding:"6px 8px",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#60A5FA"}}>{fmtD(f.date)}</td>
                        </> :
                          <td style={{padding:"6px 10px",fontFamily:"'DM Mono',monospace"}}>{fmtD(f.date)}</td>
                        }
                        <td style={{padding:"6px 10px"}}>
                          <span style={{color:f.tipo==='amortizacion'?"var(--yellow)":"var(--accent)",fontWeight:600}}>
                            {f.tipo==='amortizacion'?'💰 Amort.':'🎫 Cupón'}
                          </span>
                        </td>
                        <td style={{padding:"6px 10px",fontFamily:"'DM Mono',monospace",textAlign:"right"}}>{f.monto.toFixed(4)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              );
            })()}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={onSkip} style={{...btn("var(--bg-input)"),color:"var(--text-muted)",border:"1px solid var(--border)"}}>Cargar manualmente</button>
              <button onClick={()=>handleConfirm([...seedFlows])} style={btn("var(--accent)")}>✓ Confirmar y cargar</button>
            </div>
          </>
        )}

        {/* PASO: PARAMS — wizard manual */}
        {step==='params' && (
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <span style={lbl}>Fecha de emisión</span>
                <input type="date" value={params.emisionDate} onChange={e=>set('emisionDate',e.target.value)} style={inp}/>
              </div>
              <div>
                <span style={lbl}>Fecha de vencimiento</span>
                <input type="date" value={params.vto} onChange={e=>set('vto',e.target.value)} style={inp}/>
              </div>
              <div>
                <span style={lbl}>Tasa anual (% TNA)</span>
                <input type="number" step="0.01" placeholder="ej: 7" value={params.tna} onChange={e=>set('tna',e.target.value)} style={inp}/>
              </div>
              <div>
                <span style={lbl}>Frecuencia de cupón</span>
                <select value={params.frecuencia} onChange={e=>set('frecuencia',e.target.value)} style={inp}>
                  <option value="mensual">Mensual</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div>
                <span style={lbl}>Fecha del 1er cupón</span>
                <input type="date" value={params.primerCupon}
                  onChange={e=>set('primerCupon',e.target.value)}
                  style={inp}/>
                <span style={{fontSize:10,color:"var(--text-muted)",marginTop:3,display:"block"}}>
                  Fecha teórica — el resto se proyecta desde acá · días hábiles ajustados automático
                </span>
              </div>
              <div>
                <span style={lbl}>Base de cálculo</span>
                <select value={params.base} onChange={e=>set('base',e.target.value)} style={inp}>
                  <option value="30/360">30/360</option>
                  <option value="dias/365">Días / 365</option>
                </select>
              </div>
              <div>
                <span style={lbl}>Amortización</span>
                <select value={params.amortTipo} onChange={e=>set('amortTipo',e.target.value)} style={inp}>
                  <option value="bullet">Bullet (todo al vto)</option>
                  <option value="cuotas">En cuotas iguales</option>
                </select>
              </div>
              {params.amortTipo==='cuotas' && (
                <div>
                  <span style={lbl}>Cantidad de cuotas de amort.</span>
                  <input type="number" min="1" placeholder="ej: 10" value={params.cuotas} onChange={e=>set('cuotas',e.target.value)} style={inp}/>
                </div>
              )}
              <div>
                <span style={lbl}>Ajuste de capital</span>
                <select value={params.ajuste} onChange={e=>set('ajuste',e.target.value)} style={inp}>
                  <option value="ninguno">Ninguno (tasa fija)</option>
                  <option value="CER">CER</option>
                  <option value="UVA">UVA</option>
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={onSkip} style={{...btn("var(--bg-input)"),color:"var(--text-muted)",border:"1px solid var(--border)"}}>Saltar por ahora</button>
              <button onClick={handleGenerate} disabled={!params.vto||!params.tna||!params.primerCupon||generating}
                style={{...btn(!params.vto||!params.tna||!params.primerCupon?"rgba(59,130,246,0.3)":"var(--accent)"),cursor:!params.vto||!params.tna||!params.primerCupon||generating?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
                {generating ? <><span style={{animation:"spin 0.7s linear infinite",display:"inline-block"}}>⟳</span> Cargando feriados...</> : "Generar flujos →"}
              </button>
            </div>
          </>
        )}

        {/* PASO: REVIEW — una fila por fecha, columnas Fecha/Amort/Cupón editables */}
        {step==='review' && editRows && (()=>{
          const totalAmort = editRows.reduce((a,r)=>a+(parseFloat(r.amort)||0),0);
          const amortOk = Math.abs(totalAmort-100) < 0.01;
          const inpS = {background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:5,padding:"3px 7px",color:"var(--text-primary)",fontSize:12,width:"100%",boxSizing:"border-box"};
          const updateRow = (i, key, val) => {
            const newRows = [...editRows];
            newRows[i] = {...newRows[i], [key]: val};
            setEditRows(newRows);
          };
          return(
          <>
            {!amortOk&&(
              <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:7,padding:"7px 12px",marginBottom:10,fontSize:12,color:"var(--red)"}}>
                ⚠ Amortización total: <b>{totalAmort.toFixed(4)}%</b> — debe ser exactamente 100%
              </div>
            )}
            {amortOk&&(
              <div style={{background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:7,padding:"7px 12px",marginBottom:10,fontSize:12,color:"var(--green)"}}>
                ✓ Amortización total: 100%
              </div>
            )}
            {params.tna&&(
              <div style={{marginBottom:10,display:"flex",justifyContent:"flex-end"}}>
                <button onClick={recalcularTasas} disabled={recalculating}
                  title={"Recalcula los cupones usando TNA "+params.tna+"% y las fechas actuales"}
                  style={{background:"rgba(59,130,246,0.12)",border:"1px solid rgba(59,130,246,0.3)",borderRadius:7,padding:"6px 14px",color:"#60A5FA",cursor:recalculating?"wait":"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                  {recalculating?<><span style={{animation:"spin 0.7s linear infinite",display:"inline-block"}}>⟳</span>Calculando...</>:<>🔄 Recalcular tasas <span style={{fontWeight:400,opacity:0.7}}>({params.tna}% TNA)</span></>}
                </button>
              </div>
            )}
            <div style={{maxHeight:320,overflowY:"auto",marginBottom:16}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{borderBottom:"1px solid var(--border)",position:"sticky",top:0,background:"var(--bg-card)"}}>
                    <th style={{padding:"6px 8px",textAlign:"left",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",minWidth:110}}>F. Cálculo</th>
                    <th style={{padding:"6px 8px",textAlign:"left",fontSize:10,color:"#60A5FA",fontWeight:600,textTransform:"uppercase",minWidth:110}}>F. Pago</th>
                    <th style={{padding:"6px 8px",textAlign:"right",fontSize:10,color:"var(--yellow)",fontWeight:600,textTransform:"uppercase",minWidth:80}}>Amort. %</th>
                    <th style={{padding:"6px 8px",textAlign:"right",fontSize:10,color:"var(--accent)",fontWeight:600,textTransform:"uppercase",minWidth:80}}>Cupón %</th>
                    <th style={{padding:"6px 8px",width:28}}></th>
                  </tr>
                </thead>
                <tbody>
                  {editRows.map((row,i)=>{
                    const calcDate = row.dateCalc || row.date || '';
                    const pagoDate = row.datePago || row.date || '';
                    const diffDias = calcDate && pagoDate && calcDate!==pagoDate ?
                      Math.round((new Date(pagoDate+'T12:00:00')-new Date(calcDate+'T12:00:00'))/(1000*60*60*24)) : 0;
                    return (
                    <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.04)",background:row.amort>0?"rgba(251,191,36,0.03)":"transparent"}}>
                      {/* Fecha teórica de cálculo */}
                      <td style={{padding:"4px 6px"}}>
                        <input type="date" value={calcDate}
                          onChange={e=>updateRow(i,'dateCalc',e.target.value)}
                          style={inpS}/>
                      </td>
                      {/* Fecha efectiva de pago */}
                      <td style={{padding:"4px 6px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:3}}>
                          <input type="date" value={pagoDate}
                            onChange={e=>updateRow(i,'datePago',e.target.value)}
                            style={{...inpS,color:"#60A5FA"}}/>
                          {diffDias>0&&<span style={{fontSize:9,color:"var(--text-muted)",whiteSpace:"nowrap"}}>+{diffDias}d</span>}
                        </div>
                      </td>
                      <td style={{padding:"4px 6px"}}>
                        <input type="number" step="0.0001" min="0" max="100"
                          value={row.amort}
                          onChange={e=>updateRow(i,'amort',parseFloat(e.target.value)||0)}
                          style={{...inpS,color:"var(--yellow)",fontWeight:600,textAlign:"right"}}/>
                      </td>
                      <td style={{padding:"4px 6px"}}>
                        <input type="number" step="0.0001" min="0"
                          value={row.cupon}
                          onChange={e=>updateRow(i,'cupon',parseFloat(e.target.value)||0)}
                          style={{...inpS,color:"var(--accent)",textAlign:"right"}}/>
                      </td>
                      <td style={{padding:"4px 2px",textAlign:"center"}}>
                        <button onClick={()=>setEditRows(editRows.filter((_,j)=>j!==i))}
                          style={{background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:13,padding:"2px 3px"}}>🗑</button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"center"}}>
              <button onClick={()=>setStep('params')} style={{...btn("var(--bg-input)"),color:"var(--text-muted)",border:"1px solid var(--border)",fontSize:12}}>← Parámetros</button>
              <div style={{display:"flex",gap:8}}>
                <button onClick={onSkip} style={{...btn("var(--bg-input)"),color:"var(--text-muted)",border:"1px solid var(--border)",fontSize:12}}>Saltar</button>
                <button onClick={()=>handleConfirm(rowsToFlows(editRows))} disabled={!amortOk}
                  style={{...btn(!amortOk?"rgba(59,130,246,0.3)":"var(--accent)"),cursor:!amortOk?"not-allowed":"pointer",fontSize:13}}>
                  ✓ Confirmar y cargar
                </button>
              </div>
            </div>
          </>
          );
        })()}

      </div>
    </div>
  );
}

function Modal({h,port=[],onSave,onClose,darkMode=true}){
  const blank={ticker:"",name:"",type:"accion_ar",qty:"",buyPrice:"",buyCurrency:"ARS",buyDate:todayAR(),operacion:"compra",comision:"",comisionPct:"",netoManual:""};
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
    <div className={darkMode?"theme-dark":"theme-light"} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
      <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:28,width:520,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{fontFamily:"Georgia,serif",fontSize:16,color:"var(--text-primary)",margin:0}}>{h?"Editar posición":"Nueva posición"}</h3>
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
                      if(op==="venta"){setF(p=>({...p,operacion:"venta",ticker:"",name:"",type:"",buyCurrency:"ARS",qty:"",buyPrice:""}));setTickerStatus("idle");}
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
              <div style={{display:"flex",gap:4}}>
                <div style={{flex:1,position:"relative"}}>
                  <input type="number" min="0" max={f.operacion==="venta"?availableQty:undefined} value={f.qty}
                    onChange={e=>{const v=+e.target.value;set("qty",f.operacion==="venta"?Math.min(v,availableQty):v||e.target.value);}}
                    style={{...inp,flex:1,width:"100%",color:"transparent",caretColor:"var(--text-primary)",borderColor:overSelling?"var(--red)":undefined}}/>
                  {/* Display formateado encima del input */}
                  <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,padding:"8px 12px",
                    fontSize:14,color:"var(--text-primary)",pointerEvents:"none",
                    display:"flex",alignItems:"center"}}>
                    {f.qty?Number(f.qty).toLocaleString("es-AR"):""}
                  </div>
                </div>
                {f.operacion==="venta"&&f.ticker&&(
                  <button onClick={()=>set("qty",availableQty)}
                    style={{background:"var(--accent)",border:"none",borderRadius:8,padding:"0 10px",color:"#fff",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>
                    Todo
                  </button>
                )}
              </div>
              {f.operacion==="venta"&&f.ticker&&<div style={{fontSize:10,color:overSelling?"var(--red)":"var(--text-muted)",marginTop:3}}>
                {overSelling?`⚠ Solo tenés ${availableQty.toLocaleString("es-AR")} nominales`:`Disponible: ${availableQty.toLocaleString("es-AR")} nominales`}
              </div>}
            </label>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>{f.operacion==="venta"?"Precio de venta":"Precio de compra (PPC)"}</span>
              <div style={{display:"flex",gap:8}}>
                <input type="number" min="0" value={f.buyPrice} onChange={e=>{
                  set("buyPrice",e.target.value);
                  // Recalcular comision ARS si hay % cargado
                  if(f.comisionPct){
                    const isBondP=f.type==="bono_ars"||f.type==="bono_usd";
                    const bruto=+(f.qty||0)*(isBondP?+(e.target.value||0)/100:+(e.target.value||0));
                    const com=bruto>0?+(bruto*parseFloat(f.comisionPct)/100).toFixed(2):0;
                    setF(p=>({...p,buyPrice:e.target.value,comision:com,netoManual:""}));
                  }
                }} style={{...inp,flex:1}}/>
                <select value={f.buyCurrency} onChange={e=>set("buyCurrency",e.target.value)} style={{...inp,width:90}}>
                  <option value="ARS">🇦🇷 ARS</option>
                  <option value="USD">🇺🇸 USD</option>
                </select>
              </div>
            </div>
          </div>


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
              {(()=>{
                const isBondComision=f.type==="bono_ars"||f.type==="bono_usd";
                const brutoComision=+f.qty*(isBondComision?+f.buyPrice/100:+f.buyPrice);
                const comVal=+f.comision||0;
                const netoCalc=f.operacion==="venta"?brutoComision-comVal:brutoComision+comVal;
                return (<>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:8}}>
                    <span style={{fontSize:11,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,flexShrink:0}}>Comisión</span>
                    <div style={{display:"flex",gap:8,alignItems:"center",flex:1}}>
                      {/* Monto comisión */}
                      <div style={{display:"flex",alignItems:"center",gap:4,flex:1}}>
                        <span style={{fontSize:11,color:"var(--text-muted)"}}>{f.buyCurrency}</span>
                        <div style={{flex:1,position:"relative"}}>
                          <input type="number" min="0" value={f.comision||""}
                            onChange={e=>{
                              const monto=+e.target.value;
                              setF(p=>({...p,comision:monto,netoManual:"",
                                comisionPct:brutoComision>0?+((monto/brutoComision)*100).toFixed(4):p.comisionPct}));
                            }}
                            placeholder="0.00"
                            style={{...inp,padding:"4px 8px",fontSize:13,textAlign:"right",color:"transparent",caretColor:"var(--text-primary)",width:"100%"}}/>
                          <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,padding:"4px 8px",
                            fontSize:13,color:"var(--text-primary)",pointerEvents:"none",textAlign:"right",
                            display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
                            {f.comision?Number(f.comision).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2}):""}
                          </div>
                        </div>
                      </div>
                      <span style={{color:"var(--text-muted)",fontSize:12}}>↔</span>
                      {/* Porcentaje */}
                      <div style={{display:"flex",alignItems:"center",gap:4,flex:1}}>
                        <input type="number" min="0" step="0.001" value={f.comisionPct===0?"0":f.comisionPct||""}
                          onChange={e=>{
                            const pct=parseFloat(e.target.value)||0;
                            const com=brutoComision>0?+(brutoComision*pct/100).toFixed(2):0;
                            setF(p=>({...p,comisionPct:e.target.value,comision:com,netoManual:""}));
                          }}
                          placeholder="0.00"
                          style={{...inp,padding:"4px 8px",fontSize:13,textAlign:"right"}}/>
                        <span style={{fontSize:11,color:"var(--text-muted)"}}>%</span>
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid var(--border)",paddingTop:8,gap:8}}>
                    <span style={{fontSize:11,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,flexShrink:0}}>Monto neto</span>
                    <div style={{textAlign:"right"}}>
                      {/* Display formateado */}
                      <div style={{fontSize:20,fontWeight:700,
                        color:f.operacion==="venta"?"var(--red)":"var(--green)",
                        fontFamily:"'DM Mono',monospace",letterSpacing:"-0.5px"}}>
                        {f.buyCurrency==="USD"
                          ? `USD ${netoCalc.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`
                          : `$ ${netoCalc.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`}
                      </div>
                      {/* Input editable debajo (para ajuste manual) */}
                      <input type="number" min="0"
                        value={f.netoManual||""}
                        onChange={e=>{
                          const neto=+e.target.value;
                          const diff=f.operacion==="venta"?brutoComision-neto:neto-brutoComision;
                          const comAbs=+Math.abs(diff).toFixed(2);
                          const pct=brutoComision>0?+((comAbs/brutoComision)*100).toFixed(4):0;
                          setF(p=>({...p,netoManual:e.target.value,comision:comAbs,comisionPct:pct}));
                        }}
                        onBlur={()=>setF(p=>({...p,netoManual:""}))}
                        placeholder="Ajustar manualmente..."
                        style={{...inp,padding:"3px 8px",fontSize:11,textAlign:"right",
                          marginTop:4,color:"var(--text-muted)",
                          border:"1px solid "+(f.netoManual?"var(--accent)":"rgba(255,255,255,0.1)")}}/>
                    </div>
                  </div>
                </>);
              })()}
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
    ...(cd.currency!=="ARS" ? [{key:"t10y", data:cd.t10y100, color:"var(--yellow)", bold:false}] : []),
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
              {cd?.currency!=="ARS"&&<span style={{color:"var(--yellow)"}}>— T10Y</span>}
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

function PortfolioTab({byType,en,totUSD,totCost,totPnl,totPct,fxRate,fxMode,setModal,del,card,hideAmounts=false,trades=[],historicos={},isMobile=false}){
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
  const cclBarsP = useMemo(()=>(historicos?.CCL||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)),[historicos]);
  const findHistCCL=(dateStr)=>{
    if(!cclBarsP.length) return fxRate;
    let lo=0,hi=cclBarsP.length-1,res=-1;
    while(lo<=hi){ const mid=(lo+hi)>>1; if(cclBarsP[mid].date<=dateStr){res=mid;lo=mid+1;}else hi=mid-1; }
    return res>=0 ? cclBarsP[res].close : fxRate;
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
    // En mobile: fila simplificada (ticker, precio actual, val USD, rend%)
    if(isMobile){
      return(
        <tr key={`${h.ticker}-${h.type}-${h.id||""}`} style={{borderTop:"1px solid var(--border)"}}>
          <td style={{...tdL,fontWeight:700,fontFamily:"monospace",color:"var(--accent)",padding:"8px 6px"}}>
            {h.ticker}
            {h.isLive&&<span style={{display:"block",fontSize:8,color:"var(--green)"}}>●</span>}
          </td>
          <td style={{...tdR,fontSize:11,padding:"8px 6px"}}>
            {(()=>{const cp=h.currentPrice;return isUSD?fmtU(cp,2):fmtA(cp);})()}
            {h.liveChangePct!=null&&h.isLive&&<span style={{display:"block",fontSize:9,color:pc(h.liveChangePct)}}>{fmtP(h.liveChangePct)}</span>}
          </td>
          <td style={{...tdR,fontWeight:600,fontSize:11,padding:"8px 6px",background:"rgba(52,211,153,0.06)"}}>
            {hideAmounts?"••••":fmtU(valUSD)}
            <span style={{display:"block",fontSize:9,color:pc(pnlUSD)}}>{hideAmounts?"••••":(pnlUSD>=0?"+":"")+fmtU(pnlUSD)}</span>
          </td>
          <td style={{...tdR,fontWeight:700,color:pc(pctUSD),fontSize:12,padding:"8px 6px"}}>{fmtP(pctUSD)}</td>
        </tr>
      );
    }
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
            <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",background:'transparent',flexWrap:isMobile?"wrap":"nowrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontWeight:700,fontSize:13,color:"var(--text-primary)"}}>{t.icon} {t.label}</span>
                <span style={{fontSize:11,color:"var(--text-muted)"}}>· {items.length} posición{items.length!==1?"es":""}</span>
              </div>
              <div style={{display:"flex",gap:isMobile?12:20,alignItems:"center",fontSize:12}}>
                <span style={{color:"var(--text-muted)"}}>Saldo: <b style={{color:"var(--text-primary)"}}>{hideAmounts?"••••••":fmtU(secVal)}</b></span>
                <span style={{color:"var(--text-muted)"}}>PnL: <b style={{color:pc(secPnl)}}>{hideAmounts?"••••••":fmtU(secPnl,0)}</b></span>
                <span style={{fontWeight:700,color:pc(secPct),fontSize:13}}>{fmtP(secPct)}</span>
              </div>
            </div>
            {isMobile?(
              /* Mobile: cards con scroll horizontal tipo swipe */
              <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",padding:"12px",display:"flex",gap:10,scrollSnapType:"x mandatory"}}>
                {items.map(h=>{
                  const isBond=h.type==="bono_usd"||h.type==="bono_ars";
                  const isUSD=h.buyCurrency==="USD";
                  const qF=isBond?h.qty/100:h.qty;
                  const origVal=h.currentPrice*qF;
                  const origCost=(h.ppc||h.buyPrice)*qF;
                  let valUSD=isUSD?origVal:origVal/fxRate;
                  let costUSD=isUSD?origCost:origCost/fxRate;
                  const pnlUSD=valUSD-costUSD;
                  const pctUSD=costUSD>0?(pnlUSD/costUSD)*100:0;
                  return(
                    <div key={h.ticker} style={{flexShrink:0,width:150,scrollSnapAlign:"start",
                      background:"var(--bg-input)",borderRadius:10,padding:"12px",
                      borderLeft:`3px solid ${pc(pctUSD)==="var(--green)"?"var(--green)":pc(pctUSD)==="var(--red)"?"var(--red)":"var(--border)"}`,}}>
                      <div style={{fontWeight:700,fontFamily:"monospace",color:"var(--accent)",fontSize:13,marginBottom:2}}>
                        {h.ticker}
                        {h.isLive&&<span style={{fontSize:8,color:"var(--green)",marginLeft:4}}>●</span>}
                      </div>
                      <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:8,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.name}</div>
                      <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:4}}>
                        <span style={{color:"var(--text-muted)"}}>Precio </span>
                        {isUSD?fmtU(h.currentPrice,2):fmtA(h.currentPrice)}
                      </div>
                      <div style={{borderTop:"1px solid var(--border)",marginTop:6,paddingTop:6}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:10,color:"var(--text-muted)"}}>Hoy</span>
                          <span style={{fontSize:11,fontWeight:600,color:h.liveChangePct!=null?pc(h.liveChangePct):"var(--text-muted)"}}>
                            {h.liveChangePct!=null?fmtP(h.liveChangePct):"—"}
                          </span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                          <span style={{fontSize:10,color:"var(--text-muted)"}}>Total</span>
                          <span style={{fontSize:11,fontWeight:700,color:pc(pctUSD)}}>{fmtP(pctUSD)}</span>
                        </div>
                        <div style={{fontSize:12,fontWeight:700,color:"var(--text-primary)",marginTop:4}}>{hideAmounts?"••••":fmtU(valUSD)}</div>
                        <div style={{fontSize:10,color:pc(pnlUSD)}}>{hideAmounts?"••••":(pnlUSD>=0?"+":"")+fmtU(pnlUSD)} PnL</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ):(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:isMobile?11:13,minWidth:isMobile?0:600,tableLayout:"fixed"}}>
                <thead>
                  <tr>
                    <th style={{...thS,width:isMobile?65:70}}>Ticker</th>
                    {!isMobile&&<th style={{...thS}}>Nombre</th>}
                    {!isMobile&&<th style={{...thR,width:100}}>Nominales</th>}
                    {!isMobile&&<th style={{...thR,width:130}}>PPC</th>}
                    <th style={{...thR,width:isMobile?90:150}}>Precio actual</th>
                    {!isMobile&&(view==="dual"||view==="ars")&&<><th style={{...thR,width:140,background:"rgba(96,165,250,0.08)"}}>Val. ARS</th><th style={{...thR,width:130,background:"rgba(96,165,250,0.08)"}}>PnL · % ARS</th></>}
                    {(view==="dual"||view==="usd")&&<><th style={{...thR,width:isMobile?80:120,background:"rgba(52,211,153,0.1)"}}>Val. USD</th>{!isMobile&&<th style={{...thR,width:130,background:"rgba(52,211,153,0.1)"}}>PnL · % USD</th>}</>}
                    {!isMobile&&view==="native"&&<><th style={{...thR,width:140,background:"rgba(139,92,246,0.08)"}}>Val. moneda</th><th style={{...thR,width:130,background:"rgba(139,92,246,0.08)"}}>PnL · % moneda</th></>}
                    <th style={{...thR,width:isMobile?70:110}}>Rend %</th>
                  </tr>
                </thead>
                <tbody>{items.map(renderRow)}</tbody>
              </table>
            </div>
            )}
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

function OperacionesTab({trades,port,setTrades,setPort,card,livePrices,darkMode}){
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
    const remaining=newTrades.filter(t=>t.ticker===trade.ticker&&t.tipo==="compra");
    const sold=newTrades.filter(t=>t.ticker===trade.ticker&&t.tipo==="venta");
    const netQty=remaining.reduce((a,t)=>a+t.qty,0)-sold.reduce((a,t)=>a+t.qty,0);
    const totalCost=remaining.reduce((a,t)=>a+t.qty*t.price,0);
    const totalQty=remaining.reduce((a,t)=>a+t.qty,0);
    const newPpc=totalQty>0?totalCost/totalQty:0;

    if(netQty<=0){
      // Sin posición neta → eliminar del portfolio
      setPort(prev=>prev.filter(p=>p.ticker!==trade.ticker));
    } else {
      setPort(prev=>{
        const exists=prev.find(p=>p.ticker===trade.ticker);
        if(exists){
          // Actualizar qty y PPC
          return prev.map(p=>p.ticker===trade.ticker?{...p,qty:netQty,buyPrice:newPpc}:p);
        } else {
          // La posición no estaba en el portfolio → restaurar
          const firstBuy=[...remaining].sort((a,b)=>a.date.localeCompare(b.date))[0];
          // Inferir type desde el ticker si no está disponible
          const inferredType = trade.ticker?.match(/\d/)
            ? (firstBuy?.currency==="USD"||trade.currency==="USD" ? "bono_usd" : "bono_ars")
            : trade.type||firstBuy?.type||"accion_ar";
          const restoredPos={
            id: Date.now(),
            ticker: trade.ticker,
            name: firstBuy?.name||trade.name||trade.ticker,
            type: inferredType,
            qty: netQty,
            buyPrice: newPpc,
            buyCurrency: firstBuy?.currency||trade.currency||"ARS",
            currentPrice: newPpc,
            rendPct: 0,
            buyDate: firstBuy?.date||trade.date,
          };
          return [...prev, restoredPos];
        }
      });
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
        <div className={darkMode?"theme-dark":"theme-light"} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
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


function AnalisisTab({en, historicos, fxRate, currency, card, livePrices, hideAmounts=false, trades=[], isMobile=false}) {
  const PERIODS_AN = [
    {key:"todo",  label:"Todo el período", days:null, start:"2026-01-01"},
    {key:"ytd",   label:"YTD",             days:null, ytd:true},
    {key:"90d",   label:"90 días",          days:90},
    {key:"30d",   label:"30 días",          days:30},
  ];
  const [period, setPeriod] = useState("todo");
  const fmtU=(n,d=0)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:d}).format(n);
  const fmtP=(n,d=2)=>`${n>=0?"+":""}${parseFloat(n).toFixed(d)}%`;
  const pc=(n)=>n>=0?"var(--green)":"var(--red)";

  // Calcular fecha de inicio del período
  const getPeriodStart = (p) => {
    const today = todayAR();
    if(p.start) return p.start;
    if(p.ytd) return today.slice(0,4)+"-01-01";
    if(p.days){ const d=new Date(today); d.setDate(d.getDate()-p.days); return d.toISOString().slice(0,10); }
    return "2026-01-01";
  };
  const selP = PERIODS_AN.find(p=>p.key===period)||PERIODS_AN[0];
  const startDate = getPeriodStart(selP);
  const endDate = todayAR();

  // Calcular retorno de un activo en el período
  const calcReturn = (ticker, buyCurrency) => {
    const bars = historicos?.[ticker]||[];
    if(!bars.length) return null;
    const startBar = bars.filter(b=>b.date>=startDate)[0];
    const endBar = bars.filter(b=>b.date<=endDate).pop();
    if(!startBar||!endBar) return null;
    return ((endBar.close - startBar.close)/startBar.close)*100;
  };

  // Calcular max drawdown y max rally correctamente
  const calcExtremes = (bars, start, end) => {
    const f = bars.filter(b=>b.date>=start&&b.date<=end);
    if(f.length < 2) return null;

    // Max Drawdown: caída desde un pico hasta el valle subsiguiente
    let maxDD=0, ddStart="", ddTrough="", ddRecovery="";
    let peak=f[0].close, peakDate=f[0].date;
    for(const b of f){
      if(b.close>peak){ peak=b.close; peakDate=b.date; }
      const dd=(b.close-peak)/peak*100;
      if(dd<maxDD){ maxDD=dd; ddStart=peakDate; ddTrough=b.date; }
    }
    // Días de recuperación: desde el trough hasta que vuelve al nivel del pico
    if(ddTrough){
      const troughBar=f.find(b=>b.date===ddTrough);
      const peakVal=f.find(b=>b.date===ddStart)?.close||peak;
      const recovery=f.filter(b=>b.date>ddTrough&&b.close>=peakVal)[0];
      ddRecovery=recovery?recovery.date:"";
    }
    const ddDays = ddStart&&ddTrough ? Math.round((new Date(ddTrough)-new Date(ddStart))/(1000*60*60*24)) : 0;
    const recDays = ddTrough&&ddRecovery ? Math.round((new Date(ddRecovery)-new Date(ddTrough))/(1000*60*60*24)) : null;

    // Max Rally: suba desde un valle hasta el pico subsiguiente (sin overlap con el DD)
    let maxRally=0, rallyStart="", rallyEnd="";
    let trough2=f[0].close, troughDate2=f[0].date;
    for(const b of f){
      if(b.close<trough2){ trough2=b.close; troughDate2=b.date; }
      const rally=(b.close-trough2)/trough2*100;
      if(rally>maxRally){ maxRally=rally; rallyStart=troughDate2; rallyEnd=b.date; }
    }
    const rallyDays = rallyStart&&rallyEnd ? Math.round((new Date(rallyEnd)-new Date(rallyStart))/(1000*60*60*24)) : 0;

    return {maxDD, ddStart, ddTrough, ddRecovery, ddDays, recDays, maxRally, rallyStart, rallyEnd, rallyDays};
  };

  // Portfolio TWR — misma lógica que el gráfico principal
  // portSeries: calcular sin precios live para no recalcular al llegar precios
  // Los precios live solo afectan el último punto, no todo el histórico
  const portSeriesBase = useMemo(()=>{
    if(!historicos||!Object.keys(historicos).length) return [];
    const cclBars = historicos?.CCL||[];
    const mepBars = historicos?.MEP||[];
    const tickerBars = {};
    en.forEach(h=>{ const b=historicos?.[h.ticker]; if(b) tickerBars[h.ticker]=b; });
    const allDates = [...new Set(
      en.flatMap(h=>(historicos?.[h.ticker]||[]).map(b=>b.date))
    )].filter(d=>d>=startDate&&d<=endDate).sort();
    if(allDates.length<2) return [];
    if(allDates[allDates.length-1]!==endDate) allDates.push(endDate);
    const twr = calcTWR(allDates, trades, en, tickerBars, cclBars, mepBars, "USD_CCL", fxRate, {}, null, endDate);
    return twr.map(p=>({date:p.date, close:p.val}));
  },[en.map(h=>h.ticker).join(','), historicos, trades, startDate, endDate, fxRate]);
  // Alias para compatibilidad
  const portSeries = portSeriesBase;

  const [sortContrib, setSortContrib] = useState({col:"contrib", asc:false});
  const [mobileSection, setMobileSection] = useState("contribucion"); // mobile: acordeon
  const toggleSort = (col) => setSortContrib(prev => prev.col===col ? {...prev,asc:!prev.asc} : {col, asc:false});

  // Contribución al rendimiento — considera tenencia real en el período
  const contributions = useMemo(()=>{
    const cclBars = historicos?.CCL||[];
    // Cache de CCL por fecha para no re-buscar en cada activo
    const cclCache={};
    const getCCL=(date)=>{
      if(cclCache[date]) return cclCache[date];
      let lo=0,hi=cclBars.length-1,res=-1;
      while(lo<=hi){ const mid=(lo+hi)>>1; if(cclBars[mid].date<=date){res=mid;lo=mid+1;}else hi=mid-1; }
      const v = res>=0 ? cclBars[res].close : fxRate;
      cclCache[date]=v; return v;
    };
    const getUSDprice=(price,date,buyCurrency,qtyF)=>{
      if(buyCurrency==="USD") return price*qtyF;
      return price*qtyF/getCCL(date);
    };

    // Helper: precio más cercano a una fecha — bisección O(log n)
    const closestPrice = (bars, dateStr) => {
      if(!bars||!bars.length) return null;
      // Bisección para encontrar el último bar <= dateStr
      let lo=0, hi=bars.length-1, res=-1;
      while(lo<=hi){
        const mid=(lo+hi)>>1;
        if(bars[mid].date<=dateStr){ res=mid; lo=mid+1; }
        else hi=mid-1;
      }
      if(res>=0) return bars[res].close;
      return bars[0].close;
    };

    // Todos los tickers activos en el período: los que tengo hoy + los que tuve y vendí
    const tickersHoy = new Set(en.map(h=>h.ticker));

    // Detectar todos los tickers que tuve en algún momento pero ya no tengo
    // Un activo debe aparecer si:
    //   a) tuvo trades dentro del período, O
    //   b) tenía posición al inicio del período (lo compré antes y vendí antes o durante)
    const allTradeTickers = [...new Set(trades.map(t=>t.ticker))].filter(t=>!tickersHoy.has(t));

    const tickersCerrados = allTradeTickers.filter(ticker=>{
      // ¿Tuvo posición en algún momento del período [startDate, endDate]?
      const buysAll  = trades.filter(t=>t.ticker===ticker&&t.tipo==="compra");
      const sellsAll = trades.filter(t=>t.ticker===ticker&&t.tipo==="venta");
      if(!buysAll.length) return false;

      // Fecha de primera compra y última venta
      const firstBuy  = buysAll.map(t=>t.date).sort()[0];
      const lastSell  = sellsAll.map(t=>t.date).sort().pop()||endDate;

      // El activo estuvo en cartera si su rango [firstBuy, lastSell] se solapa con [startDate, endDate]
      return firstBuy <= endDate && lastSell >= startDate;
    });

    // Construir lista completa: posiciones actuales + cerradas en el período
    const posicionesCerradas = tickersCerrados.map(ticker=>{
      const allT = trades.filter(t=>t.ticker===ticker).sort((a,b)=>a.date.localeCompare(b.date));
      const firstTrade = allT[0];
      const currency = firstTrade?.currency||"ARS";
      // Inferir si es bono: ticker termina en D (USD) o tiene historial de bono
      // Convención BYMA: bonos USD terminan en D, bonos ARS sin D pero con suffix numérico
      const isBondTicker = /\d/.test(ticker); // tiene número → probablemente bono
      const inferredType = currency==="USD"
        ? (isBondTicker?"bono_usd":"accion_usd")
        : (isBondTicker?"bono_ars":"accion_ar");
      return {
        ticker,
        name: firstTrade?.name||ticker,
        type: inferredType,
        buyCurrency: currency,
        qty: 0,
        buyPrice: firstTrade?.price||0,
        buyDate: firstTrade?.date||startDate,
        cerrado: true,
      };
    });
    const todasPosiciones = [...en.map(h=>({...h,cerrado:false})), ...posicionesCerradas];

    // Reconstruir qty de cada ticker al inicio del período desde trades
    // Usar <= startDate para incluir los comprados el mismo día de inicio
    // cashCompras/cashVentas excluirán esos trades usando > startDate
    const qtyAtStart = {};
    const allTickers = [...new Set(todasPosiciones.map(h=>h.ticker))];
    allTickers.forEach(ticker=>{
      const buys  = trades.filter(t=>t.ticker===ticker&&t.tipo==="compra"&&t.date<=startDate);
      const sells = trades.filter(t=>t.ticker===ticker&&t.tipo==="venta"&&t.date<=startDate);
      const qty = buys.reduce((a,t)=>a+t.qty,0) - sells.reduce((a,t)=>a+t.qty,0);
      qtyAtStart[ticker] = Math.max(0, qty);
    });

    return todasPosiciones.map(h=>{
      const bars = historicos?.[h.ticker]||[];
      const endBar = [...bars].filter(b=>b.date<=endDate).pop();
      if(!endBar) return null;
      const isBond = h.type==="bono_usd"||h.type==="bono_ars";

      // Qty al inicio del período (puede ser 0 si fue comprado después)
      const qtyStart = qtyAtStart[h.ticker]||0;
      // Qty actual (la de en[])
      const qtyEnd = h.qty;

      // Si no tenía nada al inicio Y no compró durante el período → saltar
      if(qtyStart===0 && qtyEnd===0) return null;

      // Precio base: si tenía posición al inicio → usar precio histórico del startDate
      //              si compró durante el período → usar precio promedio de compras del período
      let basePrice, baseDate, usedBuyPrice=false, qtyBase;

      if(qtyStart > 0){
        // Tenía posición al inicio — base = precio al startDate
        const startPrice = closestPrice(bars, startDate);
        if(startPrice){
          basePrice = startPrice;
          // Buscar la fecha real de la barra usada
          const before = bars.filter(b=>b.date<=startDate);
          baseDate  = before.length ? before[before.length-1].date : startDate;
          qtyBase   = qtyStart;
        } else {
          // Sin historial — usar precio de compra
          basePrice = h.buyPrice||0;
          baseDate  = startDate;
          qtyBase   = qtyStart;
          usedBuyPrice = true;
        }
      } else {
        // Comprado durante el período — base para retPct = precio histórico al inicio si existe
        // (para mostrar cómo se movió el activo en el período aunque no lo tuvieras)
        const startPrice2 = closestPrice(bars, startDate);
        if(startPrice2){
          basePrice = startPrice2;
          const before2 = bars.filter(b=>b.date<=startDate);
          baseDate  = before2.length ? before2[before2.length-1].date : startDate;
          usedBuyPrice = false; // hay precio real
        } else {
          // Sin historial — usar primer precio de compra del período
          const periodBuys = trades.filter(t=>t.ticker===h.ticker&&t.tipo==="compra"&&t.date>=startDate&&t.date<=endDate);
          const totalQty = periodBuys.reduce((a,t)=>a+t.qty,0);
          const totalCost= periodBuys.reduce((a,t)=>a+t.qty*t.price,0);
          basePrice = totalQty>0 ? totalCost/totalQty : h.buyPrice||0;
          baseDate  = periodBuys[0]?.date||startDate;
          usedBuyPrice = true;
        }
        qtyBase = 0; // no tenía posición al inicio → valInicio = 0
        // Recalcular periodBuysCF incluyendo el startDate para el caso de compra en startDate
        const allPeriodBuys = trades.filter(t=>t.ticker===h.ticker&&t.tipo==="compra"&&t.date>=startDate&&t.date<=endDate);
        if(allPeriodBuys.length && !basePrice){
          const totalQtyP = allPeriodBuys.reduce((a,t)=>a+t.qty,0);
          const totalCostP= allPeriodBuys.reduce((a,t)=>a+t.qty*t.price,0);
          basePrice = totalQtyP>0 ? totalCostP/totalQtyP : h.buyPrice||0;
          baseDate  = allPeriodBuys[0]?.date||startDate;
          usedBuyPrice = true;
        }
      }

      if(!basePrice) return null;

      // Normalizar escala bonos ARS
      let adjClose = endBar.close;
      let adjBase  = basePrice;
      if(isBond && h.buyCurrency==="ARS" && adjBase>0){
        const ratio = adjClose/adjBase;
        if(ratio > 50)  adjClose = adjClose/100;
        if(ratio < 0.02) adjBase  = adjBase/100;
      }

      // Rend. %: rendimiento del precio en el período (siempre precio base → precio actual)
      const retPct = ((adjClose - adjBase)/adjBase)*100;

      // P&L real del período usando flujos de caja:
      // P&L = valor_final - valor_inicial - compras_del_período + ventas_del_período
      const qtyFactor = (qty) => isBond ? qty/100 : qty;
      const toCCL     = (price, date) => {
        if(h.buyCurrency==="USD") return price;
        const cclBar = cclBars.filter(b=>b.date<=date).pop();
        return price / (cclBar?.close||fxRate);
      };

      // Valor al inicio del período (qtyStart × precio al inicio)
      const valInicio = qtyStart>0 ? toCCL(adjBase, baseDate) * qtyFactor(qtyStart) : 0;

      // Valor al final del período (qtyEnd × precio actual)
      const valFinal = toCCL(adjClose, endDate) * qtyFactor(qtyEnd);

      // Compras durante el período (cash saliente → resta)
      // Usar > startDate para no doble-contar compras del día inicial (ya en qtyAtStart)
      const periodBuysCF  = trades.filter(t=>t.ticker===h.ticker&&t.tipo==="compra"&&t.date>startDate&&t.date<=endDate);
      const cashCompras = periodBuysCF.reduce((a,t)=>{
        const f = isBond ? t.qty/100 : t.qty;
        return a + toCCL(t.price, t.date) * f;
      }, 0);

      // Ventas durante el período (cash entrante → suma)
      // Usar > startDate para no doble-contar ventas del día inicial
      const periodSellsCF = trades.filter(t=>t.ticker===h.ticker&&t.tipo==="venta"&&t.date>startDate&&t.date<=endDate);
      const cashVentas = periodSellsCF.reduce((a,t)=>{
        const f = isBond ? t.qty/100 : t.qty;
        return a + toCCL(t.price, t.date) * f;
      }, 0);

      // Para posiciones cerradas (qty=0): P&L = -cashCompras + cashVentas + valInicio_vendido
      // (valFinal = 0 porque ya no lo tenemos)
      const pnlUSD = valFinal - valInicio - cashCompras + cashVentas;
      const valEnd = valFinal;

      // Rend % para cerrados: usar precio de venta vs precio base
      let retPctFinal = retPct;
      if(h.cerrado){
        // Calcular qty total operada en el período para el rend %
        const qtyCerrada = periodSellsCF.reduce((a,t)=>a+t.qty,0)||periodBuysCF.reduce((a,t)=>a+t.qty,0)||1;
        const qtyF = isBond ? qtyCerrada/100 : qtyCerrada;
        if(valInicio===0 && cashCompras>0 && cashVentas>0){
          // Comprado y vendido dentro del período
          const avgBuy  = cashCompras / qtyF;
          const avgSell = cashVentas  / qtyF;
          if(avgBuy>0) retPctFinal = ((avgSell-avgBuy)/avgBuy)*100;
        } else if(valInicio>0 && cashVentas>0){
          // Tenía al inicio y vendió: rend del precio desde inicio
          retPctFinal = retPct; // ya calculado arriba
        }
      }

      return {...h, retPct:retPctFinal, pnlUSD, valBuy:valInicio, valEnd, basePrice:adjBase, adjClose,
               usedBuyPrice, baseDate, qtyStart, buyPrice:h.buyPrice||0, cerrado:h.cerrado||false};
    }).filter(Boolean);
  },[en,historicos,trades,startDate,endDate,fxRate,period]);

  const contributionsSorted = useMemo(()=>{
    const arr = [...contributions];
    const {col, asc} = sortContrib;
    const dir = asc ? 1 : -1;
    if(col==="pnl")    arr.sort((a,b)=>(a.pnlUSD-b.pnlUSD)*dir);
    else if(col==="rend")   arr.sort((a,b)=>(a.retPct-b.retPct)*dir);
    else arr.sort((a,b)=>(Math.abs(a.pnlUSD)-Math.abs(b.pnlUSD))*dir); // contrib
    return arr;
  },[contributions,sortContrib,period]);

  const totalPnlUSD = contributions.reduce((a,c)=>a+c.pnlUSD,0);

  // Extremos del portfolio y S&P
  const portExtremes = useMemo(()=>calcExtremes(portSeries,startDate,endDate),[portSeries,startDate,endDate]);
  const spBars = historicos?.sp500||[];
  const spExtremes = useMemo(()=>calcExtremes(spBars,startDate,endDate),[spBars,startDate,endDate]);
  const spReturn = calcReturn("sp500","USD");

  // Distribución de retornos diarios del portfolio
  const dailyReturns = useMemo(()=>{
    const rets=[];
    for(let i=1;i<portSeries.length;i++){
      if(portSeries[i-1].close>0) rets.push(((portSeries[i].close-portSeries[i-1].close)/portSeries[i-1].close)*100);
    }
    return rets;
  },[portSeries]);

  const fmtDate = d=>d?d.slice(8)+"/"+d.slice(5,7)+"/"+d.slice(0,4):"—";
  const btnStyle = (active)=>({
    padding:"4px 12px",borderRadius:6,border:"1px solid var(--border)",cursor:"pointer",fontSize:11,fontWeight:active?700:400,
    background:active?"var(--accent)":"var(--bg-input)",color:active?"#fff":"var(--text-secondary)"
  });
  const sectionTitle = (t)=>(
    <div style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:12}}>{t}</div>
  );

  // Mobile: tabs de sección
  const MOBILE_SECTIONS = [
    {k:"contribucion", l:"Contribución"},
    {k:"extremos", l:"Extremos"},
    {k:"retornos", l:"Retornos"},
    {k:"correlacion", l:"Correlación"},
  ];

  return(
    <div className="fi" style={{display:"grid",gap:isMobile?10:16}}>

      {/* Selector de período */}
      <div style={{display:"flex",gap:isMobile?4:8,alignItems:"center",flexWrap:"wrap"}}>
        {PERIODS_AN.map(p=>(
          <button key={p.key} onClick={()=>setPeriod(p.key)} style={{...btnStyle(period===p.key),padding:isMobile?"4px 10px":"4px 12px",fontSize:isMobile?11:11}}>{p.label}</button>
        ))}
        <span style={{fontSize:10,color:"var(--text-muted)",marginLeft:4}}>{fmtDate(startDate)} → {fmtDate(endDate)}</span>
      </div>

      {/* Mobile: tabs de sección */}
      {isMobile&&(
        <div style={{display:"flex",gap:0,background:"var(--bg-input)",borderRadius:8,padding:2,overflowX:"auto"}}>
          {MOBILE_SECTIONS.map(s=>(
            <button key={s.k} onClick={()=>setMobileSection(s.k)}
              style={{flex:1,padding:"6px 8px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,
                fontWeight:mobileSection===s.k?600:400,whiteSpace:"nowrap",
                background:mobileSection===s.k?"var(--accent)":"transparent",
                color:mobileSection===s.k?"#fff":"var(--text-secondary)"}}>
              {s.l}
            </button>
          ))}
        </div>
      )}

      {/* ── Sección filtrada por período ───────────────────────────────────── */}
      <div style={{border:"1px solid rgba(59,130,246,0.15)",borderRadius:12,padding:isMobile?"10px":"16px",display:"grid",gap:isMobile?10:16,background:"rgba(59,130,246,0.02)"}}>
      {!isMobile&&<div style={{fontSize:10,color:"rgba(96,165,250,0.6)",textTransform:"uppercase",letterSpacing:1,marginBottom:-8}}>↕ Aplica filtro de período</div>}

      {/* Fila superior: Extremos Portfolio + S&P */}
      {(!isMobile||mobileSection==="extremos")&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
        {[
          {label:"📊 Mi Portfolio", ex:portExtremes},
          {label:"🇺🇸 S&P 500",      ex:spExtremes},
        ].map(({label,ex})=>(
          <div key={label} style={{...card,padding:"16px 20px"}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text-primary)",marginBottom:12}}>{label}</div>
            {ex ? (
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
                {/* Mayor caída */}
                <div style={{background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:8,padding:"12px 14px"}}>
                  <div style={{fontSize:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Mayor caída</div>
                  <div style={{fontSize:isMobile?18:22,fontWeight:700,color:"var(--red)",fontFamily:"'DM Mono',monospace"}}>{fmtP(ex.maxDD)}</div>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginTop:6}}>
                    <span>{fmtDate(ex.ddStart)}</span>
                    <span style={{margin:"0 4px"}}>→</span>
                    <span>{fmtDate(ex.ddTrough)}</span>
                  </div>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3}}>
                    {ex.ddDays} días de caída
                  </div>
                  {ex.recDays!=null
                    ? <div style={{fontSize:10,color:"var(--green)",marginTop:3}}>✓ Recuperó en {ex.recDays} días</div>
                    : ex.ddTrough ? <div style={{fontSize:10,color:"var(--yellow)",marginTop:3}}>⏳ Sin recuperar aún</div> : null
                  }
                </div>
                {/* Mayor rally */}
                <div style={{background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:8,padding:"12px 14px"}}>
                  <div style={{fontSize:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Mayor rally</div>
                  <div style={{fontSize:isMobile?18:22,fontWeight:700,color:"var(--green)",fontFamily:"'DM Mono',monospace"}}>{fmtP(ex.maxRally)}</div>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginTop:6}}>
                    <span>{fmtDate(ex.rallyStart)}</span>
                    <span style={{margin:"0 4px"}}>→</span>
                    <span>{fmtDate(ex.rallyEnd)}</span>
                  </div>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3}}>
                    {ex.rallyDays} días de suba
                  </div>
                </div>
              </div>
            ) : <div style={{color:"var(--text-muted)",fontSize:12}}>Sin datos suficientes</div>}
          </div>
        ))}
      </div>}

      {/* Contribución al rendimiento */}
      {(!isMobile||mobileSection==="contribucion")&&<div style={{...card,padding:isMobile?"10px 12px":"16px 20px"}}>
        {sectionTitle("Contribución al rendimiento · " + (selP.key==="todo"?"desde precio de compra":"rendimiento del período"))}

        {isMobile ? (
          /* Mobile: filas compactas con barra */
          <div style={{display:"flex",flexDirection:"column",gap:1,marginTop:8}}>
            {/* Sort rápido mobile */}
            <div style={{display:"flex",gap:4,marginBottom:8}}>
              {[["contrib","Contrib."],["pnl","P&L"],["rend","Rend."]].map(([k,l])=>(
                <button key={k} onClick={()=>toggleSort(k)}
                  style={{flex:1,padding:"4px 0",borderRadius:5,border:"1px solid var(--border)",
                    fontSize:10,fontWeight:sortContrib.col===k?700:400,cursor:"pointer",
                    background:sortContrib.col===k?"var(--accent)":"var(--bg-input)",
                    color:sortContrib.col===k?"#fff":"var(--text-secondary)"}}>
                  {l}{sortContrib.col===k?(sortContrib.asc?" ↑":" ↓"):""}
                </button>
              ))}
            </div>
            {contributionsSorted.map(h=>{
              const contrib = totalPnlUSD!==0 ? (h.pnlUSD/Math.abs(totalPnlUSD))*100 : 0;
              const barW = Math.min(100,Math.abs(contrib));
              return(
                <div key={h.ticker} style={{padding:"8px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontWeight:700,fontFamily:"monospace",color:h.cerrado?"var(--text-muted)":"var(--accent)",fontSize:12}}>{h.ticker}</span>
                      {h.cerrado&&<span style={{fontSize:8,background:"rgba(255,255,255,0.08)",borderRadius:3,padding:"1px 4px",color:"var(--text-muted)"}}>CERRADO</span>}
                      <span style={{fontSize:10,color:"var(--text-muted)"}}>{ASSET_TYPES[h.type]?.icon}</span>
                    </div>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <span style={{fontSize:11,fontWeight:600,color:pc(h.retPct)}}>{fmtP(h.retPct)}</span>
                      <span style={{fontSize:11,color:pc(h.pnlUSD)}}>{hideAmounts?"••••":(h.pnlUSD>=0?"+":"")+fmtU(h.pnlUSD,0)}</span>
                      <span style={{fontSize:11,fontWeight:700,color:pc(contrib),minWidth:44,textAlign:"right"}}>{fmtP(contrib)}</span>
                    </div>
                  </div>
                  <div style={{height:4,borderRadius:2,background:"var(--bg-input)",overflow:"hidden"}}>
                    <div style={{height:"100%",width:barW+"%",background:contrib>=0?"var(--green)":"var(--red)",borderRadius:2}}/>
                  </div>
                </div>
              );
            })}
            <div style={{display:"flex",justifyContent:"space-between",padding:"8px 4px",borderTop:"1px solid var(--border)",fontWeight:700,fontSize:12}}>
              <span>Total</span>
              <span style={{color:pc(totalPnlUSD)}}>{hideAmounts?"••••":(totalPnlUSD>=0?"+":"")+fmtU(totalPnlUSD,0)}</span>
            </div>
          </div>
        ) : (
        <div style={{overflowX:"auto"}}>
          {(()=>{
            const SortTh = ({col, label, align="right"}) => {
              const active = sortContrib.col===col;
              const arrow  = active ? (sortContrib.asc ? " ↑" : " ↓") : "";
              return (
                <th onClick={()=>toggleSort(col)}
                  style={{padding:"6px 12px",textAlign:align,fontSize:10,fontWeight:active?700:600,
                    color:active?"var(--accent)":"var(--text-muted)",textTransform:"uppercase",
                    letterSpacing:0.8,whiteSpace:"nowrap",cursor:"pointer",userSelect:"none"}}>
                  {label}{arrow}
                </th>
              );
            };
          return (<>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:"1px solid var(--border)"}}>
                <th style={{padding:"6px 12px",textAlign:"left",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.8}}>Activo</th>
                <th style={{padding:"6px 12px",textAlign:"left",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.8}}>Tipo</th>
                {selP.key!=="todo"&&<th style={{padding:"6px 12px",textAlign:"right",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.8}}>Precio base</th>}
                <SortTh col="rend"   label="Rend. total"/>
                <SortTh col="pnl"    label="P&L USD"/>
                <SortTh col="contrib" label="Contribución"/>
                <th style={{padding:"6px 12px",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.8}}>Barra</th>
              </tr>
            </thead>
            <tbody>
              {contributionsSorted.map(h=>{
                const contrib = totalPnlUSD!==0 ? (h.pnlUSD/Math.abs(totalPnlUSD))*100 : 0;
                const barW = Math.min(100,Math.abs(contrib));
                return(
                  <tr key={h.ticker} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <td style={{padding:"8px 12px"}}>
                      <span style={{fontWeight:700,fontFamily:"'DM Mono',monospace",color:h.cerrado?"var(--text-muted)":"var(--accent)",fontSize:12}}>{h.ticker}</span>
                      {h.cerrado&&<span style={{marginLeft:6,fontSize:9,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:4,padding:"1px 5px",color:"var(--text-muted)",verticalAlign:"middle"}}>CERRADO</span>}
                    </td>
                    <td style={{padding:"8px 12px",fontSize:10,color:"var(--text-muted)"}}>{ASSET_TYPES[h.type]?.icon} {ASSET_TYPES[h.type]?.label}</td>
                    {selP.key!=="todo"&&(
                      <td style={{padding:"8px 12px",textAlign:"right",fontSize:10}}>
                        <span style={{color:h.usedBuyPrice?"var(--yellow)":"var(--text-muted)",fontFamily:"'DM Mono',monospace"}}>
                          {h.buyCurrency==="USD"?fmtU(h.basePrice,2):`$${h.basePrice.toLocaleString("es-AR",{maximumFractionDigits:2})}`}
                        </span>
                        {h.usedBuyPrice&&<span title="Sin historial para este período — se usó precio de compra" style={{marginLeft:4,color:"var(--yellow)",fontSize:9}}>★pc</span>}
                      </td>
                    )}
                    <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:pc(h.retPct)}}>{fmtP(h.retPct)}</td>
                    <td style={{padding:"8px 12px",textAlign:"right",color:pc(h.pnlUSD)}}>{hideAmounts?"••••":(h.pnlUSD>=0?"+":"")+fmtU(h.pnlUSD,0)}</td>
                    <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:pc(contrib)}}>{fmtP(contrib)}</td>
                    <td style={{padding:"8px 12px",width:120}}>
                      <div style={{height:6,borderRadius:3,background:"var(--bg-input)",overflow:"hidden"}}>
                        <div style={{height:"100%",width:barW+"%",background:contrib>=0?"var(--green)":"var(--red)",borderRadius:3,transition:"width 0.3s"}}/>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{borderTop:"1px solid var(--border)"}}>
                <td colSpan={3} style={{padding:"8px 12px",fontWeight:700,fontSize:12}}>Total</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:pc(totalPnlUSD)}}>{hideAmounts?"••••":(totalPnlUSD>=0?"+":"")+fmtU(totalPnlUSD,0)}</td>
                <td colSpan={2}/>
              </tr>
            </tfoot>
          </table>
          {selP.key!=="todo" && contributionsSorted.some(h=>h.usedBuyPrice) && (
            <div style={{marginTop:8,fontSize:11,color:"var(--yellow)",display:"flex",gap:6,alignItems:"center"}}>
              <span>★pc</span>
              <span>= sin datos históricos para este período — se usó precio de compra como base.</span>
            </div>
          )}
          </>);})()}
        </div>
        )}
      </div>}

      {(!isMobile||mobileSection==="retornos")&&<>{/* Retornos diarios — versión legible */}
      <div style={{...card,padding:"16px 20px"}}>
        {sectionTitle("Estadísticas de retornos diarios")}
        {(()=>{
          if(dailyReturns.length<5) return <div style={{color:"var(--text-muted)",fontSize:12}}>Sin datos suficientes</div>;
          const avg = dailyReturns.reduce((a,b)=>a+b,0)/dailyReturns.length;
          const std = Math.sqrt(dailyReturns.reduce((a,b)=>a+(b-avg)**2,0)/dailyReturns.length);
          const pos = dailyReturns.filter(r=>r>0).length;
          const neg = dailyReturns.filter(r=>r<=0).length;
          const maxR = Math.max(...dailyReturns);
          const minR = Math.min(...dailyReturns);
          const volAnual = std * Math.sqrt(252);
          const pctPos = (pos/dailyReturns.length*100).toFixed(0);

          // Agrupar por rangos simples
          const rangos = [
            {l:"< -2%",    count:dailyReturns.filter(r=>r<-2).length,    c:"#ef4444"},
            {l:"-2% a -1%",count:dailyReturns.filter(r=>r>=-2&&r<-1).length, c:"#f87171"},
            {l:"-1% a 0%", count:dailyReturns.filter(r=>r>=-1&&r<0).length,  c:"#fca5a5"},
            {l:"0% a +1%", count:dailyReturns.filter(r=>r>=0&&r<1).length,   c:"#86efac"},
            {l:"+1% a +2%",count:dailyReturns.filter(r=>r>=1&&r<2).length,   c:"#4ade80"},
            {l:"> +2%",    count:dailyReturns.filter(r=>r>=2).length,     c:"#22c55e"},
          ];
          const maxCount = Math.max(...rangos.map(r=>r.count));

          return(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?12:20}}>
              {/* Barras por rango */}
              <div>
                <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Días por rango de retorno</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {rangos.map(({l,count,c})=>(
                    <div key={l} style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:11,color:"var(--text-muted)",minWidth:80,textAlign:"right"}}>{l}</span>
                      <div style={{flex:1,height:18,background:"var(--bg-input)",borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${maxCount>0?(count/maxCount*100):0}%`,background:c,borderRadius:4,transition:"width 0.3s"}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:600,color:c,minWidth:28,textAlign:"right"}}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* KPIs */}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Métricas clave</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr",gap:8}}>
                  {[
                    {l:"Días positivos", v:`${pos} (${pctPos}%)`, c:"var(--green)"},
                    {l:"Días negativos", v:`${neg} (${(100-parseInt(pctPos))}%)`, c:"var(--red)"},
                    {l:"Retorno promedio", v:fmtP(avg), c:pc(avg)},
                    {l:"Volatilidad anualizada", v:fmtP(volAnual), c:"var(--text-secondary)"},
                    {l:"Mejor día", v:fmtP(maxR), c:"var(--green)"},
                    {l:"Peor día", v:fmtP(minR), c:"var(--red)"},
                  ].map(({l,v,c})=>(
                    <div key={l} style={{background:"var(--bg-input)",borderRadius:7,padding:"8px 10px"}}>
                      <div style={{fontSize:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.8,marginBottom:3}}>{l}</div>
                      <div style={{fontSize:14,fontWeight:700,color:c,fontFamily:"'DM Mono',monospace"}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      </>}

      </div>{/* /filtered-block */}

      {/* Correlación entre activos — SIN filtro de período */}
      {(!isMobile||mobileSection==="correlacion")&&<div style={{...card,padding:isMobile?"10px 12px":"16px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"flex-start":"center",flexDirection:isMobile?"column":"row",gap:isMobile?6:0,marginBottom:12}}>
          {sectionTitle("Correlación entre activos · retornos diarios")}
          <span style={{fontSize:10,color:"var(--text-muted)",fontStyle:"italic",background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:5,padding:"2px 8px"}}>⚠ Usa todo el histórico · no aplica filtro</span>
        </div>
        {(()=>{
          // Correlación usa TODO el histórico disponible — sin filtro de período
          const activos = en.filter(h=>{
            const bars=(historicos?.[h.ticker]||[]);
            return bars.length>=10;
          }).slice(0,8);

          if(activos.length<2) return <div style={{color:"var(--text-muted)",fontSize:12}}>Se necesitan al menos 2 activos con datos</div>;

          // Retornos diarios sobre todo el histórico
          const rets = activos.map(h=>{
            const bars=(historicos?.[h.ticker]||[]).slice().sort((a,b)=>a.date.localeCompare(b.date));
            const r=[];
            for(let i=1;i<bars.length;i++) r.push((bars[i].close-bars[i-1].close)/bars[i-1].close);
            return {ticker:h.ticker, rets:r};
          });

          // Matriz de correlación
          const corr = (a,b) => {
            const n=Math.min(a.length,b.length);
            if(n<3) return null;
            const ax=a.slice(-n), bx=b.slice(-n);
            const ma=ax.reduce((s,v)=>s+v,0)/n, mb=bx.reduce((s,v)=>s+v,0)/n;
            let num=0,da=0,db=0;
            for(let i=0;i<n;i++){ num+=(ax[i]-ma)*(bx[i]-mb); da+=(ax[i]-ma)**2; db+=(bx[i]-mb)**2; }
            return da&&db ? num/Math.sqrt(da*db) : null;
          };

          const corrColor = (v) => {
            if(v===null) return "var(--bg-input)";
            const abs=Math.abs(v);
            if(v>0.7) return `rgba(52,211,153,${0.3+abs*0.5})`;
            if(v>0.3) return `rgba(52,211,153,${0.1+abs*0.3})`;
            if(v<-0.7) return `rgba(248,113,113,${0.3+abs*0.5})`;
            if(v<-0.3) return `rgba(248,113,113,${0.1+abs*0.3})`;
            return "rgba(255,255,255,0.05)";
          };

          // ── Métricas de riesgo ponderadas ───────────────────────────────────
          // Pesos en cartera basados en valEnd (USD)
          const totalVal = contributions.reduce((a,c)=>a+Math.max(0,c.valEnd||0),0)||1;
          const weights  = activos.map(h=>{
            const c = contributions.find(c=>c.ticker===h.ticker);
            return c ? Math.max(0,c.valEnd||0)/totalVal : 0;
          });

          // Volatilidad diaria de cada activo (std dev de retornos diarios)
          const vols = rets.map(r=>{
            const n=r.rets.length; if(n<2) return 0;
            const mu=r.rets.reduce((a,b)=>a+b,0)/n;
            return Math.sqrt(r.rets.reduce((a,b)=>a+(b-mu)**2,0)/n);
          });

          // Volatilidad ponderada simple (sin correlaciones) — benchmark
          const volWeighted = vols.reduce((a,v,i)=>a+weights[i]*v,0) * Math.sqrt(252) * 100;

          // Volatilidad real del portfolio (con correlaciones) — fórmula matricial
          // σ_p² = Σ_i Σ_j w_i * w_j * σ_i * σ_j * ρ_ij
          let varPort = 0;
          for(let i=0;i<activos.length;i++){
            for(let j=0;j<activos.length;j++){
              const rho = i===j ? 1 : (corr(rets[i].rets,rets[j].rets)||0);
              varPort += weights[i]*weights[j]*vols[i]*vols[j]*rho;
            }
          }
          const volPort = Math.sqrt(Math.max(0,varPort)) * Math.sqrt(252) * 100;

          // Ratio de diversificación: vol_ponderada / vol_portfolio (>1 = diversificación efectiva)
          const divRatio = volWeighted>0 ? volWeighted/volPort : 1;

          // Contribución marginal al riesgo de cada activo
          // MCTR_i = w_i * Σ_j (w_j * σ_i * σ_j * ρ_ij) / σ_p
          const sigmaP = Math.sqrt(Math.max(0,varPort));
          const mctr = activos.map((_,i)=>{
            if(sigmaP===0) return 0;
            let cov_ip=0;
            for(let j=0;j<activos.length;j++){
              const rho=i===j?1:(corr(rets[i].rets,rets[j].rets)||0);
              cov_ip+=weights[j]*vols[i]*vols[j]*rho;
            }
            return weights[i]*cov_ip/sigmaP;
          });
          const mctrTotal = mctr.reduce((a,b)=>a+b,0)||1;
          const riskContrib = mctr.map(m=>m/mctrTotal*100); // % de riesgo total

          // Correlación promedio de cada activo con el resto (diversificador = menor valor)
          const avgCorr = activos.map((_,i)=>{
            const others = activos.map((_,j)=>j!==i?corr(rets[i].rets,rets[j].rets):null).filter(v=>v!=null);
            return others.length ? others.reduce((a,b)=>a+b,0)/others.length : 0;
          });
          const bestDiversifier = activos[avgCorr.indexOf(Math.min(...avgCorr))];

          // HHI de concentración por riesgo
          const hhi = riskContrib.reduce((a,b)=>a+(b/100)**2,0);
          const nEff = hhi>0 ? (1/hhi).toFixed(1) : activos.length; // activos "efectivos"

          return(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"auto 1fr",gap:isMobile?16:24,alignItems:"start"}}>
              {/* Matriz */}
              <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                <div>
                  <table style={{borderCollapse:"collapse",fontSize:isMobile?10:11}}>
                    <thead>
                      <tr>
                        <th style={{padding:"6px 10px",width:60}}/>
                        {activos.map(h=>(
                          <th key={h.ticker} style={{padding:"6px 10px",textAlign:"center",color:"var(--accent)",fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{h.ticker}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activos.map((ha,i)=>(
                        <tr key={ha.ticker}>
                          <td style={{padding:"4px 10px",color:"var(--accent)",fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{ha.ticker}</td>
                          {activos.map((hb,j)=>{
                            const v = i===j ? 1 : corr(rets[i].rets, rets[j].rets);
                            return(
                              <td key={hb.ticker} style={{padding:"4px 8px",textAlign:"center",background:corrColor(v),borderRadius:4,fontSize:11,fontWeight:i===j?700:400,color:i===j?"var(--text-primary)":v!=null?(Math.abs(v)>0.5?"var(--text-primary)":"var(--text-secondary)"):"var(--text-muted)"}}>
                                {v!=null ? (i===j?"1.00":v.toFixed(2)) : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{marginTop:10,display:"flex",gap:16,fontSize:10,color:"var(--text-muted)"}}>
                  <span><span style={{color:"var(--green)"}}>■</span> Correlación positiva (&gt;0.7)</span>
                  <span><span style={{color:"var(--red)"}}>■</span> Correlación negativa (&lt;-0.7)</span>
                </div>
              </div>

              {/* Panel de riesgo */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Riesgo del portfolio</div>

                {/* KPIs principales */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMobile?6:8}}>
                  {(()=>{
                    // Semáforo vol. portfolio: <8% verde, 8-15% amarillo, >15% rojo
                    const volColor = volPort<8 ? "var(--green)" : volPort<15 ? "var(--yellow)" : "var(--red)";
                    const volMsg   = volPort<8
                      ? "✓ Volatilidad baja — cartera conservadora"
                      : volPort<15
                      ? "⚠ Volatilidad moderada — nivel aceptable pero atención"
                      : "✗ Volatilidad alta — la cartera oscila demasiado";
                    const ratioColor = divRatio>1.5?"var(--green)":divRatio>1.1?"var(--yellow)":"var(--red)";
                    const ratioMsg   = divRatio>1.5
                      ? "✓ Buena diversificación — los activos se compensan bien"
                      : divRatio>1.1
                      ? "⚠ Diversificación moderada — podrías mejorarla"
                      : "✗ Poca diversificación — los activos se mueven muy juntos";
                    const nEffNum = parseFloat(nEff);
                    const nEffColor = nEffNum/activos.length>0.6?"var(--green)":nEffNum/activos.length>0.4?"var(--yellow)":"var(--red)";
                    const nEffMsg   = nEffNum/activos.length>0.6
                      ? "✓ Buena variedad — tus activos son realmente distintos"
                      : nEffNum/activos.length>0.4
                      ? "⚠ Variedad moderada — algunos activos se solapan"
                      : "✗ Poca variedad real — varios activos se mueven igual";
                    const kpis = [
                      {l:"Vol. portfolio", v:volPort.toFixed(1)+"%", c:volColor, msg:volMsg,
                        tip:"Cuánto oscila tu cartera en conjunto por año. Ej: 7.8% sobre US$10.000 = ±US$780 en un año típico."},
                      {l:"Vol. sin diversif.", v:volWeighted.toFixed(1)+"%", c:"var(--text-secondary)", msg:"= suma de vol. de cada activo × su peso. Siempre mayor que la real.",
                        tip:"Si todos tus activos cayeran al mismo tiempo (el peor caso), esta sería la volatilidad. La diferencia con Vol. Portfolio muestra cuánto te protege la diversificación."},
                      {l:"Ratio diversific.", v:"×"+divRatio.toFixed(2), c:ratioColor, msg:ratioMsg,
                        tip:"Vol. sin diversif. ÷ Vol. portfolio. ×2 = tu cartera tiene la mitad del riesgo del peor caso."},
                      {l:"Activos efectivos", v:nEff+" / "+activos.length, c:nEffColor, msg:nEffMsg,
                        tip:"Cuántos activos realmente distintos tenés. Si tenés 4 CEDEARs muy correlacionados, se cuentan casi como 1."},
                    ];
                    return kpis.map(({l,v,c,msg,tip})=>(
                      <div key={l} title={tip}
                        style={{background:"var(--bg-input)",borderRadius:8,padding:"10px 12px",cursor:"help",
                          borderLeft:"3px solid "+c}}>
                        <div style={{fontSize:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.8,marginBottom:2,display:"flex",alignItems:"center",gap:4}}>
                          {l} <span style={{fontSize:9,opacity:0.4}}>ⓘ</span>
                        </div>
                        <div style={{fontSize:16,fontWeight:700,color:c,fontFamily:"'DM Mono',monospace"}}>{v}</div>
                        <div style={{fontSize:10,color:c,marginTop:4,opacity:0.85}}>{msg}</div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Contribución al riesgo por activo — ordenado de mayor a menor */}
                <div>
                  <div style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>
                    Contribución al riesgo
                    <span style={{fontWeight:400,marginLeft:6,textTransform:"none",letterSpacing:0,fontStyle:"italic"}}>— qué % del riesgo total aporta cada activo (peso × volatilidad × correlación)</span>
                  </div>
                  {activos.map((h,i)=>({ticker:h.ticker, val:riskContrib[i], i}))
                    .sort((a,b)=>b.val-a.val)
                    .map(({ticker,val})=>(
                    <div key={ticker} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                      <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"var(--accent)",minWidth:56,fontWeight:600}}>{ticker}</span>
                      <div style={{flex:1,height:14,background:"var(--bg-input)",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:Math.min(100,Math.abs(val))+"%",
                          background:val>30?"var(--red)":val>15?"var(--yellow)":"var(--accent)",
                          borderRadius:3,opacity:0.8}}/>
                      </div>
                      <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"var(--text-secondary)",minWidth:42,textAlign:"right"}}>{val.toFixed(1)}%</span>
                    </div>
                  ))}
                  <div style={{fontSize:10,color:"var(--text-muted)",marginTop:6,fontStyle:"italic"}}>
                    * Bonos ARS (TZX27, TZXD6): su volatilidad en pesos se diluye al convertir a USD por CCL, por eso su contribución es baja aunque el precio en ARS varíe.
                  </div>
                </div>

                {/* Mejor diversificador */}
                <div style={{background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.8,marginBottom:4}}>Mejor diversificador</div>
                  <span style={{fontFamily:"'DM Mono',monospace",color:"var(--green)",fontWeight:700,fontSize:14}}>{bestDiversifier?.ticker}</span>
                  <span style={{fontSize:11,color:"var(--text-muted)",marginLeft:8}}>corr. prom. {Math.min(...avgCorr).toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>}

    </div>
  );
}

// ── FlujoTab ─────────────────────────────────────────────────────────────────
async function fetchBondFlows(ticker) {
  try {
    const url = `https://api.argenfunds.com/api/v1/bonds/${ticker.toLowerCase()}/cashflows`;
    const r = await fetch(url, {signal: AbortSignal.timeout(6000)});
    if(!r.ok) return null;
    const d = await r.json();
    if(!d||!d.length) return null;
    return d.map((f,i) => ({
      id: Date.now()+i,
      date: f.date||f.fecha||f.paymentDate,
      tipo: (f.type||f.tipo||'').toLowerCase().includes('amort') ? 'amortizacion' : 'cupon',
      monto: parseFloat(f.amount||f.monto||f.value||0),
      cobrado: false,
      fechaCobro: null,
      fuente: 'auto'
    })).filter(f=>f.date&&f.monto>0);
  } catch { return null; }
}

function FlujoTab({port, trades, bondFlows, setBondFlows, card, fxRate, historicos, isMobile=false}) {
  const [selected, setSelected]       = useState(null);
  const [loadingTicker, setLoadingTicker] = useState(null);
  const [addingFlow, setAddingFlow]   = useState(null);
  const [newFlow, setNewFlow]         = useState({date:'',tipo:'cupon',amort:'',nota:'',cuponMonto:''});
  const [editingRowIds, setEditingRowIds] = useState(null); // ids de flows que se están editando
  const [viewMode, setViewMode]       = useState('micobro');
  const [cerCoef, setCerCoef]         = useState({});
  const [editingCell, setEditingCell] = useState(null); // {id, field, value} — id del flow
  const [editingMeta, setEditingMeta] = useState(false);
  // bondMeta: {ticker:{tna, base}} — tna=% anual, base='30/360'|'dias/365'
  const BOND_META_DEFAULT = {
    'AO27D': {tna:6,  base:'30/360', emisionDate:null},
    'GD38D': {tna:5,  base:'30/360', emisionDate:null},
    'TLCUD': {tna:7,  base:'30/360', emisionDate:null},
    'TZX27': {tna:2,  base:'30/360', emisionDate:'2022-12-30'},
    'TZXD6': {tna:0,  base:'30/360', emisionDate:'2022-03-15'},
  };
  const [bondMeta, setBondMetaState] = useState(()=>{
    try{
      const saved = localStorage.getItem('gal_bond_meta_v1');
      if(saved){
        const parsed = JSON.parse(saved);
        // Merge con defaults para tickers nuevos
        return {...BOND_META_DEFAULT, ...parsed};
      }
    }catch{}
    return BOND_META_DEFAULT;
  });
  const setBondMeta = (updater) => {
    setBondMetaState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try{ localStorage.setItem('gal_bond_meta_v1', JSON.stringify(next)); }catch{}
      return next;
    });
  };
  const [metaDraft, setMetaDraft] = useState({tna:'', base:'30/360', emisionDate:''});
  const [wizardFlujosOpen, setWizardFlujosOpen] = useState(false); // BondWizard inline en FlujoTab
  // CER: serie histórica {date:string, valor:number}[], cacheada en memoria
  // CER: se lee desde historicos.json — cargado por update_historicos.py
  // No hace fetch desde el browser (evita CORS)
  const cerSerie = useMemo(()=>{
    if(!historicos?.cer?.length) return null;
    // historicos.cer: [{date, close}] — close es el valor CER
    return historicos.cer.map(x=>({date:x.date, valor:x.close}));
  },[historicos]);
  const cerLoading = false; // siempre listo (viene del JSON)
  const fetchCER = ()=>{}; // no-op, ya no se necesita
  // Feriados argentinos: {año: Set<'YYYY-MM-DD'>}
  const [feriados, setFeriados] = useState({});
  const feriadosRef = React.useRef({});

  // Buscar el último CER conocido <= dateStr (si no hay, devuelve el más antiguo disponible)
  const getCER = (serie, dateStr) => {
    if(!serie||!serie.length) return null;
    const filtered = serie.filter(x=>x.date<=dateStr);
    if(filtered.length) return filtered[filtered.length-1].valor;
    // Si no hay dato anterior, devolver el más antiguo conocido
    return serie[0].valor;
  };

  // Fetch feriados de un año desde argentinadatos
  const fetchFeriados = async (year) => {
    if(feriadosRef.current[year]) return feriadosRef.current[year];
    try {
      const r = await fetch(`https://api.argentinadatos.com/v1/feriados/${year}`, {signal:AbortSignal.timeout(5000)});
      if(r.ok){
        const data = await r.json();
        const set = new Set((Array.isArray(data)?data:[]).map(f=>(f.fecha||f.date||'').slice(0,10)).filter(Boolean));
        feriadosRef.current[year] = set;
        setFeriados(prev=>({...prev,[year]:set}));
        return set;
      }
    } catch{}
    feriadosRef.current[year] = new Set();
    return new Set();
  };

  // Restar N días hábiles a una fecha (lunes-viernes, excluyendo feriados AR)
  const restarDiasHabiles = async (dateStr, n) => {
    const d = new Date(dateStr);
    let restantes = n;
    while(restantes > 0){
      d.setDate(d.getDate()-1);
      const dow = d.getDay(); // 0=dom, 6=sab
      if(dow===0||dow===6) continue;
      const year = d.getFullYear();
      const feriadosAnio = feriadosRef.current[year] || await fetchFeriados(year);
      const ds = d.toISOString().slice(0,10);
      if(feriadosAnio.has(ds)) continue;
      restantes--;
    }
    return d.toISOString().slice(0,10);
  };

  // Versión sincrónica con feriados ya cargados en cache
  const restarDiasHabilesSync = (dateStr, n) => {
    const d = new Date(dateStr);
    let restantes = n;
    let maxIter = 100; // evitar loop infinito
    while(restantes > 0 && maxIter-- > 0){
      d.setDate(d.getDate()-1);
      const dow = d.getDay();
      if(dow===0||dow===6) continue;
      const year = d.getFullYear();
      const feriadosAnio = feriadosRef.current[year] || new Set();
      const ds = d.toISOString().slice(0,10);
      if(feriadosAnio.has(ds)) continue;
      restantes--;
    }
    return d.toISOString().slice(0,10);
  };

  // CER de 10 días hábiles antes de una fecha
  // Si fecha-10hd es futura → usar CER de (hoy - 10 días hábiles)
  const getCERMinus10 = (serie, dateStr) => {
    if(!serie||!serie.length||!dateStr) return null;
    const todayStr = todayAR();
    const fechaRef = restarDiasHabilesSync(dateStr, 10);
    // Si la fecha de referencia aún no llegó, usar hoy - 10 días hábiles
    const fechaConsulta = fechaRef > todayStr
      ? restarDiasHabilesSync(todayStr, 10)
      : fechaRef;
    return getCER(serie, fechaConsulta);
  };

  // Pre-cargar feriados de los años relevantes al montar
  useEffect(()=>{
    const currentYear = new Date().getFullYear();
    [currentYear-1, currentYear, currentYear+1].forEach(y => fetchFeriados(y));
  },[]);

  // Calcular flujos CER ajustados para un bono
  // Para cada cupón: interés = tasa × (CER_pago/CER_base) × VN_original × días/base
  // Para amort: monto = (CER_pago/CER_base) × amort_original
  // cerBase = CER del día 10 días antes de emisionDate
  const calcFlujoCER = (flow, vnOriginal, cerBase, cerPago, tna, base, dias) => {
    if(!cerBase||!cerPago||cerBase<=0) return flow.monto; // fallback sin CER
    const coefCER = cerPago / cerBase;
    if(flow.tipo==='amortizacion'){
      return parseFloat((vnOriginal * coefCER * (flow.monto/100)).toFixed(6));
    } else {
      // Interés = tna × dias/base × VN ajustado
      const divisor = base==='30/360' ? 360 : 365;
      return parseFloat(((tna/100) * (dias/divisor) * vnOriginal * coefCER).toFixed(6));
    }
  };

  const fmtD = s => s ? s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(0,4) : '';
  const fmtN = n => Number(n).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:4});
  const fmtN2 = n => Number(n).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const today = todayAR();

  const bonds = port.filter(h => h.type==='bono_ars'||h.type==='bono_usd');

  // ── Helpers de cálculo ──────────────────────────────────────────────────
  // Días 30/360: convención ICMA/Bond
  const dias30_360 = (d1, d2) => {
    const a=new Date(d1), b=new Date(d2);
    const [y1,m1,day1] = [a.getFullYear(), a.getMonth()+1, a.getDate()];
    const [y2,m2,day2] = [b.getFullYear(), b.getMonth()+1, b.getDate()];
    const D1 = Math.min(day1, 30);
    const D2 = (day1>=30 && day2===31) ? 30 : day2;
    return (y2-y1)*360 + (m2-m1)*30 + (D2-D1);
  };

  const diasReales = (d1, d2) =>
    Math.round((new Date(d2) - new Date(d1)) / (1000*60*60*24));

  const calcInteres = (tna, base, diasCalc, vnResidual) => {
    if(!tna || !vnResidual) return 0;
    const divisor = base==='30/360' ? 360 : 365;
    return parseFloat(((tna/100) * (diasCalc/divisor) * vnResidual).toFixed(6));
  };

  // Recalcular intereses de cupones futuros no cobrados
  const recalcularFuturos = (ticker, flows, tna, base) => {
    const sorted = [...flows].sort((a,b)=>a.date.localeCompare(b.date));
    // Construir VN residual acumulado
    let vn = 100;
    const vnMap = {}; // date → vn antes de ese pago
    sorted.forEach(f => {
      if(!vnMap[f.date]) vnMap[f.date] = vn;
      if(f.tipo==='amortizacion') vn = Math.max(0, vn - f.monto);
    });
    // Fechas ordenadas únicas para calcular días
    const dates = [...new Set(sorted.map(f=>f.date))].sort();

    return flows.map(f => {
      if(f.tipo!=='cupon') return f;      // amorts no se tocan
      if(f.cobrado) return f;             // cobrados no se tocan
      if(f.date <= today) return f;       // vencidos no se tocan
      const idx = dates.indexOf(f.date);
      const prevDate = idx > 0 ? dates[idx-1] : f.date;
      const diasCalc = base==='30/360'
        ? dias30_360(prevDate, f.date)
        : diasReales(prevDate, f.date);
      const vnAntes = vnMap[f.date] ?? 100;
      const nuevoInteres = calcInteres(tna, base, diasCalc, vnAntes);
      return {...f, monto: nuevoInteres};
    });
  };

  // CER se carga desde historicos.json — no necesita fetch propio

  // ── Handlers ─────────────────────────────────────────────────────────────
  const fetchFlows = async (ticker) => {
    setLoadingTicker(ticker);
    const flows = await fetchBondFlows(ticker);
    setLoadingTicker(null);
    if(flows&&flows.length) {
      setBondFlows(prev => ({...prev, [ticker]: flows}));
    } else {
      setBondFlows(prev => ({...prev, [ticker]: prev[ticker]||[]}));
    }
    setSelected(ticker);
    setAddingFlow(flows&&flows.length ? null : ticker);
  };

  const confirmCobro = (ticker, ids) => {
    setBondFlows(prev => ({
      ...prev,
      [ticker]: (prev[ticker]||[]).map(f =>
        ids.includes(f.id) ? {...f, cobrado:true, fechaCobro:today} : f
      )
    }));
  };

  const deleteFlow = (ticker, id) => {
    setBondFlows(prev => ({...prev, [ticker]: (prev[ticker]||[]).filter(f=>f.id!==id)}));
  };

  const deleteRow = (ticker, ids) => {
    setBondFlows(prev => ({...prev, [ticker]: (prev[ticker]||[]).filter(f=>!ids.includes(f.id))}));
  };

  const saveCellEdit = (ticker, id, field, value) => {
    setBondFlows(prev => ({
      ...prev,
      [ticker]: (prev[ticker]||[]).map(f =>
        f.id===id ? {...f, monto: parseFloat(value)||f.monto} : f
      )
    }));
    setEditingCell(null);
  };

  const applyMeta = () => {
    const tna = parseFloat(metaDraft.tna);
    const base = metaDraft.base;
    const emisionDate = metaDraft.emisionDate||null;
    if(!isNaN(tna) && tna >= 0) {
      setBondMeta(prev => ({...prev, [selected]: {tna, base, emisionDate}}));
      // Recalcular flujos futuros
      setBondFlows(prev => {
        const flows = prev[selected]||[];
        return {...prev, [selected]: recalcularFuturos(selected, flows, tna, base)};
      });
    }
    setEditingMeta(false);
  };

  const addNewFlow = () => {
    if(!newFlow.date) return;
    const meta = bondMeta[addingFlow] || {tna:0, base:'30/360'};
    const flows = (bondFlows[addingFlow]||[]).sort((a,b)=>a.date.localeCompare(b.date));
    // VN residual hasta esta fecha
    let vn = 100;
    flows.forEach(f => { if(f.date<newFlow.date && f.tipo==='amortizacion') vn=Math.max(0,vn-f.monto); });
    // Fecha anterior para calcular días
    const prevDates = [...new Set(flows.map(f=>f.date))].filter(d=>d<newFlow.date).sort();
    const prevDate = prevDates.length ? prevDates[prevDates.length-1] : newFlow.date;
    const diasCalc = meta.base==='30/360'
      ? dias30_360(prevDate, newFlow.date)
      : diasReales(prevDate, newFlow.date);

    const amortVal = parseFloat(newFlow.amort)||0;
    const interesVal = newFlow.tipo==='cupon' ? calcInteres(meta.tna, meta.base, diasCalc, vn) : 0;

    const flowsToAdd = [];
    if(newFlow.tipo==='cupon' || newFlow.tipo==='ambos') {
      flowsToAdd.push({id:Date.now(), date:newFlow.date, tipo:'cupon', monto:interesVal, cobrado:false, fechaCobro:null, fuente:'manual', nota:newFlow.nota||''});
    }
    if(newFlow.tipo==='amortizacion' || newFlow.tipo==='ambos') {
      flowsToAdd.push({id:Date.now()+1, date:newFlow.date, tipo:'amortizacion', monto:amortVal, cobrado:false, fechaCobro:null, fuente:'manual', nota:newFlow.nota||''});
    }
    setBondFlows(prev => ({...prev, [addingFlow]: [...(prev[addingFlow]||[]), ...flowsToAdd].sort((a,b)=>a.date.localeCompare(b.date))}));
    setNewFlow({date:'',tipo:'cupon',amort:'',nota:''});
  };

  // Guarda edición de una fila existente (reemplaza los flows con los mismos IDs)
  const saveEditFlow = () => {
    if(!newFlow.date || !editingRowIds) return;
    const amortVal  = parseFloat(newFlow.amort)||0;
    const cuponVal  = parseFloat(newFlow.cuponMonto)||0;
    const dateCalcVal = newFlow.dateCalc || newFlow.date;
    setBondFlows(prev => {
      const flows = (prev[addingFlow]||[]).map(f => {
        if(!editingRowIds.includes(f.id)) return f;
        if(f.tipo==='amortizacion') return {...f, date:newFlow.date, dateCalc:dateCalcVal, monto:amortVal, nota:newFlow.nota||f.nota};
        if(f.tipo==='cupon')        return {...f, date:newFlow.date, dateCalc:dateCalcVal, monto:cuponVal, nota:newFlow.nota||f.nota};
        return f;
      });
      return {...prev, [addingFlow]: flows.sort((a,b)=>a.date.localeCompare(b.date))};
    });
    setEditingRowIds(null);
    setAddingFlow(null);
    setNewFlow({date:'',tipo:'cupon',amort:'',nota:'',cuponMonto:''});
  };

  // ── Próximos pagos — todos los pagos futuros de todos los bonos, ordenados cronológicamente
  const proximosPagos = bonds.flatMap(b => {
    const flows = (bondFlows[b.ticker]||[]);
    const byDate = {};
    flows.forEach(f => {
      if(!byDate[f.date]) byDate[f.date]={date:f.date,monto:0,montoCupon:0,montoAmort:0,cobrado:true,hasAmort:false,hasCupon:false};
      byDate[f.date].monto += f.monto;
      if(!f.cobrado) byDate[f.date].cobrado = false;
      if(f.tipo==='amortizacion'){byDate[f.date].hasAmort=true;byDate[f.date].montoAmort+=f.monto;}
      else{byDate[f.date].hasCupon=true;byDate[f.date].montoCupon+=f.monto;}
    });
    const meta = bondMeta[b.ticker]||{};
    const isCER = (SEED_BOND_META[b.ticker]?.adjustsBy==='CER') && cerSerie;
    const cerBase = isCER && meta.emisionDate ? getCERMinus10(cerSerie, meta.emisionDate) : null;

    return Object.values(byDate)
      .filter(r=>!r.cobrado&&r.date>=today)
      .map(r=>{
        let total, totalCupon, totalAmort;
        if(isCER && cerBase){
          const cerPago = getCERMinus10(cerSerie, r.date);
          const coef = cerPago && cerBase ? cerPago/cerBase : 1;
          totalAmort = r.montoAmort * coef * b.qty / 100;
          // Para interés CER usamos una aproximación: monto% × coef × qty/100
          totalCupon = r.montoCupon * coef * b.qty / 100;
          total = totalAmort + totalCupon;
        } else {
          total      = r.monto*(b.qty/100);
          totalCupon = r.montoCupon*(b.qty/100);
          totalAmort = r.montoAmort*(b.qty/100);
        }
        return {
          ticker:b.ticker, name:b.name, currency:b.buyCurrency,
          date:r.date, monto:r.monto,
          montoCupon:r.montoCupon, montoAmort:r.montoAmort,
          hasAmort:r.hasAmort, hasCupon:r.hasCupon,
          total, totalCupon, totalAmort,
        };
      });
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.ticker.localeCompare(b.ticker));
  const [calMonth, setCalMonth] = useState(new Date());
  const [calSelectedDate, setCalSelectedDate] = useState(null);

  const selBond  = bonds.find(b=>b.ticker===selected);
  const selFlows = selected ? (bondFlows[selected]||[]).sort((a,b)=>a.date.localeCompare(b.date)) : [];
  const selMeta  = bondMeta[selected] || {tna:0, base:'30/360'};
  const seedMeta = SEED_BOND_META[selected] || {};
  const adjustsBy = seedMeta.adjustsBy || null;
  const coef = parseFloat(cerCoef[selected])||1;
  const currency = selBond?.buyCurrency==='USD' ? 'US$' : '$';

  const inp = {background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:6,padding:'5px 9px',color:'var(--text-primary)',fontSize:12,width:'100%'};

  // ── Agrupar flows por fecha ───────────────────────────────────────────────
  const buildRows = (flows) => {
    const byDate = {};
    flows.forEach(f => {
      if(!byDate[f.date]) byDate[f.date]={date:f.date,dateCalc:f.dateCalc||f.date,cupon:null,amort:null,ids:[]};
      if(f.tipo==='amortizacion') byDate[f.date].amort=f;
      else byDate[f.date].cupon=f;
      byDate[f.date].ids.push(f.id);
      // Tomar dateCalc del flow si existe
      if(f.dateCalc && f.dateCalc!==f.date) byDate[f.date].dateCalc=f.dateCalc;
    });
    const rows = Object.values(byDate).sort((a,b)=>a.date.localeCompare(b.date));
    let vn = 100;
    return rows.map((row,i) => {
      const amortPct    = row.amort?.monto ?? 0;
      const interestPct = row.cupon?.monto ?? 0;
      const vnAntes     = vn;
      vn = Math.max(0, vn - amortPct);
      // Días: usar dateCalc (teórica) para el cálculo, no la fecha de pago
      const prevRow = i>0 ? rows[i-1] : null;
      const prevCalc = prevRow ? (prevRow.dateCalc||prevRow.date) : (row.dateCalc||row.date);
      const curCalc  = row.dateCalc || row.date;
      const diasR = i===0 ? 0 : diasReales(prevCalc, curCalc);
      const dias3 = i===0 ? 0 : dias30_360(prevCalc, curCalc);
      return {...row, amortPct, interestPct, totalPct:amortPct+interestPct, vnAntes, vnDespues:vn, diasReales:diasR, dias30360:dias3};
    });
  };

  const rows = buildRows(selFlows);

  // Estilos tabla
  const thP  = {padding:'7px 10px',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:0.6,background:'var(--bg-input)',borderBottom:'2px solid var(--border)',textAlign:'right',whiteSpace:'nowrap',color:'var(--text-muted)'};
  const thPL = {...thP,textAlign:'left'};
  const tdP  = {padding:'6px 10px',fontFamily:"'DM Mono',monospace",fontSize:12,textAlign:'right',borderBottom:'1px solid var(--border)',color:'var(--text-secondary)'};
  const tdPL = {...tdP,textAlign:'left'};

  return (
    <>
    <div style={{display:'flex',flexDirection:'column',gap:16}}>

      {/* ── Calendario de cobros ──────────────────────────────────────────── */}
      {(()=>{
        // Agrupar todos los pagos por fecha (YYYY-MM-DD)
        const pagosByDate = {};
        proximosPagos.forEach(p=>{
          if(!pagosByDate[p.date]) pagosByDate[p.date]=[];
          pagosByDate[p.date].push(p);
        });

        const calYear  = calMonth.getFullYear();
        const calMon   = calMonth.getMonth(); // 0-indexed
        const firstDay = new Date(calYear, calMon, 1);
        const lastDay  = new Date(calYear, calMon+1, 0);
        // Día de semana del 1ero (0=Dom, ajustar a Lun=0)
        const startDow = (firstDay.getDay()+6)%7;
        const daysInMonth = lastDay.getDate();
        const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
        const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        // Total del mes visible
        const totalMesUSD = proximosPagos.filter(p=>p.date.startsWith(`${calYear}-${String(calMon+1).padStart(2,'0')}`))
          .reduce((a,p)=>a+(p.currency==='USD'?p.total:p.total/fxRate),0);

        // Celdas del calendario: blancos antes + días del mes
        const cells = [];
        for(let i=0;i<startDow;i++) cells.push(null);
        for(let d=1;d<=daysInMonth;d++) cells.push(d);

        const todayStr2 = todayAR();
        const fmtMoney = (p) => p.currency==='USD' ? `US$${fmtN2(p.total)}` : `$${fmtN2(p.total)}`;

        return(
          <div style={{...card,padding:isMobile?'10px 12px':'16px 20px',display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 300px',gap:isMobile?12:20,maxHeight:isMobile?'none':390,overflow:isMobile?'visible':'hidden'}}>

            {/* Calendario */}
            <div>
              {/* Header mes */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div>
                  <div style={{fontSize:18,fontWeight:700,color:'var(--text-primary)',letterSpacing:'-0.5px'}}>
                    {MONTHS[calMon]} {calYear}
                  </div>
                  {totalMesUSD>0&&(
                    <div style={{fontSize:11,color:'var(--accent)',marginTop:2}}>
                      Total del mes: <b style={{fontFamily:"'DM Mono',monospace"}}>≈ US${fmtN2(totalMesUSD)}</b>
                    </div>
                  )}
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))}
                    style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,width:32,height:32,cursor:'pointer',color:'var(--text-secondary)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
                  <button onClick={()=>setCalMonth(new Date())}
                    style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 12px',cursor:'pointer',color:'var(--text-secondary)',fontSize:11}}>Hoy</button>
                  <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))}
                    style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,width:32,height:32,cursor:'pointer',color:'var(--text-secondary)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
                </div>
              </div>

              {/* Grid días semana */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:3}}>
                {DAYS.map(d=>(
                  <div key={d} style={{textAlign:'center',fontSize:10,color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:0.8,padding:'4px 0'}}>{d}</div>
                ))}
              </div>

              {/* Grid celdas */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
                {cells.map((d,i)=>{
                  if(!d) return <div key={'empty-'+i}/>;
                  const dateStr = `${calYear}-${String(calMon+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                  const pagos = pagosByDate[dateStr]||[];
                  const isToday = dateStr===todayStr2;
                  const isSelected = calSelectedDate===dateStr;
                  const hasPago = pagos.length>0;
                  const hasAmort = pagos.some(p=>p.hasAmort);
                  const dotColor = hasAmort?'var(--yellow)':'var(--accent)';
                  // Total del día en USD
                  const totalDia = pagos.reduce((a,p)=>a+(p.currency==='USD'?p.total:p.total/fxRate),0);

                  return(
                    <div key={dateStr}
                      onClick={()=>hasPago&&setCalSelectedDate(isSelected?null:dateStr)}
                      style={{
                        borderRadius:8,
                        padding:'4px 3px',
                        minHeight:38,
                        cursor:hasPago?'pointer':'default',
                        background:isSelected?'rgba(59,130,246,0.15)':isToday?'rgba(59,130,246,0.06)':'transparent',
                        border:isSelected?'1px solid var(--accent)':isToday?'1px solid rgba(59,130,246,0.3)':'1px solid transparent',
                        transition:'background 0.12s',
                        position:'relative',
                        textAlign:'center',
                      }}
                      onMouseEnter={e=>{if(hasPago&&!isSelected)e.currentTarget.style.background='rgba(255,255,255,0.04)';}}
                      onMouseLeave={e=>{if(hasPago&&!isSelected)e.currentTarget.style.background='transparent';}}>
                      <div style={{fontSize:12,fontWeight:isToday?700:400,color:isToday?'var(--accent)':hasPago?'var(--text-primary)':'var(--text-muted)',marginBottom:2}}>
                        {d}
                      </div>
                      {hasPago&&(
                        <>
                          {/* Dots por ticker */}
                          <div style={{display:'flex',justifyContent:'center',gap:2,flexWrap:'wrap',marginBottom:2}}>
                            {pagos.slice(0,3).map(p=>(
                              <div key={p.ticker} style={{width:5,height:5,borderRadius:'50%',background:p.hasAmort?'var(--yellow)':'var(--accent)'}}/>
                            ))}
                            {pagos.length>3&&<div style={{width:5,height:5,borderRadius:'50%',background:'var(--text-muted)'}}/>}
                          </div>
                          {/* Total del día */}
                          <div style={{fontSize:9,color:dotColor,fontFamily:"'DM Mono',monospace",fontWeight:600,lineHeight:1}}>
                            {totalDia>=1000?`${(totalDia/1000).toFixed(1)}k`:`${fmtN2(totalDia)}`}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Leyenda */}
              <div style={{display:'flex',gap:16,marginTop:12,fontSize:10,color:'var(--text-muted)'}}>
                <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:7,height:7,borderRadius:'50%',background:'var(--accent)'}}/> Cupón</div>
                <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:7,height:7,borderRadius:'50%',background:'var(--yellow)'}}/> Amort.</div>
              </div>
            </div>

            {/* Panel derecho: próximos o detalle del día */}
            <div style={{borderLeft:'1px solid var(--border)',paddingLeft:20,display:'flex',flexDirection:'column',gap:0,overflow:'hidden'}}>
              {calSelectedDate?(()=>{
                // Detalle del día seleccionado
                const pagosDelDia = pagosByDate[calSelectedDate]||[];
                const [dd,mm,yyyy] = [calSelectedDate.slice(8),calSelectedDate.slice(5,7),calSelectedDate.slice(0,4)];
                return(<>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:'var(--text-primary)'}}>{dd}/{mm}/{yyyy}</div>
                      <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1}}>{pagosDelDia.length} pago{pagosDelDia.length!==1?'s':''}</div>
                    </div>
                    <button onClick={()=>setCalSelectedDate(null)}
                      style={{background:'transparent',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:16}}>✕</button>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8,overflowY:'auto',maxHeight:380}}>
                    {pagosDelDia.map(p=>(
                      <div key={p.ticker+p.date} onClick={()=>setSelected(p.ticker)}
                        style={{background:'var(--bg-input)',borderRadius:10,padding:'12px 14px',cursor:'pointer',
                          borderLeft:`3px solid ${p.hasAmort?'var(--yellow)':'var(--accent)'}`,
                          transition:'opacity 0.12s'}}
                        onMouseEnter={e=>e.currentTarget.style.opacity='0.85'}
                        onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                          <span style={{fontWeight:700,fontSize:13,color:'var(--accent)',fontFamily:"'DM Mono',monospace"}}>{p.ticker}</span>
                          <span style={{fontSize:10,color:p.hasAmort?'var(--yellow)':'var(--accent)'}}>
                            {p.hasAmort&&p.hasCupon?'💰+🎫':p.hasAmort?'💰':'🎫'}
                          </span>
                        </div>
                        <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:6,lineHeight:1.4}}>{p.name}</div>
                        <div style={{fontSize:16,fontWeight:700,color:'var(--text-primary)',fontFamily:"'DM Mono',monospace"}}>
                          {p.currency==='USD'?'US$':'$'}{fmtN2(p.total)}
                        </div>
                        {p.hasAmort&&p.hasCupon&&(
                          <div style={{display:'flex',gap:10,marginTop:4}}>
                            <span style={{fontSize:10,color:'var(--yellow)'}}>Amort: {p.currency==='USD'?'US$':'$'}{fmtN2(p.totalAmort)}</span>
                            <span style={{fontSize:10,color:'var(--accent)'}}>Int: {p.currency==='USD'?'US$':'$'}{fmtN2(p.totalCupon)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>);
              })():(()=>{
                // Lista próximos pagos
                const proximos = proximosPagos.filter(p=>p.date>=todayStr2);
                return(<>
                  <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1,fontWeight:600,marginBottom:12}}>
                    Próximos cobros
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:1,overflowY:'auto',maxHeight:390}}>
                    {proximos.length===0
                      ? <div style={{color:'var(--text-muted)',fontSize:13}}>No hay flujos cargados.</div>
                      : proximos.map((p,i)=>{
                          const isFirst = i===0;
                          return(
                            <div key={p.ticker+p.date} onClick={()=>{setSelected(p.ticker);setCalSelectedDate(p.date);setCalMonth(new Date(p.date));}}
                              style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,cursor:'pointer',
                                background:isFirst?'rgba(59,130,246,0.06)':'transparent',
                                transition:'background 0.12s'}}
                              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                              onMouseLeave={e=>e.currentTarget.style.background=isFirst?'rgba(59,130,246,0.06)':'transparent'}>
                              {/* Fecha grande */}
                              <div style={{textAlign:'center',minWidth:42,flexShrink:0}}>
                                <div style={{fontSize:isMobile?16:20,fontWeight:700,fontFamily:"'DM Mono',monospace",color:p.hasAmort?'var(--yellow)':'var(--accent)',lineHeight:1}}>
                                  {p.date.slice(8)}
                                </div>
                                <div style={{fontSize:9,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:0.5}}>
                                  {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(p.date.slice(5,7))-1]}
                                </div>
                              </div>
                              {/* Separador */}
                              <div style={{width:1,height:32,background:'var(--border)',flexShrink:0}}/>
                              {/* Info */}
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                                  <span style={{fontWeight:700,fontSize:12,color:'var(--text-primary)',fontFamily:"'DM Mono',monospace"}}>{p.ticker}</span>
                                  <span style={{fontSize:9,color:p.hasAmort?'var(--yellow)':'var(--accent)'}}>
                                    {p.hasAmort&&p.hasCupon?'Amort.+Cupón':p.hasAmort?'Amort.':'Cupón'}
                                  </span>
                                  {isFirst&&<span style={{fontSize:8,background:'var(--accent)',color:'#fff',borderRadius:3,padding:'1px 4px',fontWeight:700}}>NEXT</span>}
                                </div>
                                <div style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)',fontFamily:"'DM Mono',monospace"}}>
                                  {p.currency==='USD'?'US$':'$'}{fmtN2(p.total)}
                                </div>
                              </div>
                            </div>
                          );
                        })
                    }
                  </div>
                </>);
              })()}
            </div>
          </div>
        );
      })()}

      {/* Lista de bonos + tabla */}
      <div style={{...card,padding:'16px 20px'}}>
        <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1.2,fontWeight:600,marginBottom:12}}>Bonos y ONs en cartera</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
          {bonds.map(b=>{
            const hasFlows = (bondFlows[b.ticker]||[]).length>0;
            const isActive = selected===b.ticker;
            return(
              <button key={b.ticker}
                onClick={()=>{ if(hasFlows){setSelected(b.ticker);setAddingFlow(null);}else{fetchFlows(b.ticker);} }}
                style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${isActive?'var(--accent)':'var(--border)'}`,
                  background:isActive?'var(--accent)':'var(--bg-input)',
                  color:isActive?'#fff':'var(--text-secondary)',cursor:'pointer',fontSize:12,fontWeight:isActive?700:400,
                  display:'flex',alignItems:'center',gap:6}}>
                {loadingTicker===b.ticker?'⟳ ':hasFlows?'✓ ':'+ '}
                {b.ticker}
              </button>
            );
          })}
        </div>

        {selected&&selBond&&(
          <div>
            {/* Header del bono */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12,flexWrap:'wrap',gap:8}}>
              <div>
                <span style={{fontWeight:700,color:'var(--text-primary)',fontSize:14}}>{selBond.ticker}</span>
                <span style={{color:'var(--text-muted)',fontSize:12,marginLeft:8}}>{selBond.name}</span>
                <span style={{color:'var(--text-muted)',fontSize:11,marginLeft:8}}>{selBond.qty.toLocaleString('es-AR')} nominales</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                {/* TNA + Base — editable */}
                {editingMeta ? (
                  <div style={{display:'flex',gap:8,alignItems:'center',background:'var(--bg-input)',border:'1px solid var(--accent)',borderRadius:8,padding:'6px 12px'}}>
                    <span style={{fontSize:11,color:'var(--text-muted)'}}>Cupón:</span>
                    <input type="number" step="0.01" value={metaDraft.tna}
                      onChange={e=>setMetaDraft(p=>({...p,tna:e.target.value}))}
                      style={{...inp,width:70,textAlign:'right'}}/>
                    <span style={{fontSize:11,color:'var(--text-muted)'}}>%</span>
                    <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:8}}>Base:</span>
                    <select value={metaDraft.base} onChange={e=>setMetaDraft(p=>({...p,base:e.target.value}))}
                      style={{...inp,width:110}}>
                      <option value="30/360">30/360</option>
                      <option value="dias/365">Días/365</option>
                    </select>
                    {adjustsBy==='CER'&&<>
                      <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:8}}>Emisión:</span>
                      <input type="date" value={metaDraft.emisionDate||''}
                        onChange={e=>setMetaDraft(p=>({...p,emisionDate:e.target.value}))}
                        style={{...inp,width:140}}/>
                    </>}
                    <button onClick={applyMeta}
                      style={{background:'var(--accent)',border:'none',borderRadius:6,padding:'4px 12px',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:600}}>
                      ✓ Aplicar
                    </button>
                    <button onClick={()=>setEditingMeta(false)}
                      style={{background:'transparent',border:'1px solid var(--border)',borderRadius:6,padding:'4px 8px',color:'var(--text-muted)',cursor:'pointer',fontSize:12}}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{display:'flex',gap:6,alignItems:'center',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 12px',cursor:'pointer'}}
                    onClick={()=>{setMetaDraft({tna:selMeta.tna, base:selMeta.base, emisionDate:selMeta.emisionDate||''});setEditingMeta(true);}}>
                    <span style={{fontSize:12,color:'var(--text-secondary)'}}>Cupón <b style={{color:'var(--accent)'}}>{selMeta.tna}%</b></span>
                    <span style={{fontSize:10,color:'var(--text-muted)'}}>·</span>
                    <span style={{fontSize:12,color:'var(--text-secondary)'}}>Base <b style={{color:'var(--text-primary)'}}>{selMeta.base}</b></span>
                    {adjustsBy==='CER'&&<><span style={{fontSize:10,color:'var(--text-muted)'}}>·</span><span style={{fontSize:12,color:'var(--text-secondary)'}}>Emisión <b style={{color:'var(--yellow)'}}>{selMeta.emisionDate?fmtD(selMeta.emisionDate):'—'}</b></span></>}
                    <span style={{fontSize:10,color:'var(--text-muted)',marginLeft:4}}>✏️</span>
                  </div>
                )}
                <button onClick={()=>setWizardFlujosOpen(true)}
                  style={{background:'rgba(59,130,246,0.12)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:6,padding:'5px 12px',cursor:'pointer',color:'#60A5FA',fontSize:12,fontWeight:600}}>
                  ⚡ Carga rápida
                </button>
                <button onClick={()=>setAddingFlow(selected)}
                  style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:6,padding:'5px 12px',cursor:'pointer',color:'var(--text-secondary)',fontSize:12}}>
                  + Agregar pago
                </button>
              </div>
            </div>

            {/* Descripción */}
            {seedMeta.desc&&(
              <div style={{background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.12)',borderRadius:8,padding:'9px 14px',marginBottom:10,fontSize:12,color:'var(--text-secondary)'}}>
                📋 {seedMeta.desc}
              </div>
            )}

            {/* Estado CER — inline */}
            {adjustsBy==='CER'&&(()=>{
              const emisionDate = selMeta.emisionDate||null;
              const cerBaseVal = emisionDate&&cerSerie ? getCERMinus10(cerSerie,emisionDate) : null;
              const cerHoy = cerSerie ? getCER(cerSerie,todayAR()) : null;
              const coefHoy = cerBaseVal&&cerHoy ? (cerHoy/cerBaseVal) : null;
              // Fecha efectiva del CER base (10d antes de emisión)
              const cerBaseFecha = emisionDate ? (()=>{const d=new Date(emisionDate);d.setDate(d.getDate()-10);return d.toISOString().slice(0,10);})() : null;
              return(
                <div style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:8,padding:'8px 14px',marginBottom:10,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap',fontSize:11}}>
                  <span style={{color:'var(--yellow)',fontWeight:600}}>⚡ CER</span>
                  {!cerSerie&&<span style={{color:'var(--text-muted)'}}>⏳ Esperando datos del histórico — el script Python actualiza el CER diariamente</span>}
                  {cerSerie&&!emisionDate&&<span style={{color:'var(--text-muted)'}}>Editá el chip ✏️ para ingresar la fecha de emisión</span>}
                  {cerBaseVal&&<span style={{color:'var(--text-muted)'}}>CER base ({fmtD(cerBaseFecha)}): <b style={{color:'var(--text-secondary)',fontFamily:"'DM Mono',monospace"}}>{cerBaseVal.toFixed(4)}</b></span>}
                  {cerHoy&&<span style={{color:'var(--text-muted)'}}>CER hoy: <b style={{color:'var(--text-secondary)',fontFamily:"'DM Mono',monospace"}}>{cerHoy.toFixed(4)}</b></span>}
                  {coefHoy&&<span style={{color:'var(--text-muted)'}}>Coef. actual: <b style={{color:'var(--yellow)',fontFamily:"'DM Mono',monospace"}}>{coefHoy.toFixed(4)}</b></span>}
                  {cerSerie&&cerSerie.length>0&&!cerLoading&&<span style={{color:'var(--green)',marginLeft:'auto',fontSize:10}}>✓ {cerSerie.length} registros</span>}

                </div>
              );
            })()}

            {/* Form agregar pago */}
            {addingFlow===selected&&(
              <div style={{background:editingRowIds?'rgba(96,165,250,0.06)':'rgba(59,130,246,0.06)',border:`1px solid ${editingRowIds?'rgba(96,165,250,0.3)':'rgba(59,130,246,0.15)'}`,borderRadius:10,padding:'14px 16px',marginBottom:12,display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
                {editingRowIds&&<div style={{width:'100%',fontSize:11,color:'#60A5FA',fontWeight:600,marginBottom:2}}>✏️ Editando fila — modificá los campos y guardá</div>}
                {/* F. Pago */}
                <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:130}}>
                  <span style={{fontSize:10,color:'var(--text-muted)'}}>F. Pago</span>
                  <input type="date" value={newFlow.date} onChange={e=>setNewFlow(p=>({...p,date:e.target.value}))} style={inp}/>
                </div>
                {/* F. Teórica */}
                <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:130}}>
                  <span style={{fontSize:10,color:'var(--text-muted)'}}>F. Teórica (cálculo)</span>
                  <input type="date" value={newFlow.dateCalc||newFlow.date} onChange={e=>setNewFlow(p=>({...p,dateCalc:e.target.value}))} style={{...inp,color:'var(--text-secondary)'}}/>
                </div>
                {/* Tipo */}
                <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:140}}>
                  <span style={{fontSize:10,color:'var(--text-muted)'}}>Tipo</span>
                  <select value={newFlow.tipo} onChange={e=>setNewFlow(p=>({...p,tipo:e.target.value}))} style={inp}>
                    <option value="cupon">🎫 Solo cupón</option>
                    <option value="amortizacion">💰 Solo amort.</option>
                    <option value="ambos">💰+🎫 Amort.+Cupón</option>
                  </select>
                </div>
                {/* Amort */}
                {(newFlow.tipo==='amortizacion'||newFlow.tipo==='ambos')&&(
                  <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:110}}>
                    <span style={{fontSize:10,color:'var(--text-muted)'}}>Amort. % VN</span>
                    <input type="number" step="0.0001" value={newFlow.amort} onChange={e=>setNewFlow(p=>({...p,amort:e.target.value}))} placeholder="ej: 4.5455" style={inp}/>
                  </div>
                )}
                {/* Cupón — editable si modo edición, calculado si modo nuevo */}
                {(newFlow.tipo==='cupon'||newFlow.tipo==='ambos')&&(
                  <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:110}}>
                    <span style={{fontSize:10,color:'var(--text-muted)'}}>{editingRowIds?'Cupón % VN':'Interés calculado'}</span>
                    {editingRowIds
                      ? <input type="number" step="0.000001" value={newFlow.cuponMonto} onChange={e=>setNewFlow(p=>({...p,cuponMonto:e.target.value}))} placeholder="ej: 3.25" style={{...inp,color:'var(--accent)',fontWeight:700}}/>
                      : <div style={{...inp,background:'transparent',color:'var(--accent)',fontWeight:700,textAlign:'right'}}>
                          {(()=>{
                            if(!newFlow.date) return '—';
                            const meta2 = bondMeta[addingFlow]||{tna:0,base:'30/360'};
                            const flows2 = (bondFlows[addingFlow]||[]).sort((a,b)=>a.date.localeCompare(b.date));
                            let vn2=100;
                            flows2.forEach(f=>{if(f.date<newFlow.date&&f.tipo==='amortizacion')vn2=Math.max(0,vn2-f.monto);});
                            const prevDates2=[...new Set(flows2.map(f=>f.date))].filter(d=>d<newFlow.date).sort();
                            const prev2=prevDates2.length?prevDates2[prevDates2.length-1]:newFlow.date;
                            const dc=meta2.base==='30/360'?dias30_360(prev2,newFlow.date):diasReales(prev2,newFlow.date);
                            return fmtN(calcInteres(meta2.tna,meta2.base,dc,vn2))+'%';
                          })()}
                        </div>
                    }
                  </div>
                )}
                {/* Nota */}
                <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:130}}>
                  <span style={{fontSize:10,color:'var(--text-muted)'}}>Nota (opcional)</span>
                  <input value={newFlow.nota} onChange={e=>setNewFlow(p=>({...p,nota:e.target.value}))} placeholder="ej: cuota 5/22" style={inp}/>
                </div>
                <button onClick={editingRowIds ? saveEditFlow : addNewFlow}
                  style={{background:'var(--accent)',border:'none',borderRadius:8,padding:'7px 16px',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>
                  {editingRowIds ? '✓ Guardar cambios' : 'Guardar'}
                </button>
                <button onClick={()=>{setAddingFlow(null);setEditingRowIds(null);setNewFlow({date:'',tipo:'cupon',amort:'',nota:'',cuponMonto:'',dateCalc:''});}}
                  style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'7px 12px',color:'var(--text-muted)',cursor:'pointer',fontSize:13}}>
                  Cancelar
                </button>
              </div>
            )}

            {rows.length===0
              ? <div style={{color:'var(--text-muted)',fontSize:13,padding:'20px 0'}}>No hay flujos. Usá "+ Agregar pago" para cargarlos.</div>
              : (<>
                {/* Toggle vista */}
                <div style={{display:'flex',gap:8,marginBottom:12}}>
                  {[['prospecto','📋 Prospecto'],['micobro','💰 Mi cobro']].map(([k,lbl])=>(
                    <button key={k} onClick={()=>setViewMode(k)}
                      style={{padding:'5px 14px',borderRadius:6,border:`1px solid ${viewMode===k?'var(--accent)':'var(--border)'}`,
                        background:viewMode===k?'var(--accent)':'var(--bg-input)',
                        color:viewMode===k?'#fff':'var(--text-secondary)',cursor:'pointer',fontSize:12,fontWeight:viewMode===k?700:400}}>
                      {lbl}
                    </button>
                  ))}
                </div>

                {/* ── VISTA PROSPECTO ── */}
                {viewMode==='prospecto'&&(()=>{
                  // Datos CER para este bono si aplica
                  const isCERBond = adjustsBy==='CER';
                  const meta2 = SEED_BOND_META[selected]||{};
                  const emisionDate2 = selMeta.emisionDate||meta2.emisionDate||null;
                  // CER base = último CER conocido 10 días antes de la emisión
                  const cerBaseVal2 = (isCERBond&&cerSerie&&emisionDate2) ? getCERMinus10(cerSerie,emisionDate2) : null;

                  return(
                  <div style={{overflowX:'auto',borderRadius:10,border:'1px solid var(--border)'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                      <thead>
                        <tr>
                          <th style={{...thPL,width:28}}>#</th>
                          <th style={{...thPL}}>F. Pago</th>
                          <th style={{...thPL,color:'var(--text-muted)',fontSize:9}}>F. Teórica</th>
                          <th style={thP}>Días ({selMeta.base})</th>
                          <th style={thP}>Amort. % VN</th>
                          <th style={thP}>VN Residual</th>
                          <th style={thP}>Cupón</th>
                          <th style={thP}>Interés % VN</th>
                          {isCERBond&&<><th style={{...thP,background:'rgba(251,191,36,0.06)',color:'var(--yellow)'}}>CER</th><th style={{...thP,background:'rgba(251,191,36,0.06)',color:'var(--yellow)'}}>VN Ajust.</th><th style={{...thP,background:'rgba(251,191,36,0.06)',color:'var(--yellow)'}}>Interés Aj.</th></>}
                          <th style={{...thP,background:'rgba(251,191,36,0.1)',color:'var(--yellow)'}}>Amort.</th>
                          <th style={{...thP,background:'rgba(59,130,246,0.1)',color:'var(--accent)'}}>Interés</th>
                          <th style={{...thP,background:'rgba(52,211,153,0.1)',color:'var(--green)'}}>Total</th>
                          <th style={{...thP,textAlign:'center',width:56}}>Acc.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row,i)=>{
                          const isPast    = row.date < today;
                          const isCobrado = (row.cupon?.cobrado??!row.cupon) && (row.amort?.cobrado??!row.amort);
                          const dias      = i===0 ? '—' : (selMeta.base==='30/360' ? row.dias30360 : row.diasReales);
                          const rowBg = isCobrado?'rgba(52,211,153,0.04)':isPast?'rgba(251,191,36,0.03)':'transparent';
                          // CER de la fecha de pago
                          // getCER devuelve el último valor conocido <= fecha (o el más antiguo si no hay anterior)
                          // CER de pago = CER de (fecha_pago - 10 días hábiles), o (hoy - 10hd) si es futuro
                          const cerPagoVal = (isCERBond&&cerSerie&&cerBaseVal2) ? getCERMinus10(cerSerie,row.date) : null;
                          const coefCER = (cerBaseVal2&&cerPagoVal) ? cerPagoVal/cerBaseVal2 : null;
                          const vnAjust = coefCER ? 100*coefCER : null; // VN ajustado por cada 100 originales
                          // Interés ajustado CER
                          const diasNum = typeof dias === 'number' ? dias : 0;
                          const divisor = selMeta.base==='30/360'?360:365;
                          const interesAjust = (coefCER&&selMeta.tna&&diasNum>0) ? parseFloat(((selMeta.tna/100)*(diasNum/divisor)*100*coefCER).toFixed(4)) : null;
                          return(
                            <tr key={row.date} style={{background:rowBg}}>
                              <td style={{...tdPL,color:'var(--text-muted)',fontSize:11}}>{i+1}</td>
                              <td style={{...tdPL,fontWeight:600,color:isCobrado?'var(--green)':isPast?'var(--yellow)':'var(--text-primary)'}}>
                                {fmtD(row.date)}{isCobrado&&<span style={{fontSize:9,marginLeft:5,color:'var(--green)'}}>✓</span>}
                              </td>
                              <td style={{...tdPL,fontSize:10,color:row.dateCalc&&row.dateCalc!==row.date?'var(--text-secondary)':'var(--text-muted)'}}>
                                {fmtD(row.dateCalc||row.date)}
                              </td>
                              <td style={{...tdP,color:'var(--text-muted)'}}>{dias}</td>
                              {/* Amort — input siempre visible en todas las filas */}
                              <td style={{...tdP,color:row.amortPct>0?'var(--yellow)':'var(--text-muted)',padding:'4px 6px'}}>
                                <input type="number" step="0.0001" min="0"
                                    defaultValue={row.amortPct||0}
                                    key={'a-'+(row.amort?.id||row.date)+'-'+row.amortPct}
                                    onFocus={e=>{e.target.select();e.target.style.background='var(--bg-input)';e.target.style.color='var(--yellow)';e.target.style.border='1px solid var(--accent)';}}
                                    onBlur={e=>{
                                      e.target.style.background='transparent';e.target.style.border='none';
                                      const val=parseFloat(e.target.value)||0;
                                      e.target.style.color=val>0?'var(--yellow)':'var(--text-muted)';
                                      if(row.amort){
                                        if(val===0){
                                          // Eliminar amort si se pone 0
                                          setBondFlows(prev=>({...prev,[selected]:(prev[selected]||[]).filter(f=>f.id!==row.amort.id)}));
                                        } else {
                                          saveCellEdit(selected,row.amort.id,'monto',e.target.value);
                                        }
                                      } else if(val>0){
                                        // Crear amort nueva en esta fecha
                                        const newId=Date.now()+Math.random();
                                        setBondFlows(prev=>({...prev,[selected]:[...(prev[selected]||[]),{id:newId,date:row.date,tipo:'amortizacion',monto:val,cobrado:false,fechaCobro:null,fuente:'manual',nota:''}].sort((a,b)=>a.date.localeCompare(b.date))}));
                                      }
                                    }}
                                    onKeyDown={e=>{if(e.key==='Enter')e.target.blur();if(e.key==='Escape'){e.target.value=row.amortPct||0;e.target.blur();}}}
                                    style={{background:'transparent',border:'none',color:'inherit',fontFamily:"'DM Mono',monospace",fontSize:12,textAlign:'right',width:'100%',outline:'none',cursor:'pointer',borderRadius:4,padding:'2px 4px'}}/>
                              </td>
                              <td style={tdP}>{fmtN2(row.vnDespues)}%</td>
                              <td style={{...tdP,color:'var(--text-muted)'}}>{selMeta.tna}%</td>
                              {/* Interés — input siempre visible, estilo texto hasta focus */}
                              <td style={{...tdP,color:'var(--accent)',padding:'4px 6px'}}>
                                {row.cupon
                                  ?<input type="number" step="0.0001"
                                      defaultValue={row.interestPct}
                                      key={'i-'+row.cupon.id+'-'+row.cupon.monto}
                                      onFocus={e=>{e.target.select();e.target.style.background='var(--bg-input)';e.target.style.color='var(--accent)';e.target.style.border='1px solid var(--accent)';}}
                                      onBlur={e=>{e.target.style.background='transparent';e.target.style.border='none';e.target.style.color='var(--accent)';saveCellEdit(selected,row.cupon.id,'monto',e.target.value);}}
                                      onKeyDown={e=>{if(e.key==='Enter')e.target.blur();if(e.key==='Escape'){e.target.value=row.cupon.monto;e.target.blur();}}}
                                      style={{background:'transparent',border:'none',color:'inherit',fontFamily:"'DM Mono',monospace",fontSize:12,textAlign:'right',width:'100%',outline:'none',cursor:'pointer',borderRadius:4,padding:'2px 4px'}}/>
                                  :<span style={{color:'var(--text-muted)'}}>—</span>
                                }
                              </td>
                              {/* Celdas CER — solo bonos CER con serie cargada */}
                              {isCERBond&&(
                                <>
                                  <td style={{...tdP,background:'rgba(251,191,36,0.03)',color:'var(--yellow)',fontSize:11}}>
                                    {cerPagoVal?cerPagoVal.toFixed(4):<span style={{color:'var(--text-muted)'}}>—</span>}
                                  </td>
                                  <td style={{...tdP,background:'rgba(251,191,36,0.03)',color:'var(--yellow)',fontSize:11}}>
                                    {vnAjust?fmtN2(vnAjust):<span style={{color:'var(--text-muted)'}}>—</span>}
                                  </td>
                                  <td style={{...tdP,background:'rgba(251,191,36,0.03)',color:'var(--yellow)',fontSize:11,fontWeight:600}}>
                                    {interesAjust!=null?fmtN(interesAjust)+'%':<span style={{color:'var(--text-muted)'}}>—</span>}
                                  </td>
                                </>
                              )}
                              <td style={{...tdP,background:'rgba(251,191,36,0.04)',color:'var(--yellow)',fontWeight:row.amortPct>0?700:400}}>
                                {row.amortPct>0?fmtN(row.amortPct):'—'}
                              </td>
                              <td style={{...tdP,background:'rgba(59,130,246,0.04)',color:'var(--accent)'}}>
                                {row.interestPct>0?fmtN(row.interestPct):'—'}
                              </td>
                              <td style={{...tdP,background:'rgba(52,211,153,0.04)',color:'var(--green)',fontWeight:700}}>
                                {fmtN(row.totalPct)}
                              </td>
                              <td style={{...tdP,textAlign:'center',whiteSpace:'nowrap'}}>
                                <button onClick={()=>{
                                    setAddingFlow(selected);
                                    setEditingRowIds(row.ids);
                                    const tipoKey = row.cupon&&row.amort?'ambos':row.amort?'amortizacion':'cupon';
                                    setNewFlow({
                                      date:      row.date,
                                      dateCalc:  row.dateCalc||row.date,
                                      tipo:      tipoKey,
                                      amort:     row.amort?.monto!=null?String(row.amort.monto):'',
                                      cuponMonto:row.cupon?.monto!=null?String(row.cupon.monto):'',
                                      nota:      (row.cupon||row.amort)?.nota||''
                                    });
                                  }}
                                  title="Editar" style={{background:'transparent',border:'none',cursor:'pointer',color:'#60A5FA',fontSize:11,padding:'0 2px'}}>✏️</button>
                                <button onClick={()=>deleteRow(selected,row.ids)}
                                  title="Eliminar" style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--red)',fontSize:12,padding:'0 2px'}}>🗑</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{borderTop:'2px solid var(--border)',background:'var(--bg-input)'}}>
                          <td colSpan={isCERBond?12:9} style={{...tdPL,fontWeight:700,fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:0.8}}>Total</td>
                          <td style={{...tdP,background:'rgba(251,191,36,0.08)',color:'var(--yellow)',fontWeight:700}}>{fmtN(rows.reduce((a,r)=>a+r.amortPct,0))}</td>
                          <td style={{...tdP,background:'rgba(59,130,246,0.08)',color:'var(--accent)',fontWeight:700}}>{fmtN(rows.reduce((a,r)=>a+r.interestPct,0))}</td>
                          <td style={{...tdP,background:'rgba(52,211,153,0.08)',color:'var(--green)',fontWeight:700}}>{fmtN(rows.reduce((a,r)=>a+r.totalPct,0))}</td>
                          <td style={tdP}/>
                        </tr>
                      </tfoot>
                    </table>
                    <div style={{fontSize:9,color:'var(--text-muted)',padding:'6px 10px'}}>
                      ✎ Click en celda para editar
                      {isCERBond&&cerSerie&&cerSerie.length>0?' · Columnas CER calculadas con serie argentinadatos':''}
                      {isCERBond&&!cerSerie?' · Cargá la serie CER para ver columnas ajustadas':''}
                    </div>
                  </div>
                  );
                })()}

                {/* ── VISTA MI COBRO ── */}
                {viewMode==='micobro'&&(
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                    <thead>
                      <tr>
                        {['Fecha','Tipo','% VN total','Nominales','Cobro estimado','Estado',''].map(h=>(
                          <th key={h} style={{padding:'8px 12px',textAlign:h==='Cobro estimado'||h==='% VN total'?'right':'left',fontSize:10,color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:0.8,borderBottom:'1px solid var(--border)'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row=>{
                        const isFuture  = row.date > today;
                        const cobrado   = (row.cupon?.cobrado??!row.cupon) && (row.amort?.cobrado??!row.amort);
                        const hasAmort  = !!row.amort;
                        const hasCupon  = !!row.cupon;
                        // Para bonos CER: cobro = VN ajustado × qty / 100
                        // VN ajustado = vnDespues (o vnAntes para amort) × coefCER
                        const isCERRow = adjustsBy==='CER' && cerSerie;
                        const cerPagoRow = isCERRow ? getCERMinus10(cerSerie, row.date) : null;
                        const cerBaseRow = isCERRow && selMeta.emisionDate ? getCERMinus10(cerSerie, selMeta.emisionDate) : null;
                        const coefCERRow = (cerPagoRow && cerBaseRow) ? cerPagoRow/cerBaseRow : null;

                        // Amortización: monto% × VN ajustado × qty/100
                        const montoAmortBase = hasAmort ? row.amort.monto : 0;
                        const montoIntBase   = hasCupon ? row.cupon.monto : 0;

                        let totalCobro;
                        if(isCERRow && coefCERRow){
                          // Amort: montoAmortBase% × 100 × coefCER × qty/100 = montoAmortBase × coefCER × qty/100
                          const cobroAmort = montoAmortBase * coefCERRow * selBond.qty / 100;
                          // Interés: sobre VN ajustado antes del pago
                          const vnAjustAntes = row.vnAntes * coefCERRow;
                          const divisorBase  = selMeta.base==='30/360' ? 360 : 365;
                          const diasRow      = row.dias30360 || 0;
                          const cobroInt = hasCupon
                            ? (selMeta.tna/100) * (diasRow/divisorBase) * vnAjustAntes * selBond.qty / 100
                            : 0;
                          totalCobro = cobroAmort + cobroInt;
                        } else {
                          const montoAmort= hasAmort?(adjustsBy?row.amort.monto*coef:row.amort.monto):0;
                          const montoInt  = hasCupon?(adjustsBy?row.cupon.monto*coef:row.cupon.monto):0;
                          totalCobro = (montoAmort+montoInt)*(selBond.qty/100);
                        }
                        const montoTotal= (montoAmortBase+montoIntBase); // para mostrar % VN
                        const tipoLabel = hasAmort&&hasCupon?'💰+🎫 Amort.+Cupón':hasAmort?'💰 Amort.':'🎫 Cupón';
                        const tipoColor = hasAmort?'var(--yellow)':'var(--accent)';
                        return(
                          <tr key={row.date} style={{borderBottom:'1px solid var(--border)',
                            background:cobrado?'rgba(52,211,153,0.03)':!isFuture?'rgba(251,191,36,0.03)':'transparent'}}>
                            <td style={{padding:'10px 12px',fontFamily:"'DM Mono',monospace",fontSize:12}}>{fmtD(row.date)}</td>
                            <td style={{padding:'10px 12px'}}><span style={{color:tipoColor,fontSize:12}}>{tipoLabel}</span></td>
                            <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:12}}>
                              {fmtN(montoTotal)}%
                              {adjustsBy&&coef!==1&&<span style={{fontSize:9,color:'var(--yellow)',display:'block'}}>×{coef} {adjustsBy}</span>}
                            </td>
                            <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:12,color:'var(--text-muted)'}}>{selBond.qty.toLocaleString('es-AR')}</td>
                            <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:13}}>
                              {currency}{fmtN2(totalCobro)}
                            </td>
                            <td style={{padding:'10px 12px',fontSize:12}}>
                              {cobrado
                                ?<span style={{color:'var(--green)'}}>✅ {fmtD(row.cupon?.fechaCobro||row.amort?.fechaCobro)}</span>
                                :!isFuture
                                  ?<button onClick={()=>confirmCobro(selected,row.ids)}
                                    style={{background:'rgba(52,211,153,0.1)',border:'1px solid rgba(52,211,153,0.3)',borderRadius:6,padding:'3px 10px',color:'var(--green)',cursor:'pointer',fontSize:11}}>
                                    Confirmar cobro
                                  </button>
                                  :<span style={{color:'var(--text-muted)',fontSize:11}}>🟡 Pendiente</span>
                              }
                            </td>
                            <td style={{padding:'10px 12px'}}>
                              <button onClick={()=>deleteRow(selected,row.ids)}
                                style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--red)',fontSize:13}}>🗑</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>)
            }
          </div>
        )}
      </div>
    </div>

    {/* BondWizard inline — carga rápida desde FlujoTab */}
    {wizardFlujosOpen && selected && (
      <BondWizard
        ticker={selected}
        darkMode={true}
        onConfirm={(newFlows, meta)=>{
          const existing = bondFlows[selected]||[];
          if(existing.length > 0){
            const replace = window.confirm(
              `Ya hay ${existing.length} flujo(s) cargados para ${selected}.\n\n` +
              `¿Reemplazar todo? (Cancelar = agregar al final)`
            );
            if(replace){
              setBondFlows(prev=>({...prev,[selected]:newFlows}));
            } else {
              const existingKeys = new Set(existing.map(f=>f.date+'|'+f.tipo));
              const toAdd = newFlows.filter(f=>!existingKeys.has(f.date+'|'+f.tipo));
              setBondFlows(prev=>({...prev,[selected]:[...existing,...toAdd].sort((a,b)=>a.date.localeCompare(b.date))}));
            }
          } else {
            setBondFlows(prev=>({...prev,[selected]:newFlows}));
          }
          // Actualizar bondMeta con TNA/base del wizard
          if(meta) setBondMeta(prev=>({...prev,[selected]:{tna:meta.tna,base:meta.base,emisionDate:meta.emisionDate||null}}));
          setWizardFlujosOpen(false);
        }}
        onSkip={()=>setWizardFlujosOpen(false)}
      />
    )}
    </>
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
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d && Object.keys(d).length>1) setHistoricos(d); })
      .catch(()=>{});
  },[]);
  const isMobile = useIsMobile();
  const [tab,setTab]           = useState("dashboard");
  const [visitedTabs, setVisitedTabs] = useState(new Set(["dashboard"]));
  const handleTabChange = (t) => { setTab(t); setVisitedTabs(prev=>new Set([...prev,t])); };
  const [modal,setModal]       = useState(null);
  const [bondWizard,setBondWizard] = useState(null); // {ticker, onConfirm}
  const [ventaResult,setVentaResult] = useState(null);
  const [fx,setFx]             = useState("CCL");
  const [liveFX,setLiveFX]     = useState(FX_FALLBACK);
  const [livePrices,setLivePrices] = useState({});
  const [liveT10Y,setLiveT10Y] = useState(TASA10Y_FALLBACK);
  const [liveSP500,setLiveSP500] = useState(null);
  const [priceStatus,setPriceStatus] = useState("idle");
  const [lastRefresh,setLastRefresh] = useState(null);
  const [countdown,setCountdown]   = useState(300);

  // countdown movido a CountdownDisplay component — no re-renderiza el App

  // ── GitHub Sync ──────────────────────────────────────────────────────────
  const REPO = "MoloMolinaCa/mi-portfolio";
  const DATA_FILE = "public/portfolio_data.json";
  const [syncStatus, setSyncStatus] = useState("idle"); // idle|loading|saving|error
  const [ghSha, setGhSha] = useState(null); // SHA del archivo en GitHub para updates

  // Cargar datos desde GitHub al iniciar
  useEffect(()=>{
    setSyncStatus("loading");
    fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_FILE}`)
      .then(r=>r.ok?r.json():null)
      .then(data=>{
        if(!data?.content) return null;
        setGhSha(data.sha);
        const decoded = JSON.parse(atob(data.content.replace(/\n/g,'')));
        return decoded;
      })
      .then(decoded=>{
        if(!decoded) return;
        if(decoded.port?.length)   setPort(decoded.port);
        if(decoded.trades?.length) setTrades(decoded.trades);
        if(decoded.bondFlows && Object.keys(decoded.bondFlows).length){
          setBondFlows({...SEED_BOND_FLOWS,...decoded.bondFlows});
        }
        if(decoded.bondMeta) setBondMetaFromGH(decoded.bondMeta);
        setSyncStatus("idle");
      })
      .catch(e=>{ console.warn("GitHub sync error:", e); setSyncStatus("error"); });
  },[]);

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
          bondFlows: newFlows||{}, bondMeta: newMeta||{},
          sha: ghSha, deviceId
        })
      });
      if(res.ok){
        const d = await res.json();
        if(d.sha) setGhSha(d.sha);
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
        const shouldApply = !localHasData || (ghTs > localTs && ghDeviceId !== myDeviceId);
        if(shouldApply){
          isLoadingFromGH.current = true;
          if(data.port?.length)   setPort(data.port);
          if(data.trades?.length) setTrades(data.trades);
          if(data.bondFlows && Object.keys(data.bondFlows).length){
            setBondFlows({...SEED_BOND_FLOWS,...data.bondFlows});
          }
          localStorage.setItem('gal_last_save', ghTs.toString());
          setTimeout(()=>{ isLoadingFromGH.current = false; }, 500);
        }
        setSyncChecked(true);
        setSyncStatus("idle");
      })
      .catch(()=>{ setSyncChecked(true); setSyncStatus("idle"); });
  },[]);

  // Guardar en localStorage + GitHub cuando cambian los datos
  const saveTimerRef = React.useRef(null);
  useEffect(()=>{
    if(!storageReady) return;
    try{ 
      localStorage.setItem("gal_port_v1",JSON.stringify(port));
      localStorage.setItem('gal_last_save', Date.now().toString());
    }catch{}
  },[port,storageReady]);

  useEffect(()=>{
    if(!storageReady) return;
    try{
      localStorage.setItem("gal_trades_v3",JSON.stringify(trades));
      localStorage.setItem('gal_last_save', Date.now().toString());
    }catch{}
  },[trades,storageReady]);

  useEffect(()=>{
    if(!storageReady) return;
    try{ 
      localStorage.setItem("gal_bond_flows_v1",JSON.stringify(bondFlows));
      localStorage.setItem('gal_last_save', Date.now().toString());
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
      // Solo guardar si este save es más nuevo que el último sync
      if(saveTs < lastSyncRef.current) return;
      const meta = (() => { try{ return JSON.parse(localStorage.getItem('gal_bond_meta_v1')||'{}'); }catch{ return {}; } })();
      lastSyncRef.current = saveTs;
      saveToGitHub(port, trades, bondFlows, meta);
    }, 2000);
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
                    icon:"📅", lbl:"Rendimiento del día",
                    main:fmtP(dayPct),
                    sub:hideAmounts?"••••":(dayPnlUSD>=0?"+":"")+fmtU(dayPnlUSD),
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
                  <div style={{height:isMobile?260:410}}>
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
