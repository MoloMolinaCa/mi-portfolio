/* eslint-disable */
import React, { useState, useEffect } from "react";
import { calcTWR } from '../utils/calcUtils';
import { todayAR } from '../utils/shared';
import Chart100 from './Chart100';

export default function EvoTab({en,trades,totUSD,totPct,benchPct,alpha,liveT10Y,byType,card,fxRate,fx,historicos}){
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

