/* eslint-disable */
import React, { useMemo } from "react";

export default function DayMoversWidget({en, historicos, fxRate, livePrices, card, hideAmounts=false}){
  const fmtU=(n,d=0)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:d}).format(n);
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

  const row=(h)=>(
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
          <span>🚀</span><span style={{fontWeight:700,fontSize:12,color:"var(--green)"}}>Top 5 · Mejores del día</span>
        </div>
        {top5.map(h=>row(h))}
      </div>
      <div style={{...card,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8,background:"rgba(248,113,113,0.05)"}}>
          <span>📉</span><span style={{fontWeight:700,fontSize:12,color:"var(--red)"}}>Bottom 5 · Peores del día</span>
        </div>
        {bot5.map(h=>row(h))}
      </div>
    </div>
  );
}
