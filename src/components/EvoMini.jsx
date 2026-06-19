/* eslint-disable */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { calcTWR, calcXIRR, deannualizeXIRR } from '../utils/calcUtils';
import { todayAR } from '../utils/shared';
import { SEED_BOND_META } from '../constants/bondFlows';
import Chart100 from './Chart100';

export default function EvoMini({en,trades,fxRate,liveT10Y,liveFX,liveSP500,historicos,isModal=false,livePricesAll={},onExpand=null}){
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
      // P&L en dólares real: Modified Dietz numerator = endVal - startVal - flujos netos invertidos
      // flows intermedios: compras = negativo (plata que sale), ventas = positivo (plata que entra)
      const middleFlowsSum=flows.slice(1,-1).reduce((a,f)=>a+f.amount,0);
      const portDollarPnL=endValUSD-startValUSD+middleFlowsSum;
      // Portfolio XIRR: calcular anual y des-anualizar al periodo
      let portXIRR=null;
      if(flows.length>=2&&startValUSD>0&&endValUSD>0){const rAnual=calcXIRR(flows);if(rAnual!=null)portXIRR=deannualizeXIRR(rAnual,days)*100;}
      // SPY XIRR: mismos cashflows, terminal crecido por SPY, des-anualizado
      let spyXIRR=null;
      let spDollarPnL=null;
      if(cd.spy100&&cd.spy100.length>=2){const spy100=cd.spy100;const spyEnd=spy100[spy100.length-1].val;const spyAt=(dateStr)=>{let best=spy100[0];for(const p of spy100){if(p.date<=dateStr)best=p;else break;}return best.val||100;};if(spyEnd>0){const spyFlows=[];spyFlows.push({date:s,amount:-startValUSD});for(const fl of flows.slice(1,-1))spyFlows.push({...fl});let spyFinalVal=0;for(const fl of spyFlows){const spyAtFlow=spyAt(fl.date);const growth=spyAtFlow>0?spyEnd/spyAtFlow:1;spyFinalVal+=(-fl.amount)*growth;}spDollarPnL=spyFinalVal-startValUSD+middleFlowsSum;spyFlows.push({date:e,amount:spyFinalVal});spyFlows.sort((a,b)=>a.date.localeCompare(b.date));if(spyFlows.length>=2&&startValUSD>0&&spyFinalVal>0){const rAnualSpy=calcXIRR(spyFlows);if(rAnualSpy!=null)spyXIRR=deannualizeXIRR(rAnualSpy,days)*100;}}}
      const alpha=(portXIRR!=null&&spyXIRR!=null)?portXIRR-spyXIRR:null;
      return {portXIRR,spyXIRR,alpha,portDollarPnL,spDollarPnL};
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
            <span style={{fontSize:isModal?10:8,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700}}>Retorno total</span>
            {portXIRR!=null&&pillX("Portfolio",portXIRR,pcX(portXIRR),portXIRR>=0?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",portXIRR>=0?"rgba(16,185,129,0.25)":"rgba(239,68,68,0.25)")}
            {spyXIRR!=null&&pillX("S&P 500",spyXIRR,"#60A5FA","rgba(96,165,250,0.1)","rgba(96,165,250,0.25)")}
            {alpha!=null&&pillX("Alpha",alpha,pcX(alpha),alpha>=0?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",alpha>=0?"rgba(16,185,129,0.25)":"rgba(239,68,68,0.25)")}
            <span style={{fontSize:isModal?9:7,color:"var(--text-muted)",marginLeft:"auto"}}>efectivo en el período</span>
          </div>
        );
      })()}
      {xirrData&&(xirrData.portDollarPnL!=null)&&(()=>{
        const{portDollarPnL,spDollarPnL}=xirrData;
        // Convertir USD a moneda seleccionada
        const sym=currency==="ARS"?"$ ":"US$ ";
        const toDisplay=v=>currency==="ARS"?v*fxRate:v;
        const fN=n=>{const d=toDisplay(n);const a=Math.abs(d);return(d>=0?"+":"\u2212")+sym+(a>=1e6?(a/1e6).toFixed(1)+"M":a>=1e3?Math.round(a).toLocaleString("es-AR"):a.toFixed(0));};
        const pcc=n=>n>=0?"var(--green)":"var(--red)";
        const pill=(l,v,col)=>{const bg=col==="#60A5FA"?"rgba(96,165,250,0.1)":v>=0?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)";const bd=col==="#60A5FA"?"rgba(96,165,250,0.25)":v>=0?"rgba(16,185,129,0.25)":"rgba(239,68,68,0.25)";return(<div key={l} style={{display:"inline-flex",alignItems:"center",gap:isModal?8:5,background:bg,padding:isModal?"5px 14px":"3px 10px",borderRadius:8,border:"1px solid "+bd}}><span style={{fontSize:isModal?11:9,color:"var(--text-muted)",fontWeight:500}}>{l}</span><span style={{fontSize:isModal?16:12,fontWeight:700,color:col,fontFamily:"monospace"}}>{fN(v)}</span></div>);};
        return(<div style={{display:"flex",alignItems:"center",gap:isModal?14:8,marginTop:isModal?10:6,paddingTop:isModal?10:6,borderTop:"1px solid var(--border)",flexWrap:"wrap"}}><span style={{fontSize:isModal?10:8,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700}}>P&L</span>{pill("Portfolio",portDollarPnL,pcc(portDollarPnL))}{spDollarPnL!=null&&pill("S&P 500",spDollarPnL,"#60A5FA")}<span style={{fontSize:isModal?9:7,color:"var(--text-muted)",marginLeft:"auto"}}>en el per\u00edodo</span></div>);
      })()}

    </div>
  );
} 

