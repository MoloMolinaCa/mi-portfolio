/* eslint-disable */
import React, { useState, useMemo } from "react";
import { ASSET_TYPES } from '../utils/shared';

export default function PortfolioTab({byType,en,totUSD,totCost,totPnl,totPct,fxRate,fxMode,setModal,del,card,hideAmounts=false,trades=[],historicos={},isMobile=false}){
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
    const pnlARS=isUSD?origPnl*fxRate:valARS-costARSHist;
    const pctARS=isUSD?origPct:(costARSHist>0?(pnlARS/costARSHist)*100:0);

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
        <td style={{...tdL,color:"var(--text-secondary)",minWidth:180,maxWidth:320,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</td>
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
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:isMobile?11:13,minWidth:isMobile?0:700}}>
                <thead>
                  <tr>
                    <th style={{...thS,width:isMobile?65:70}}>Ticker</th>
                    {!isMobile&&<th style={{...thS,minWidth:220}}>Nombre</th>}
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

