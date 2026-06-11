/* eslint-disable */
import React, { useState } from "react";
import { ASSET_TYPES, todayAR } from '../utils/shared';

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
        {value&&<span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:13}}>â
</span>}
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


export default function Modal({h,port=[],onSave,onClose,darkMode=true}){
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

    // 2. Yahoo Finance via proxy
    try{
      for(const ySym of [q, q+".BA"]){
        try{
          const yRes=await fetch(YAHOO_PROXY+"?symbol="+encodeURIComponent(ySym)+"&range=5d&interval=1d",{signal:AbortSignal.timeout(6000)});
          if(!yRes.ok) continue;
          const yD=await yRes.json();
          const yMeta=yD?.chart?.result?.[0]?.meta;
          if(!yMeta) continue;
          const sym=(yMeta.symbol||ySym).replace(".BA","").toUpperCase();
          if(!sym.includes(q))continue;
          const price=yMeta.regularMarketPrice||0;
          if(price<=0)continue;
          const af=results.find(r=>r.ticker===sym&&r.source.startsWith("data912"));
          if(af){if(af.name===sym||af.name==="")af.name=yMeta.shortName||yMeta.longName||af.name;continue;}
          const cur=(yMeta.currency||"ARS").toUpperCase()==="USD"?"USD":"ARS";
          const qt=yMeta.instrumentType||"";
          let type="accion_ar";
          if(qt==="ETF"||qt==="MUTUALFUND")type="cedear";
          else if(cur==="USD")type="accion_ar";
          results.push({ticker:sym,name:yMeta.shortName||yMeta.longName||sym,type,buyCurrency:cur,price,source:"Yahoo Finance"});
        }catch{}
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
                  {tickerStatus==="confirmed"&&"â"}
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

