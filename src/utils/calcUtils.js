/* eslint-disable */
import { calcVNR } from './shared';
import { SEED_BOND_META } from '../constants/bondFlows';

// Tickers marcados como bono en el portfolio (type bono_*); los vendidos caen al regex
const _knownBonds = new Set();
export function setKnownBonds(tickers){ for(const t of tickers||[]) _knownBonds.add(String(t).toUpperCase()); }
export function isBondTicker(tkr){
  const T=String(tkr||'').toUpperCase();
  if(_knownBonds.has(T)||SEED_BOND_META?.[T]) return true;
  if(!/\d/.test(T)) return false;
  return T.endsWith('D')||/^(TZX|TX|TY|TV|GD|AL|AE|AO|AN|TLCU|BP|S\d)/.test(T);
}

// P&L de un período [s, e] por ticker, única fuente para gráfico, KPI y Análisis.
// Posición inicial = trades con fecha < s (valuada a precio histórico); trades con fecha >= s son flujos
// a su precio real + comisión, en USD al CCL de ese día. Si e es hoy, el valor final es el live de `en`.
export function calcPeriodPnL({ s, e, trades, en, historicos, bondFlows = {}, today }) {
  const cclBars = historicos?.CCL || [];
  const lastLE = (bars, d) => { let lo = 0, hi = bars.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (bars[m].date <= d) { r = m; lo = m + 1; } else hi = m - 1; } return r >= 0 ? bars[r] : null; };
  const ccl = d => lastLE(cclBars, d)?.close || cclBars[0]?.close || 1;
  const curOf = {};
  for (const t of trades) if (!curOf[t.ticker]) curOf[t.ticker] = String(t.currency || 'ARS').toUpperCase();
  for (const h of en) if (h.buyCurrency) curOf[h.ticker] = String(h.buyCurrency).toUpperCase();
  const toUSD = (amt, tk, d) => curOf[tk] === 'USD' ? amt : amt / ccl(d);
  const qtyF = (tk, q) => isBondTicker(tk) ? q / 100 : q;
  const qtyAt = (tk, d, incl) => trades.reduce((a, t) => t.ticker === tk && (incl ? t.date <= d : t.date < d) ? a + (t.tipo === 'compra' ? +t.qty : -t.qty) : a, 0);
  const priceAt = (tk, d) => {
    const b = lastLE(historicos?.[tk] || [], d);
    if (b?.close > 0) return b.close;
    const lb = trades.filter(t => t.ticker === tk && t.tipo === 'compra' && t.date <= d).sort((a, b) => b.date.localeCompare(a.date))[0];
    return lb ? +lb.price : 0;
  };
  const endIsToday = e >= today;
  const tickers = [...new Set([...trades.map(t => t.ticker), ...en.map(h => h.ticker)])];
  const byTicker = {};
  const flows = [];
  let total = 0;
  for (const tk of tickers) {
    const q0 = Math.max(0, qtyAt(tk, s, false));
    const valStart = q0 > 0 ? toUSD(priceAt(tk, s) * qtyF(tk, q0), tk, s) : 0;
    let buys = 0, sells = 0, coupons = 0;
    for (const t of trades) {
      if (t.ticker !== tk || t.date < s || t.date > e) continue;
      const com = +t.comision || 0;
      const gross = (+t.price || 0) * qtyF(tk, +t.qty || 0);
      const usd = toUSD(t.tipo === 'compra' ? gross + com : gross - com, tk, t.date);
      if (t.tipo === 'compra') buys += usd; else sells += usd;
      flows.push({ date: t.date, amount: t.tipo === 'compra' ? -usd : usd });
    }
    const bf = bondFlows[tk] || [];
    for (const f of bf) {
      if (!f.cobrado || !f.fechaCobro || f.fechaCobro < s || f.fechaCobro > e) continue;
      const q = Math.max(0, qtyAt(tk, f.fechaCobro, true));
      if (q <= 0) continue;
      const local = f.tipo === 'amortizacion' ? f.monto * q / 100 : f.monto * q * calcVNR(bf, f.fechaCobro, SEED_BOND_META?.[tk]?.vnrInicial ?? 100) / 10000;
      const usd = toUSD(local, tk, f.fechaCobro);
      coupons += usd;
      flows.push({ date: f.fechaCobro, amount: usd });
    }
    let valEnd;
    if (endIsToday) valEnd = en.filter(h => h.ticker === tk).reduce((a, h) => a + (h.valUSD || 0), 0);
    else { const q1 = Math.max(0, qtyAt(tk, e, true)); valEnd = q1 > 0 ? toUSD(priceAt(tk, e) * qtyF(tk, q1), tk, e) : 0; }
    if (!valStart && !valEnd && !buys && !sells && !coupons) continue;
    const pnl = valEnd - valStart - buys + sells + coupons;
    const invested = valStart + buys;
    byTicker[tk] = { pnl, valStart, valEnd, buys, sells, coupons, retPct: invested > 0 ? pnl / invested * 100 : 0, cerrado: valEnd === 0 };
    total += pnl;
  }
  const startVal = Object.values(byTicker).reduce((a, x) => a + x.valStart, 0);
  const endVal = Object.values(byTicker).reduce((a, x) => a + x.valEnd, 0);
  if (startVal > 0) flows.push({ date: s, amount: -startVal });
  flows.push({ date: e, amount: endVal });
  flows.sort((a, b) => a.date.localeCompare(b.date));
  return { total, byTicker, flows, startVal, endVal };
}

