/* eslint-disable */
import React, { useState, useMemo } from "react";

export default function RankingWidget({en, historicos, fxRate, currency}){
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
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"5px 16px",borderBottom:"1px solid var(--border)"}}>
        <span style={{width:20}}/><span style={{width:50,fontSize:9,color:"var(--text-muted)"}}>TICKER</span>
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
