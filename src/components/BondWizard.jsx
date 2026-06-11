/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";
import { SEED_BOND_FLOWS, SEED_BOND_META } from '../constants/bondFlows';

export default function BondWizard({ticker, onConfirm, onSkip, darkMode=true}){
  const seedFlows = SEED_BOND_FLOWS[ticker]||null;
  const seedMeta  = SEED_BOND_META[ticker]||null;

  // Cache de feriados propio del wizard
  const feriadosWiz = React.useRef({});
  const fetchFeriadosWiz = async (year) => {
    if(feriadosWiz.current[year]) return feriadosWiz.current[year];
    try{
      const r = await fetch(`https://api.argentinadatos.com/v1/feriados/${year}`,{signal:AbortSignal.timeout(5000)});
      if(r.ok){
        const data = await r.json();
        const s = new Set((Array.isArray(data)?data:[]).map(f=>(f.fecha||f.date||'').slice(0,10)).filter(Boolean));
        feriadosWiz.current[year] = s; return s;
      }
    }catch{}
    feriadosWiz.current[year] = new Set();
    return new Set();
  };
  // Avanzar al siguiente día hábil (lunes-viernes, sin feriados AR)
  // Usar T12:00:00 para evitar desfase UTC en timezones negativas (Argentina UTC-3)
  const nextBusinessDay = async (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    for(let i=0;i<20;i++){
      // getDay() sobre fecha con hora local → día correcto en Argentina
      const dow = d.getDay();
      // Reconstruir string YYYY-MM-DD desde componentes locales para evitar desfase UTC
      const ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      const fer = feriadosWiz.current[d.getFullYear()] || await fetchFeriadosWiz(d.getFullYear());
      if(dow!==0 && dow!==6 && !fer.has(ds)) return ds;
      d.setDate(d.getDate()+1);
    }
    return dateStr; // fallback
  };

  // Wizard manual
  const [step, setStep] = useState(seedFlows ? 'confirm' : 'params');
  const [params, setParams] = useState({
    vto: '',
    tna: '',
    frecuencia: 'semestral',
    amortTipo: 'bullet', // bullet | cuotas
    cuotas: '',
    emisionDate: '',
    primerCupon: '', // fecha exacta del primer cupón (YYYY-MM-DD) — el schedule se proyecta desde acá
    base: '30/360',  // base de cálculo: '30/360' | 'dias/365'
    ajuste: 'ninguno', // ninguno | CER | UVA
  });
  const [generatedFlows, setGeneratedFlows] = useState(null);
  const set = (k,v) => setParams(p=>({...p,[k]:v}));

  const inp = {background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 12px",color:"var(--text-primary)",fontSize:13,width:"100%"};
  const lbl = {fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:5,fontWeight:600};
  const btn = (color) => ({background:color,border:"none",borderRadius:8,padding:"9px 20px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600});

  // ── Helpers de cálculo (mirror de FlujoTab) ──────────────────────────────
  const dias30_360wiz = (d1str, d2str) => {
    const a=new Date(d1str+'T12:00:00'), b=new Date(d2str+'T12:00:00');
    const [y1,m1,day1]=[a.getFullYear(),a.getMonth()+1,a.getDate()];
    const [y2,m2,day2]=[b.getFullYear(),b.getMonth()+1,b.getDate()];
    const D1=Math.min(day1,30);
    const D2=(day1>=30&&day2===31)?30:day2;
    return (y2-y1)*360+(m2-m1)*30+(D2-D1);
  };
  const diasRealesWiz = (d1str, d2str) =>
    Math.max(0, Math.round((new Date(d2str+'T12:00:00')-new Date(d1str+'T12:00:00'))/(1000*60*60*24)));
  const calcDiasWiz = (base, d1str, d2str) =>
    base==='30/360' ? dias30_360wiz(d1str,d2str) : diasRealesWiz(d1str,d2str);

  // Genera tabla de filas — dos fechas por fila:
  //   dateCalc: fecha teórica (para cálculo de días/intereses, puede ser inhábil)
  //   datePago: siguiente día hábil (fecha efectiva de cobro)
  const generateRows = async () => {
    const {vto, tna, frecuencia, amortTipo, cuotas, emisionDate, primerCupon} = params;
    if(!vto || !tna || !primerCupon) return null;

    const freqMonths = {mensual:1, trimestral:3, semestral:6, anual:12}[frecuencia] || 6;
    const tnaNum = parseFloat(tna)/100;
    const endDate = new Date(vto+'T12:00:00');
    const firstDate = new Date(primerCupon+'T12:00:00');
    // Día del mes del primer cupón — se repite en cada período
    const diaNum = firstDate.getDate();

    // Pre-cargar feriados de todos los años involucrados
    const startYear = firstDate.getFullYear();
    const endYear = endDate.getFullYear();
    for(let y=startYear; y<=endYear; y++) await fetchFeriadosWiz(y);

    // Helper: construir YYYY-MM-DD desde componentes locales (evita desfase UTC en AR)
    const toLocalStr = (d) => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');

    // Generar fechas teóricas (dateCalc): primer cupón + freqMonths sucesivos, mismo día
    const calcDates = [primerCupon]; // primera fecha exacta como la ingresó el usuario
    const cur = new Date(primerCupon+'T12:00:00');
    cur.setMonth(cur.getMonth() + freqMonths);
    while(cur <= endDate){
      const year=cur.getFullYear(), month=cur.getMonth();
      const lastDay = new Date(year, month+1, 0).getDate();
      // Usar hora 12 para evitar desfase, construir string local
      calcDates.push(toLocalStr(new Date(year, month, Math.min(diaNum,lastDay), 12)));
      cur.setMonth(cur.getMonth() + freqMonths);
    }
    // Asegurar que el vto esté incluido al final
    if(calcDates[calcDates.length-1] !== vto){
      if(calcDates[calcDates.length-1] > vto) calcDates[calcDates.length-1] = vto;
      else calcDates.push(vto);
    }

    // datePago: siguiente día hábil de cada dateCalc (vto no se ajusta)
    const pagoDates = await Promise.all(
      calcDates.map((d,i) => i===calcDates.length-1 ? Promise.resolve(d) : nextBusinessDay(d))
    );

    const divisor = params.base === 'dias/365' ? 365 : 360;
    const amortPorCuota = amortTipo==='bullet' ? 0 : (cuotas ? parseFloat((100/parseInt(cuotas)).toFixed(6)) : 0);
    let vnResidual = 100;
    // Cálculo de días usa fechas TEÓRICAS (dateCalc), empezando desde la emisión
    let prevCalcDate = emisionDate || primerCupon;

    const rows = calcDates.map((dateCalc, i) => {
      const dias = calcDiasWiz(params.base, prevCalcDate, dateCalc);
      const cupon = parseFloat((tnaNum * dias/divisor * vnResidual).toFixed(6));
      const esUltimo = i === calcDates.length-1;
      const amort = amortTipo==='bullet' ? (esUltimo ? 100 : 0) : amortPorCuota;
      const row = {dateCalc, datePago:pagoDates[i], dias, cupon, amort, vnResidual};
      vnResidual = parseFloat(Math.max(0, vnResidual - amort).toFixed(6));
      prevCalcDate = dateCalc;
      return row;
    });
    return rows;
  };

  // Convierte las rows editables en flows para guardar
  // date = datePago (hábil), dateCalc guardado en nota para referencia
  const rowsToFlows = (rows) => {
    let id = Date.now();
    const flows = [];
    rows.forEach(row => {
      const pago = row.datePago || row.date || row.dateCalc;
      const calc = row.dateCalc || pago;
      const diffDias = (pago !== calc) ? ` · pago ${pago}` : '';
      if(row.cupon > 0){
        const divisorNota = params.base==='dias/365'?365:360;
        flows.push({id:id++, date:pago, dateCalc:calc, tipo:'cupon', monto:row.cupon, cobrado:false, fechaCobro:null, fuente:'wizard', nota:`${row.dias}d · ${params.tna}%×${row.dias}/${divisorNota}${diffDias}`});
      }
      if(row.amort > 0){
        flows.push({id:id++, date:pago, dateCalc:calc, tipo:'amortizacion', monto:row.amort, cobrado:false, fechaCobro:null, fuente:'wizard', nota:`Amort. ${row.amort.toFixed(4)}%${diffDias}`});
      }
    });
    return flows;
  };

  const [editRows, setEditRows] = useState(null); // filas editables por fecha
  const [generating, setGenerating] = useState(false);
  const handleGenerate = async () => {
    setGenerating(true);
    try{
      const rows = await generateRows();
      if(rows){ setEditRows(rows); }
      setStep('review');
    }finally{ setGenerating(false); }
  };

  // Recalcula los cupones usando las fechas actuales de editRows + params de tasa
  const [recalculating, setRecalculating] = useState(false);
  const recalcularTasas = async () => {
    if(!editRows||!params.tna) return;
    setRecalculating(true);
    try{
      const tnaNum = parseFloat(params.tna)/100;
      const divisorR = params.base==='dias/365' ? 365 : 360;
      // Ordenar por fecha teórica
      const sorted = [...editRows].sort((a,b)=>(a.dateCalc||a.date).localeCompare(b.dateCalc||b.date));
      let prevDate = params.emisionDate || (sorted[0].dateCalc||sorted[0].date);
      let vnResidual = 100;
      const newRows = sorted.map((row) => {
        const calcDate = row.dateCalc || row.date;
        const dias = calcDiasWiz(params.base, prevDate, calcDate);
        const cupon = parseFloat((tnaNum * dias/divisorR * vnResidual).toFixed(6));
        const newRow = {...row, dias, cupon};
        vnResidual = parseFloat(Math.max(0, vnResidual - (parseFloat(row.amort)||0)).toFixed(6));
        prevDate = calcDate;
        return newRow;
      });
      setEditRows(newRows);
    }finally{ setRecalculating(false); }
  };

  const handleConfirm = (flows) => {
    // Pasar tna/base/emisionDate para que el caller actualice bondMeta
    const meta = params.tna ? {tna:parseFloat(params.tna), base:params.base||'30/360', emisionDate:params.emisionDate||null} : null;
    onConfirm(flows, meta);
  };

  return(
    <div className={darkMode?"theme-dark":"theme-light"} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:28,width:560,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <h3 style={{fontFamily:"Georgia,serif",fontSize:16,color:"var(--text-primary)",margin:0}}>
              📋 Flujos de {ticker}
            </h3>
            <p style={{fontSize:11,color:"var(--text-muted)",margin:"4px 0 0"}}>
              {step==='confirm' ? 'Encontré el schedule en el sistema. Confirmá antes de cargar.' :
               step==='params'  ? 'No encontré el schedule. Ingresá los parámetros para generarlo.' :
               'Revisá los flujos generados antes de confirmar.'}
            </p>
          </div>
          <button onClick={onSkip} style={{background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
        </div>

        {/* PASO: CONFIRM — flujos del seed */}
        {step==='confirm' && seedFlows && (
          <>
            {seedMeta?.desc && (
              <div style={{background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.15)",borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:12,color:"var(--text-secondary)"}}>
                📌 {seedMeta.desc}
              </div>
            )}
            {(()=>{
              const hasDualDates = seedFlows.some(f=>f.dateCalc && f.dateCalc!==f.date);
              const fmtD = d => d ? d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4) : '—';
              return (
              <div style={{maxHeight:280,overflowY:"auto",marginBottom:16}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid var(--border)"}}>
                      {hasDualDates
                        ? [
                            <th key="fc" style={{padding:"6px 8px",textAlign:"left",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase"}}>F. Cálculo</th>,
                            <th key="fp" style={{padding:"6px 8px",textAlign:"left",fontSize:10,color:"#60A5FA",fontWeight:600,textTransform:"uppercase"}}>F. Pago</th>,
                          ]
                        : <th style={{padding:"6px 10px",textAlign:"left",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase"}}>Fecha</th>
                      }
                      <th style={{padding:"6px 10px",textAlign:"left",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase"}}>Tipo</th>
                      <th style={{padding:"6px 10px",textAlign:"right",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase"}}>Monto %VN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seedFlows.map((f,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid var(--border)"}}>
                        {hasDualDates ? <>
                          <td style={{padding:"6px 8px",fontFamily:"'DM Mono',monospace",fontSize:11,color:"var(--text-secondary)"}}>{fmtD(f.dateCalc||f.date)}</td>
                          <td style={{padding:"6px 8px",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#60A5FA"}}>{fmtD(f.date)}</td>
                        </> :
                          <td style={{padding:"6px 10px",fontFamily:"'DM Mono',monospace"}}>{fmtD(f.date)}</td>
                        }
                        <td style={{padding:"6px 10px"}}>
                          <span style={{color:f.tipo==='amortizacion'?"var(--yellow)":"var(--accent)",fontWeight:600}}>
                            {f.tipo==='amortizacion'?'💰 Amort.':'🎫 Cupón'}
                          </span>
                        </td>
                        <td style={{padding:"6px 10px",fontFamily:"'DM Mono',monospace",textAlign:"right"}}>{f.monto.toFixed(4)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              );
            })()}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={onSkip} style={{...btn("var(--bg-input)"),color:"var(--text-muted)",border:"1px solid var(--border)"}}>Cargar manualmente</button>
              <button onClick={()=>handleConfirm([...seedFlows])} style={btn("var(--accent)")}>✓ Confirmar y cargar</button>
            </div>
          </>
        )}

        {/* PASO: PARAMS — wizard manual */}
        {step==='params' && (
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <span style={lbl}>Fecha de emisión</span>
                <input type="date" value={params.emisionDate} onChange={e=>set('emisionDate',e.target.value)} style={inp}/>
              </div>
              <div>
                <span style={lbl}>Fecha de vencimiento</span>
                <input type="date" value={params.vto} onChange={e=>set('vto',e.target.value)} style={inp}/>
              </div>
              <div>
                <span style={lbl}>Tasa anual (% TNA)</span>
                <input type="number" step="0.01" placeholder="ej: 7" value={params.tna} onChange={e=>set('tna',e.target.value)} style={inp}/>
              </div>
              <div>
                <span style={lbl}>Frecuencia de cupón</span>
                <select value={params.frecuencia} onChange={e=>set('frecuencia',e.target.value)} style={inp}>
                  <option value="mensual">Mensual</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div>
                <span style={lbl}>Fecha del 1er cupón</span>
                <input type="date" value={params.primerCupon}
                  onChange={e=>set('primerCupon',e.target.value)}
                  style={inp}/>
                <span style={{fontSize:10,color:"var(--text-muted)",marginTop:3,display:"block"}}>
                  Fecha teórica — el resto se proyecta desde acá · días hábiles ajustados automático
                </span>
              </div>
              <div>
                <span style={lbl}>Base de cálculo</span>
                <select value={params.base} onChange={e=>set('base',e.target.value)} style={inp}>
                  <option value="30/360">30/360</option>
                  <option value="dias/365">Días / 365</option>
                </select>
              </div>
              <div>
                <span style={lbl}>Amortización</span>
                <select value={params.amortTipo} onChange={e=>set('amortTipo',e.target.value)} style={inp}>
                  <option value="bullet">Bullet (todo al vto)</option>
                  <option value="cuotas">En cuotas iguales</option>
                </select>
              </div>
              {params.amortTipo==='cuotas' && (
                <div>
                  <span style={lbl}>Cantidad de cuotas de amort.</span>
                  <input type="number" min="1" placeholder="ej: 10" value={params.cuotas} onChange={e=>set('cuotas',e.target.value)} style={inp}/>
                </div>
              )}
              <div>
                <span style={lbl}>Ajuste de capital</span>
                <select value={params.ajuste} onChange={e=>set('ajuste',e.target.value)} style={inp}>
                  <option value="ninguno">Ninguno (tasa fija)</option>
                  <option value="CER">CER</option>
                  <option value="UVA">UVA</option>
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={onSkip} style={{...btn("var(--bg-input)"),color:"var(--text-muted)",border:"1px solid var(--border)"}}>Saltar por ahora</button>
              <button onClick={handleGenerate} disabled={!params.vto||!params.tna||!params.primerCupon||generating}
                style={{...btn(!params.vto||!params.tna||!params.primerCupon?"rgba(59,130,246,0.3)":"var(--accent)"),cursor:!params.vto||!params.tna||!params.primerCupon||generating?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
                {generating ? <><span style={{animation:"spin 0.7s linear infinite",display:"inline-block"}}>⟳</span> Cargando feriados...</> : "Generar flujos →"}
              </button>
            </div>
          </>
        )}

        {/* PASO: REVIEW — una fila por fecha, columnas Fecha/Amort/Cupón editables */}
        {step==='review' && editRows && (()=>{
          const totalAmort = editRows.reduce((a,r)=>a+(parseFloat(r.amort)||0),0);
          const amortOk = Math.abs(totalAmort-100) < 0.01;
          const inpS = {background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:5,padding:"3px 7px",color:"var(--text-primary)",fontSize:12,width:"100%",boxSizing:"border-box"};
          const updateRow = (i, key, val) => {
            const newRows = [...editRows];
            newRows[i] = {...newRows[i], [key]: val};
            setEditRows(newRows);
          };
          return(
          <>
            {!amortOk&&(
              <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:7,padding:"7px 12px",marginBottom:10,fontSize:12,color:"var(--red)"}}>
                ⚠ Amortización total: <b>{totalAmort.toFixed(4)}%</b> — debe ser exactamente 100%
              </div>
            )}
            {amortOk&&(
              <div style={{background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:7,padding:"7px 12px",marginBottom:10,fontSize:12,color:"var(--green)"}}>
                ✓ Amortización total: 100%
              </div>
            )}
            {params.tna&&(
              <div style={{marginBottom:10,display:"flex",justifyContent:"flex-end"}}>
                <button onClick={recalcularTasas} disabled={recalculating}
                  title={"Recalcula los cupones usando TNA "+params.tna+"% y las fechas actuales"}
                  style={{background:"rgba(59,130,246,0.12)",border:"1px solid rgba(59,130,246,0.3)",borderRadius:7,padding:"6px 14px",color:"#60A5FA",cursor:recalculating?"wait":"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                  {recalculating?<><span style={{animation:"spin 0.7s linear infinite",display:"inline-block"}}>⟳</span>Calculando...</>:<>🔄 Recalcular tasas <span style={{fontWeight:400,opacity:0.7}}>({params.tna}% TNA)</span></>}
                </button>
              </div>
            )}
            <div style={{maxHeight:320,overflowY:"auto",marginBottom:16}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{borderBottom:"1px solid var(--border)",position:"sticky",top:0,background:"var(--bg-card)"}}>
                    <th style={{padding:"6px 8px",textAlign:"left",fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",minWidth:110}}>F. Cálculo</th>
                    <th style={{padding:"6px 8px",textAlign:"left",fontSize:10,color:"#60A5FA",fontWeight:600,textTransform:"uppercase",minWidth:110}}>F. Pago</th>
                    <th style={{padding:"6px 8px",textAlign:"right",fontSize:10,color:"var(--yellow)",fontWeight:600,textTransform:"uppercase",minWidth:80}}>Amort. %</th>
                    <th style={{padding:"6px 8px",textAlign:"right",fontSize:10,color:"var(--accent)",fontWeight:600,textTransform:"uppercase",minWidth:80}}>Cupón %</th>
                    <th style={{padding:"6px 8px",width:28}}></th>
                  </tr>
                </thead>
                <tbody>
                  {editRows.map((row,i)=>{
                    const calcDate = row.dateCalc || row.date || '';
                    const pagoDate = row.datePago || row.date || '';
                    const diffDias = calcDate && pagoDate && calcDate!==pagoDate ?
                      Math.round((new Date(pagoDate+'T12:00:00')-new Date(calcDate+'T12:00:00'))/(1000*60*60*24)) : 0;
                    return (
                    <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.04)",background:row.amort>0?"rgba(251,191,36,0.03)":"transparent"}}>
                      {/* Fecha teórica de cálculo */}
                      <td style={{padding:"4px 6px"}}>
                        <input type="date" value={calcDate}
                          onChange={e=>updateRow(i,'dateCalc',e.target.value)}
                          style={inpS}/>
                      </td>
                      {/* Fecha efectiva de pago */}
                      <td style={{padding:"4px 6px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:3}}>
                          <input type="date" value={pagoDate}
                            onChange={e=>updateRow(i,'datePago',e.target.value)}
                            style={{...inpS,color:"#60A5FA"}}/>
                          {diffDias>0&&<span style={{fontSize:9,color:"var(--text-muted)",whiteSpace:"nowrap"}}>+{diffDias}d</span>}
                        </div>
                      </td>
                      <td style={{padding:"4px 6px"}}>
                        <input type="number" step="0.0001" min="0" max="100"
                          value={row.amort}
                          onChange={e=>updateRow(i,'amort',parseFloat(e.target.value)||0)}
                          style={{...inpS,color:"var(--yellow)",fontWeight:600,textAlign:"right"}}/>
                      </td>
                      <td style={{padding:"4px 6px"}}>
                        <input type="number" step="0.0001" min="0"
                          value={row.cupon}
                          onChange={e=>updateRow(i,'cupon',parseFloat(e.target.value)||0)}
                          style={{...inpS,color:"var(--accent)",textAlign:"right"}}/>
                      </td>
                      <td style={{padding:"4px 2px",textAlign:"center"}}>
                        <button onClick={()=>setEditRows(editRows.filter((_,j)=>j!==i))}
                          style={{background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:13,padding:"2px 3px"}}>🗑</button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"center"}}>
              <button onClick={()=>setStep('params')} style={{...btn("var(--bg-input)"),color:"var(--text-muted)",border:"1px solid var(--border)",fontSize:12}}>← Parámetros</button>
              <div style={{display:"flex",gap:8}}>
                <button onClick={onSkip} style={{...btn("var(--bg-input)"),color:"var(--text-muted)",border:"1px solid var(--border)",fontSize:12}}>Saltar</button>
                <button onClick={()=>handleConfirm(rowsToFlows(editRows))} disabled={!amortOk}
                  style={{...btn(!amortOk?"rgba(59,130,246,0.3)":"var(--accent)"),cursor:!amortOk?"not-allowed":"pointer",fontSize:13}}>
                  ✓ Confirmar y cargar
                </button>
              </div>
            </div>
          </>
          );
        })()}

      </div>
    </div>
  );
}
