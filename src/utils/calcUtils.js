/* eslint-disable */

// ── Time-Weighted Return (TWR) ────────────────────────────────────────────────
export function calcTWR(dates, trades, en, tickerBars, cclBars, mepBars, currency, fxRate, livePricesMap, customEnd=null, realTodayStr=null){
  if(!dates||dates.length<2) return [];
  if(!realTodayStr){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset()-180);realTodayStr=d.toISOString().slice(0,10);}
  const todayStr=customEnd&&customEnd<realTodayStr?null:realTodayStr;
  const liveMap=(todayStr&&livePricesMap)||{};

  const tradesByTicker={};
  for(const t of trades){
    if(!tradesByTicker[t.ticker]) tradesByTicker[t.ticker]=[];
    tradesByTicker[t.ticker].push({...t, _ts: new Date(t.date).getTime()});
  }

  function findPrice2(bars,d){
    if(!bars?.length)return null;
    let lo=0,hi=bars.length-1,res=-1;
    while(lo<=hi){
      const mid=(lo+hi)>>1;
      if(bars[mid].date<=d){ res=mid; lo=mid+1; }
      else hi=mid-1;
    }
    if(res>=0) return bars[res].close||null;
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
        price=liveMap[h.ticker];
      } else if(bars&&bars.length){
        if(dateStr<bars[0].date)continue;
        const rawP=findPrice2(bars,dateStr);
        if(!rawP)continue;
        price=rawP;
      } else {
        const firstBuy=buys.slice().sort((a,b)=>a.date.localeCompare(b.date))[0];
        if(!firstBuy||dateStr<firstBuy.date)continue;
        const totalCost=buys.reduce((a,t)=>a+t.qty*t.price,0);
        const totalQty=buys.reduce((a,t)=>a+t.qty,0);
        price=totalQty>0?totalCost/totalQty:h.currentPrice;
      }
      const cclDay=cclBars.length?findPrice2(cclBars,dateStr)||fxRate:fxRate;
      const mepDay=mepBars.length?findPrice2(mepBars,dateStr)||fxRate:fxRate;
      if(currency==="ARS")total+=price*qtyFactor;
      else if(currency==="USD_CCL")total+=price*qtyFactor/cclDay;
      else total+=price*qtyFactor/mepDay;
    }
    return total;
  };

  const twr=[{date:dates[0],val:100}];
  let cumulative=1;

  for(let i=1;i<dates.length;i++){
    const dateStr=dates[i];
    const prevDateStr=dates[i-1];
    const dateT=new Date(dateStr).getTime();
    const prevDateT=new Date(prevDateStr).getTime();

    const valPrevClose=getPortVal(prevDateStr, prevDateT);
    const dateT_before=dateT-1;
    const valTodayBeforeFlow=getPortVal(dateStr, dateT_before);

    let dayReturn;
    if(valPrevClose<=0){
      dayReturn=1;
    } else {
      dayReturn=valTodayBeforeFlow/valPrevClose;
    }

    if(!isFinite(dayReturn)||dayReturn<=0||dayReturn>3)dayReturn=1;

    cumulative*=dayReturn;
    twr.push({date:dateStr,val:parseFloat((100*cumulative).toFixed(4))});
  }

  return twr;
}

// ── XIRR — Newton-Raphson + biseccion ────────────────────────────────────────
export function calcXIRR(flows, guess=0.1) {
  if(!flows||flows.length<2) return null;
  const d0 = new Date(flows[0].date).getTime();
  const yf = flows.map(f=>({a:f.amount, t:(new Date(f.date).getTime()-d0)/31557600000}));
  const npvAt = (r) => { let s=0; for(const f of yf){ const d=Math.pow(1+r,f.t); if(!d||!isFinite(d)) return NaN; s+=f.a/d; } return s; };
  const dnpvAt = (r) => { let s=0; for(const f of yf){ const d=Math.pow(1+r,f.t); if(!d||!isFinite(d)) return NaN; s-=f.t*f.a/(d*(1+r)); } return s; };
  let r = guess;
  for(let i=0;i<100;i++){
    const npv=npvAt(r), dnpv=dnpvAt(r);
    if(Math.abs(npv)<1e-7) return r;
    if(!dnpv||!isFinite(dnpv)||isNaN(npv)) break;
    const rNew = r - npv/dnpv;
    if(Math.abs(rNew-r)<1e-10) return r;
    r = rNew; if(r<-0.99) r=-0.99; if(r>10) r=10;
  }
  let lo=-0.99, hi=10, nLo=npvAt(lo), nHi=npvAt(hi);
  if(isNaN(nLo)||isNaN(nHi)||nLo*nHi>0) return null;
  for(let i=0;i<200;i++){
    const mid=(lo+hi)/2, nMid=npvAt(mid);
    if(isNaN(nMid)) return null;
    if(Math.abs(nMid)<1e-7) return mid;
    if(nMid*nLo<0){ hi=mid; nHi=nMid; } else { lo=mid; nLo=nMid; }
    if(hi-lo<1e-10) return (lo+hi)/2;
  }
  return null;
}

export function deannualizeXIRR(xirrAnnual, days) {
  if(xirrAnnual==null||!days||days<=0) return null;
  return (Math.pow(1 + xirrAnnual, days/365) - 1);
}

export function calcModifiedDietzReturn(startVal, endVal, cashFlows, totalDays) {
  if(!startVal||startVal<=0||!totalDays||totalDays<=0) return null;
  const sumCF = cashFlows.reduce((a,cf)=>a+cf.amount, 0);
  const weightedCF = cashFlows.reduce((a,cf)=>a+cf.amount*((totalDays-cf.daysSinceStart)/totalDays), 0);
  const denom = startVal + weightedCF;
  if(Math.abs(denom)<0.01) return null;
  return (endVal - startVal - sumCF) / denom;
}

export function calcSeriesPeriodReturn(bars, startDate, endDate) {
  if(!bars||bars.length<2||!startDate||!endDate) return null;
  const findClose = (d) => {
    let lo=0,hi=bars.length-1,res=-1;
    while(lo<=hi){ const mid=(lo+hi)>>1; if(bars[mid].date<=d){res=mid;lo=mid+1;}else hi=mid-1; }
    return res>=0 ? bars[res].close : null;
  };
  const s = findClose(startDate), e = findClose(endDate);
  if(!s||!e||s<=0) return null;
  return (e/s - 1);
}
