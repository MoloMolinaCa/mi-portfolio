/* eslint-disable */
import React, { useState, useMemo } from "react";
import { calcTWR } from '../utils/calcUtils';
import { ASSET_TYPES, todayAR } from '../utils/shared';

export default function AnalisisTab({en, historicos, fxRate, currency, card, livePrices, hideAmounts=false, trades=[], isMobile=false}) {
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
    const f = bars.filter(b=>b.date>=start&&b.date<=end&&b.close!=null&&b.close>0);
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
          {label:"Mi Portfolio", ex:portExtremes},
          {label:"S&P 500", ex:spExtremes},
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
                        {h.usedBuyPrice&&<span title="Sin historial para este período — se usó precio de compra" style={{marginLeft:4,color:"var(--yellow)",fontSize:9}}>â
pc</span>}
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
                <td colSpan={selP.key!=="todo"?3:2} style={{padding:"8px 12px",fontWeight:700,fontSize:12}}>Total</td>
                <td/>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:pc(totalPnlUSD)}}>{hideAmounts?"••••":(totalPnlUSD>=0?"+":"")+fmtU(totalPnlUSD,0)}</td>
                <td colSpan={2}/>
              </tr>
            </tfoot>
          </table>
          {selP.key!=="todo" && contributionsSorted.some(h=>h.usedBuyPrice) && (
            <div style={{marginTop:8,fontSize:11,color:"var(--yellow)",display:"flex",gap:6,alignItems:"center"}}>
              <span>â
pc</span>
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
              });

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
          // Ï_p² = Î£_i Î£_j w_i * w_j * Ï_i * Ï_j * Ï_ij
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
          // MCTR_i = w_i * Î£_j (w_j * Ï_i * Ï_j * Ï_ij) / Ï_p
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