// ── Time-Weighted Return (TWR) ────────────────────────────────────────────────
export function calcTWR(dates, trades, en, tickerBars, cclBars, mepBars, currency, fxRate, livePricesMap, customEnd=null, realTodayStr=null, bondFlows={}){
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

  // Todos los activos operados (incluye cerrados), no solo los que se tienen hoy
  const enByT={};for(const h of en)enByT[h.ticker]=h;
  const allPos=Object.keys(tradesByTicker).map(tk=>enByT[tk]||{ticker:tk,type:isBondTicker(tk)?"bono":"otro",buyCurrency:String(tradesByTicker[tk][0].currency||"ARS").toUpperCase()});
  for(const h of en)if(!tradesByTicker[h.ticker])allPos.push(h);
  const posByT={};for(const h of allPos)posByT[h.ticker]=h;
  const bondT=h=>h.type==="bono_usd"||h.type==="bono_ars"||h.type==="bono";
  const getPortVal=(dateStr, dateT)=>{
    let total=0;
    const isToday=dateStr===todayStr;
    for(const h of allPos){
      const ticks=tradesByTicker[h.ticker]||[];
      const buys=ticks.filter(t=>t.tipo==="compra"&&t._ts<=dateT);
      const sells=ticks.filter(t=>t.tipo==="venta"&&t._ts<=dateT);
      const qty=Math.max(0,buys.reduce((a,t)=>a+t.qty,0)-sells.reduce((a,t)=>a+t.qty,0));
      if(qty<=0)continue;
      const isBond=bondT(h);
      const qtyFactor=isBond?qty/100:qty;
      const bars=tickerBars[h.ticker];
      let price;
      if(isToday&&liveMap[h.ticker]){
        price=liveMap[h.ticker];
      } else if(bars&&bars.length){
        if(dateStr<bars[0].date){
          // No historicos yet — fall back to average buy price so we don't phantom-gain later
          const firstBuy=buys.slice().sort((a,b)=>a.date.localeCompare(b.date))[0];
          if(!firstBuy||dateStr<firstBuy.date)continue;
          const totalCost=buys.reduce((a,t)=>a+t.qty*t.price,0);
          const totalQty=buys.reduce((a,t)=>a+t.qty,0);
          price=totalQty>0?totalCost/totalQty:h.currentPrice;
        } else {
          const rawP=findPrice2(bars,dateStr);
          if(!rawP)continue;
          price=rawP;
        }
      } else {
        const firstBuy=buys.slice().sort((a,b)=>a.date.localeCompare(b.date))[0];
        if(!firstBuy||dateStr<firstBuy.date)continue;
        const totalCost=buys.reduce((a,t)=>a+t.qty*t.price,0);
        const totalQty=buys.reduce((a,t)=>a+t.qty,0);
        price=totalQty>0?totalCost/totalQty:h.currentPrice;
      }
      const cclDay=cclBars.length?findPrice2(cclBars,dateStr)||fxRate:fxRate;
      const mepDay=mepBars.length?findPrice2(mepBars,dateStr)||fxRate:fxRate;
      const isUSD=h.buyCurrency==="USD";
      if(currency==="ARS")total+=isUSD?price*qtyFactor*cclDay:price*qtyFactor;
      else if(currency==="USD_CCL")total+=isUSD?price*qtyFactor:price*qtyFactor/cclDay;
      else total+=isUSD?price*qtyFactor:price*qtyFactor/mepDay;
    }
    return total;
  };

  // Pre-index confirmed coupons/amorts by fechaCobro for fast lookup
  const couponsByDate={};
  for(const [ticker, flows] of Object.entries(bondFlows||{})){
    const isUSD=en.find(h=>h.ticker===ticker)?.buyCurrency==="USD"||String(ticker).toUpperCase().endsWith('D');
    for(const f of (flows||[])){
      if(!f.cobrado||!f.fechaCobro||!f.monto) continue;
      if(!couponsByDate[f.fechaCobro]) couponsByDate[f.fechaCobro]=[];
      couponsByDate[f.fechaCobro].push({ticker, monto:f.monto, isUSD, tipo:f.tipo, fechaCobro:f.fechaCobro});
    }
  }

  const couponDates=Object.keys(couponsByDate);
  const getCouponValueBetween=(from,to)=>couponDates.reduce((a,d)=>d>from&&d<=to?a+getCouponValueOnDate(d):a,0);
  const getCouponValueOnDate=(dateStr)=>{
    const list=couponsByDate[dateStr];
    if(!list?.length) return 0;
    const cclDay=cclBars.length?findPrice2(cclBars,dateStr)||fxRate:fxRate;
    const mepDay=mepBars.length?findPrice2(mepBars,dateStr)||fxRate:fxRate;
    const dateT=new Date(dateStr).getTime();
    let total=0;
    for(const {ticker,monto,isUSD,tipo,fechaCobro} of list){
      const ticks=tradesByTicker[ticker]||[];
      const buys=ticks.filter(t=>t.tipo==="compra"&&t._ts<=dateT);
      const sells=ticks.filter(t=>t.tipo==="venta"&&t._ts<=dateT);
      const qty=Math.max(0,buys.reduce((a,t)=>a+t.qty,0)-sells.reduce((a,t)=>a+t.qty,0));
      if(qty<=0) continue;
      // Amortizaciones siempre sobre VN original; cupones sobre VNR residual
      let cash;
      if(tipo==='amortizacion'){
        cash=monto*qty/100;
      } else {
        const vnrInicial=(SEED_BOND_META?.[ticker]?.vnrInicial)??100;
        const vnr=calcVNR(bondFlows[ticker]||[], fechaCobro, vnrInicial);
        cash=monto*qty*vnr/10000; // monto per 100 VNR × (vnr/100) × qty/100
      }
      const cashConverted=isUSD
        ? (currency==="ARS"?cash*cclDay:cash)
        : (currency==="ARS"?cash:cash/(currency==="USD_CCL"?cclDay:mepDay));
      total+=cashConverted;
    }
    return total;
  };

  // Compras - ventas (precio real + comisión) con fecha en (from, to], en la moneda del gráfico
  // Detalle bruto/comisión de compras y ventas en (from, to], para replicar comisiones en el benchmark
  const getFlowDetailBetween=(from,to)=>{
    const r={buyGross:0,buyCom:0,sellGross:0,sellCom:0};
    for(const tk in tradesByTicker){
      const h=posByT[tk];const isBond=bondT(h);const isUSD=h.buyCurrency==="USD";
      for(const t of tradesByTicker[tk]){
        if(!(t.date>from&&t.date<=to))continue;
        const cclDay=cclBars.length?findPrice2(cclBars,t.date)||fxRate:fxRate;
        const mepDay=mepBars.length?findPrice2(mepBars,t.date)||fxRate:fxRate;
        const conv=a=>currency==="ARS"?(isUSD?a*cclDay:a):(isUSD?a:a/(currency==="USD_CCL"?cclDay:mepDay));
        const gross=conv((+t.price||0)*(isBond?t.qty/100:t.qty)), com=conv(+t.comision||0);
        if(t.tipo==="compra"){r.buyGross+=gross;r.buyCom+=com;}else{r.sellGross+=gross;r.sellCom+=com;}
      }
    }
    return r;
  };
  const getNetFlowBetween=(from,to)=>{
    let f=0;
    for(const tk in tradesByTicker){
      const h=posByT[tk];const isBond=bondT(h);const isUSD=h.buyCurrency==="USD";
      for(const t of tradesByTicker[tk]){
        if(!(t.date>from&&t.date<=to))continue;
        const com=+t.comision||0;const gross=(+t.price||0)*(isBond?t.qty/100:t.qty);
        const amt=t.tipo==="compra"?gross+com:gross-com;
        const cclDay=cclBars.length?findPrice2(cclBars,t.date)||fxRate:fxRate;
        const mepDay=mepBars.length?findPrice2(mepBars,t.date)||fxRate:fxRate;
        const v=currency==="ARS"?(isUSD?amt*cclDay:amt):(isUSD?amt:amt/(currency==="USD_CCL"?cclDay:mepDay));
        f+=t.tipo==="compra"?v:-v;
      }
    }
    return f;
  };

  const twr=[{date:dates[0],val:100}];
  twr.meta={startVal:getPortVal(dates[0], new Date(dates[0]).getTime()), flows:[null]};
  let cumulative=1;

  for(let i=1;i<dates.length;i++){
    const dateStr=dates[i];
    const prevDateStr=dates[i-1];
    const dateT=new Date(dateStr).getTime();
    const prevDateT=new Date(prevDateStr).getTime();

    const valPrevClose=getPortVal(prevDateStr, prevDateT);
    const valToday=getPortVal(dateStr, dateT);
    const netFlow=getNetFlowBetween(prevDateStr, dateStr);
    twr.meta.flows.push(getFlowDetailBetween(prevDateStr, dateStr));
    const couponsToday=getCouponValueBetween(prevDateStr, dateStr);

    let dayReturn;
    if(valPrevClose<=0){
      // Primer día con posición: del precio de compra al cierre
      dayReturn=netFlow>0?(valToday+couponsToday)/netFlow:1;
    } else {
      dayReturn=(valToday-netFlow+couponsToday)/valPrevClose;
    }

    if(!isFinite(dayReturn)||dayReturn<=0||dayReturn>3)dayReturn=1;

    cumulative*=dayReturn;
    twr.push({date:dateStr,val:parseFloat((100*cumulative).toFixed(4))});
  }

  return twr;
}

