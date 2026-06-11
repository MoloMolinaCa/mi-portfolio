/* eslint-disable */
import React, { useState, useMemo } from "react";

export default function OperacionesTab({trades,port,setTrades,setPort,card,livePrices,darkMode}){
  const [editId,setEditId]=useState(null);
  const [editData,setEditData]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [filterTicker,setFilterTicker]=useState("");
  const [filterTipo,setFilterTipo]=useState("");
  const [filterDesde,setFilterDesde]=useState("");
  const [filterHasta,setFilterHasta]=useState("");
  const [viewMode,setViewMode]=useState("ops");
  const fmtA=(n)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:2}).format(n);
  const fmtU=(n,d=2)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:d}).format(n);
  const inp={background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:6,padding:"6px 10px",color:"var(--text-primary)",fontSize:13,width:"100%"};

  const allTickers=[...new Set(trades.map(t=>t.ticker))].sort();

  const sorted=[...trades]
    .filter(t=>{
      if(filterTicker&&t.ticker!==filterTicker)return false;
      if(filterTipo&&t.tipo!==filterTipo)return false;
      if(filterDesde&&t.date<filterDesde)return false;
      if(filterHasta&&t.date>filterHasta)return false;
      return true;
    })
    .sort((a,b)=>b.date.localeCompare(a.date)||b.ts-a.ts);

  const totalCompradoUSD = trades.filter(t=>t.tipo==="compra"&&t.currency==="USD").reduce((a,t)=>a+(+t.qty*+t.price+(+t.comision||0)),0);
  const totalCompradoARS = trades.filter(t=>t.tipo==="compra"&&t.currency==="ARS").reduce((a,t)=>a+(+t.qty*+t.price+(+t.comision||0)),0);
  const totalVendidoUSD  = trades.filter(t=>t.tipo==="venta"&&t.currency==="USD").reduce((a,t)=>a+(+t.qty*+t.price),0);
  const totalComisiones  = trades.reduce((a,t)=>a+(+t.comision||0),0);

  const tickerResumen = useMemo(()=>{
    const map={};
    for(const t of trades){
      if(!map[t.ticker]) map[t.ticker]={ticker:t.ticker,name:t.name||t.ticker,compras:0,ventas:0,cantCompras:0,cantVentas:0,currency:t.currency||"ARS",comisiones:0};
      const m=map[t.ticker];
      const importe=+t.qty*+t.price;
      const com=+t.comision||0;
      if(t.tipo==="compra"){m.compras+=importe+com;m.cantCompras++;}
      else{m.ventas+=importe;m.cantVentas++;}
      m.comisiones+=com;
    }
    return Object.values(map).sort((a,b)=>b.compras-a.compras);
  },[trades]);

  const startEdit=(t)=>{setEditId(t.id);setEditData({...t});};

  const saveEdit=()=>{if(!window.confirm("Confirmar modificacion?"))return;
    if(!editData)return;
    setTrades(prev=>prev.map(t=>t.id===editId?{...editData,qty:+editData.qty,price:+editData.price,tcCompra:editData.tcCompra?+editData.tcCompra:undefined}:t));
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
      setPort(prev=>prev.filter(p=>p.ticker!==trade.ticker));
    } else {
      setPort(prev=>{
        const exists=prev.find(p=>p.ticker===trade.ticker);
        if(exists){
          return prev.map(p=>p.ticker===trade.ticker?{...p,qty:netQty,buyPrice:newPpc}:p);
        } else {
          const firstBuy=[...remaining].sort((a,b)=>a.date.localeCompare(b.date))[0];
          const inferredType = trade.ticker?.match(/\d/)
            ? (firstBuy?.currency==="USD"||trade.currency==="USD" ? "bono_usd" : "bono_ars")
            : trade.type||firstBuy?.type||"accion_ar";
          const restoredPos={
            id: Date.now(),ticker: trade.ticker,name: firstBuy?.name||trade.name||trade.ticker,
            type: inferredType,qty: netQty,buyPrice: newPpc,buyCurrency: firstBuy?.currency||trade.currency||"ARS",
            currentPrice: newPpc,rendPct: 0,buyDate: firstBuy?.date||trade.date,
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
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
        {[
          {lbl:"Comprado USD",val:fmtU(totalCompradoUSD),color:"var(--green)"},
          {lbl:"Comprado ARS",val:fmtA(totalCompradoARS),color:"var(--green)"},
          {lbl:"Vendido USD",val:fmtU(totalVendidoUSD),color:"var(--red)"},
          {lbl:"Comisiones",val:fmtU(totalComisiones),color:"var(--yellow)"},
          {lbl:"Operaciones",val:trades.length,color:"var(--text-primary)"},
        ].map(k=>(
          <div key={k.lbl} style={{...card,padding:"12px 16px"}}>
            <div style={{fontSize:9,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{k.lbl}</div>
            <div style={{fontSize:16,fontWeight:700,color:k.color,fontFamily:"'DM Mono',monospace"}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Filtros */}
      <div style={{...card,padding:"14px 16px",display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{display:"flex",gap:4,marginRight:8}}>
          {[{v:"ops",l:"Operaciones"},{v:"resumen",l:"Por ticker"}].map(tab=>(
            <button key={tab.v} onClick={()=>setViewMode(tab.v)}
              style={{padding:"5px 14px",borderRadius:6,border:"1px solid var(--border)",cursor:"pointer",fontSize:12,fontWeight:viewMode===tab.v?700:400,
                background:viewMode===tab.v?"var(--accent)":"var(--bg-input)",
                color:viewMode===tab.v?"#fff":"var(--text-secondary)"}}>
              {tab.l}
            </button>
          ))}
        </div>
        {viewMode==="ops"&&<>
          <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:130}}>
            <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Ticker</span>
            <select value={filterTicker} onChange={e=>setFilterTicker(e.target.value)} style={{...inp,width:"auto"}}>
              <option value="">Todos</option>
              {allTickers.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:110}}>
            <span style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Tipo</span>
            <select value={filterTipo} onChange={e=>setFilterTipo(e.target.value)} style={{...inp,width:"auto"}}>
              <option value="">Todos</option>
              <option value="compra">Compras</option>
              <option value="venta">Ventas</option>
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
          {(filterTicker||filterTipo||filterDesde||filterHasta)&&(
            <button onClick={()=>{setFilterTicker("");setFilterTipo("");setFilterDesde("");setFilterHasta("");}}
              style={{padding:"6px 14px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text-muted)",cursor:"pointer",fontSize:12,alignSelf:"flex-end"}}>
              ✕ Limpiar
            </button>
          )}
          <span style={{fontSize:11,color:"var(--text-muted)",marginLeft:"auto",alignSelf:"flex-end"}}>
            {sorted.length} de {trades.length} operación{trades.length!==1?"es":""}
          </span>
        </>}
      </div>

      {/* Vista por ticker */}
      {viewMode==="resumen"&&(
        <div style={{...card,overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",fontSize:13,fontWeight:600}}>Resumen por ticker</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
              <thead>
                <tr>
                  {["Ticker","Nombre","Compras","Total comprado","Ventas","Total vendido","Comisiones"].map(h=>(
                    <th key={h} style={{padding:"8px 12px",textAlign:h==="Ticker"||h==="Nombre"?"left":"right",fontSize:10,color:"var(--text-muted)",fontWeight:500,textTransform:"uppercase",letterSpacing:0.8,borderBottom:"1px solid var(--border)",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickerResumen.map(r=>(
                  <tr key={r.ticker} style={{borderTop:"1px solid var(--border)"}}>
                    <td style={{padding:"10px 12px",fontWeight:700,fontFamily:"monospace",color:"var(--accent)",fontSize:13}}>{r.ticker}</td>
                    <td style={{padding:"10px 12px",fontSize:12,color:"var(--text-secondary)",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:"var(--text-muted)"}}>{r.cantCompras}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontWeight:600,color:"var(--green)",fontFamily:"'DM Mono',monospace"}}>{r.currency==="USD"?fmtU(r.compras):fmtA(r.compras)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:"var(--text-muted)"}}>{r.cantVentas||"—"}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontWeight:600,color:r.ventas>0?"var(--red)":"var(--text-muted)",fontFamily:"'DM Mono',monospace"}}>{r.ventas>0?(r.currency==="USD"?fmtU(r.ventas):fmtA(r.ventas)):"—"}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:r.comisiones>0?"var(--yellow)":"var(--text-muted)"}}>{r.comisiones>0?(r.currency==="USD"?fmtU(r.comisiones):fmtA(r.comisiones)):"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla operaciones */}
      {viewMode==="ops"&&<div style={{...card,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:13,fontWeight:600}}>Historial de operaciones</div>
          <div style={{fontSize:11,color:"var(--text-muted)"}}>{sorted.length} resultado{sorted.length!==1?"s":""}</div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
            <thead>
              <tr>
                <th style={thS}>Fecha</th><th style={thS}>Ticker</th><th style={thS}>Nombre</th>
                <th style={thS}>Tipo</th><th style={thR}>Cantidad</th><th style={thR}>Precio</th>
                <th style={thR}>TC</th><th style={thR}>Bruto</th><th style={thR}>Comisión</th>
                <th style={thR}>Neto</th><th style={{...thS,width:80}}></th>
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
                        :<span>{t.currency==="USD"?fmtU(t.price,2):fmtA(t.price)}<span style={{display:"block",fontSize:9,color:"var(--text-muted)"}}>{t.currency||"ARS"}</span></span>}
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
                    <td style={{...tdR,fontWeight:600}}>{t.currency==="USD"?fmtU(neto,2):fmtA(neto)}</td>
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
      </div>}

      {/* Modal confirmación */}
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