// Benchmark base 100 que recibe los mismos aportes/retiros netos que el portfolio y paga comisión
// en la misma proporción (compra neta → % de comisión de compra, retiro neto → % de venta; rotación = 0)
export function applyCommissionsToBenchmark(benchPts, port100){
  const meta=port100?.meta;
  if(!benchPts?.length||!meta) return benchPts;
  const px=d=>{let b=null;for(const p of benchPts){if(p.date<=d)b=p;else break;}return (b||benchPts[0]).val;};
  let S=meta.startVal, cum=1, prevPx=px(port100[0].date);
  const out=[{date:port100[0].date,val:100}];
  for(let i=1;i<port100.length;i++){
    const d=port100[i].date, p=px(d), f=meta.flows[i]||{buyGross:0,buyCom:0,sellGross:0,sellCom:0};
    const net=f.buyGross-f.sellGross;
    const com=net>0?(f.buyGross>0?net*f.buyCom/f.buyGross:0):(net<0&&f.sellGross>0?-net*f.sellCom/f.sellGross:0);
    const grown=S*(prevPx>0?p/prevPx:1);
    if(S>0) cum*=(grown-com)/S;
    else if(net>0) cum*=(net-com)/net;
    S=Math.max(0,grown-com+net);
    out.push({date:d,val:parseFloat((100*cum).toFixed(4))});
    prevPx=p;
  }
  return out;
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

export function calcPortValAtDate(dateStr, trades, tickerBars, cclBars, fxRate) {
  const dateT = new Date(dateStr).getTime();
  const tbt = {};
  for(const t of trades){ if(!tbt[t.ticker]) tbt[t.ticker]=[]; tbt[t.ticker].push({...t,_ts:new Date(t.date).getTime()}); }
  function fp(bars,d){ if(!bars?.length)return null; let lo=0,hi=bars.length-1,res=-1; while(lo<=hi){const mid=(lo+hi)>>1;if(bars[mid].date<=d){res=mid;lo=mid+1;}else hi=mid-1;} return res>=0?bars[res].close||null:bars[0].close||null; }
  const isBond=isBondTicker;
  // USD-denominated instruments: bonds ending in D, and trades with currency=USD
  const isUSDTicker=(tkr)=>{
    const T=String(tkr||'').toUpperCase();
    if(T.endsWith('D')&&isBond(tkr)) return true;
    const allBuyTrades=(tbt[tkr]||[]).filter(t=>t.tipo==="compra");
    return allBuyTrades.length>0&&allBuyTrades[0].currency==="USD";
  };
  let total=0;
  for(const ticker of Object.keys(tickerBars)){
    const ticks=tbt[ticker]||[];
    const buys=ticks.filter(t=>t.tipo==="compra"&&t._ts<=dateT);
    const sells=ticks.filter(t=>t.tipo==="venta"&&t._ts<=dateT);
    const qty=Math.max(0,buys.reduce((a,t)=>a+t.qty,0)-sells.reduce((a,t)=>a+t.qty,0));
    if(qty<=0)continue;
    const qtyF=isBond(ticker)?qty/100:qty;
    const bars=tickerBars[ticker];
    if(!bars||!bars.length||dateStr<bars[0].date)continue;
    const rawP=fp(bars,dateStr);
    if(!rawP)continue;
    const cclDay=cclBars.length?fp(cclBars,dateStr)||fxRate:fxRate;
    total+=isUSDTicker(ticker)?rawP*qtyF:rawP*qtyF/cclDay;
  }
  return total;
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
