/* eslint-disable */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { SEED_BOND_FLOWS, SEED_BOND_META } from '../constants/bondFlows';
import { todayAR } from '../utils/shared';
import BondWizard from './BondWizard';

// ── FlujoTab ─────────────────────────────────────────────────────────────────
async function fetchBondFlows(ticker) {
  try {
    const url = `https://api.argenfunds.com/api/v1/bonds/${ticker.toLowerCase()}/cashflows`;
    const r = await fetch(url, {signal: AbortSignal.timeout(6000)});
    if(!r.ok) return null;
    const d = await r.json();
    if(!d||!d.length) return null;
    return d.map((f,i) => ({
      id: Date.now()+i,
      date: f.date||f.fecha||f.paymentDate,
      tipo: (f.type||f.tipo||'').toLowerCase().includes('amort') ? 'amortizacion' : 'cupon',
      monto: parseFloat(f.amount||f.monto||f.value||0),
      cobrado: false,
      fechaCobro: null,
      fuente: 'auto'
    })).filter(f=>f.date&&f.monto>0);
  } catch { return null; }
}

export default function FlujoTab({port, trades, bondFlows, setBondFlows, card, fxRate, historicos, isMobile=false}) {
  const [selected, setSelected]       = useState(null);
  const [loadingTicker, setLoadingTicker] = useState(null);
  const [addingFlow, setAddingFlow]   = useState(null);
  const [newFlow, setNewFlow]         = useState({date:'',tipo:'cupon',amort:'',nota:'',cuponMonto:''});
  const [editingRowIds, setEditingRowIds] = useState(null); // ids de flows que se están editando
  const [viewMode, setViewMode]       = useState('micobro');
  const [cerCoef, setCerCoef]         = useState({});
  const [editingCell, setEditingCell] = useState(null); // {id, field, value} — id del flow
  const [editingMeta, setEditingMeta] = useState(false);
  // bondMeta: {ticker:{tna, base}} — tna=% anual, base='30/360'|'dias/365'
  const BOND_META_DEFAULT = {
    'AO27D': {tna:6,  base:'30/360', emisionDate:null},
    'GD38D': {tna:5,  base:'30/360', emisionDate:null},
    'TLCUD': {tna:7,  base:'30/360', emisionDate:null},
    'TZX27': {tna:2,  base:'30/360', emisionDate:'2022-12-30'},
    'TZXD6': {tna:0,  base:'30/360', emisionDate:'2022-03-15'},
  };
  const [bondMeta, setBondMetaState] = useState(()=>{
    try{
      const saved = localStorage.getItem('gal_bond_meta_v1');
      if(saved){
        const parsed = JSON.parse(saved);
        // Merge con defaults para tickers nuevos
        return {...BOND_META_DEFAULT, ...parsed};
      }
    }catch{}
    return BOND_META_DEFAULT;
  });
  const setBondMeta = (updater) => {
    setBondMetaState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try{ localStorage.setItem('gal_bond_meta_v1', JSON.stringify(next)); }catch{}
      return next;
    });
  };
  const [metaDraft, setMetaDraft] = useState({tna:'', base:'30/360', emisionDate:''});
  const [wizardFlujosOpen, setWizardFlujosOpen] = useState(false); // BondWizard inline en FlujoTab
  // CER: serie histórica {date:string, valor:number}[], cacheada en memoria
  // CER: se lee desde historicos.json — cargado por update_historicos.py
  // No hace fetch desde el browser (evita CORS)
  const cerSerie = useMemo(()=>{
    if(!historicos?.cer?.length) return null;
    // historicos.cer: [{date, close}] — close es el valor CER
    return historicos.cer.map(x=>({date:x.date, valor:x.close}));
  },[historicos]);
  const cerLoading = false; // siempre listo (viene del JSON)
  const fetchCER = ()=>{}; // no-op, ya no se necesita
  // Feriados argentinos: {año: Set<'YYYY-MM-DD'>}
  const [feriados, setFeriados] = useState({});
  const feriadosRef = React.useRef({});

  // Buscar el último CER conocido <= dateStr (si no hay, devuelve el más antiguo disponible)
  const getCER = (serie, dateStr) => {
    if(!serie||!serie.length) return null;
    const filtered = serie.filter(x=>x.date<=dateStr);
    if(filtered.length) return filtered[filtered.length-1].valor;
    // Si no hay dato anterior, devolver el más antiguo conocido
    return serie[0].valor;
  };

  // Fetch feriados de un año desde argentinadatos
  const fetchFeriados = async (year) => {
    if(feriadosRef.current[year]) return feriadosRef.current[year];
    try {
      const r = await fetch(`https://api.argentinadatos.com/v1/feriados/${year}`, {signal:AbortSignal.timeout(5000)});
      if(r.ok){
        const data = await r.json();
        const set = new Set((Array.isArray(data)?data:[]).map(f=>(f.fecha||f.date||'').slice(0,10)).filter(Boolean));
        feriadosRef.current[year] = set;
        setFeriados(prev=>({...prev,[year]:set}));
        return set;
      }
    } catch{}
    feriadosRef.current[year] = new Set();
    return new Set();
  };

  // Restar N días hábiles a una fecha (lunes-viernes, excluyendo feriados AR)
  const restarDiasHabiles = async (dateStr, n) => {
    const d = new Date(dateStr);
    let restantes = n;
    while(restantes > 0){
      d.setDate(d.getDate()-1);
      const dow = d.getDay(); // 0=dom, 6=sab
      if(dow===0||dow===6) continue;
      const year = d.getFullYear();
      const feriadosAnio = feriadosRef.current[year] || await fetchFeriados(year);
      const ds = d.toISOString().slice(0,10);
      if(feriadosAnio.has(ds)) continue;
      restantes--;
    }
    return d.toISOString().slice(0,10);
  };

  // Versión sincrónica con feriados ya cargados en cache
  const restarDiasHabilesSync = (dateStr, n) => {
    const d = new Date(dateStr);
    let restantes = n;
    let maxIter = 100; // evitar loop infinito
    while(restantes > 0 && maxIter-- > 0){
      d.setDate(d.getDate()-1);
      const dow = d.getDay();
      if(dow===0||dow===6) continue;
      const year = d.getFullYear();
      const feriadosAnio = feriadosRef.current[year] || new Set();
      const ds = d.toISOString().slice(0,10);
      if(feriadosAnio.has(ds)) continue;
      restantes--;
    }
    return d.toISOString().slice(0,10);
  };

  // CER de 10 días hábiles antes de una fecha
  // Si fecha-10hd es futura → usar CER de (hoy - 10 días hábiles)
  const getCERMinus10 = (serie, dateStr) => {
    if(!serie||!serie.length||!dateStr) return null;
    const todayStr = todayAR();
    const fechaRef = restarDiasHabilesSync(dateStr, 10);
    // Si la fecha de referencia aún no llegó, usar hoy - 10 días hábiles
    const fechaConsulta = fechaRef > todayStr
      ? restarDiasHabilesSync(todayStr, 10)
      : fechaRef;
    return getCER(serie, fechaConsulta);
  };

  // Pre-cargar feriados de los años relevantes al montar
  useEffect(()=>{
    const currentYear = new Date().getFullYear();
    [currentYear-1, currentYear, currentYear+1].forEach(y => fetchFeriados(y));
  },[]);

  // Calcular flujos CER ajustados para un bono
  // Para cada cupón: interés = tasa × (CER_pago/CER_base) × VN_original × días/base
  // Para amort: monto = (CER_pago/CER_base) × amort_original
  // cerBase = CER del día 10 días antes de emisionDate
  const calcFlujoCER = (flow, vnOriginal, cerBase, cerPago, tna, base, dias) => {
    if(!cerBase||!cerPago||cerBase<=0) return flow.monto; // fallback sin CER
    const coefCER = cerPago / cerBase;
    if(flow.tipo==='amortizacion'){
      return parseFloat((vnOriginal * coefCER * (flow.monto/100)).toFixed(6));
    } else {
      // Interés = tna × dias/base × VN ajustado
      const divisor = base==='30/360' ? 360 : 365;
      return parseFloat(((tna/100) * (dias/divisor) * vnOriginal * coefCER).toFixed(6));
    }
  };

  const fmtD = s => s ? s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(0,4) : '';
  const fmtN = n => Number(n).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:4});
  const fmtN2 = n => Number(n).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const today = todayAR();

  const bonds = port.filter(h => h.type==='bono_ars'||h.type==='bono_usd');

  // ── Helpers de cálculo ──────────────────────────────────────────────────
  // Días 30/360: convención ICMA/Bond
  const dias30_360 = (d1, d2) => {
    const a=new Date(d1), b=new Date(d2);
    const [y1,m1,day1] = [a.getFullYear(), a.getMonth()+1, a.getDate()];
    const [y2,m2,day2] = [b.getFullYear(), b.getMonth()+1, b.getDate()];
    const D1 = Math.min(day1, 30);
    const D2 = (day1>=30 && day2===31) ? 30 : day2;
    return (y2-y1)*360 + (m2-m1)*30 + (D2-D1);
  };

  const diasReales = (d1, d2) =>
    Math.round((new Date(d2) - new Date(d1)) / (1000*60*60*24));

  const calcInteres = (tna, base, diasCalc, vnResidual) => {
    if(!tna || !vnResidual) return 0;
    const divisor = base==='30/360' ? 360 : 365;
    return parseFloat(((tna/100) * (diasCalc/divisor) * vnResidual).toFixed(6));
  };

  // Recalcular intereses de cupones futuros no cobrados
  const recalcularFuturos = (ticker, flows, tna, base) => {
    const sorted = [...flows].sort((a,b)=>a.date.localeCompare(b.date));
    // Construir VN residual acumulado
    let vn = 100;
    const vnMap = {}; // date → vn antes de ese pago
    sorted.forEach(f => {
      if(!vnMap[f.date]) vnMap[f.date] = vn;
      if(f.tipo==='amortizacion') vn = Math.max(0, vn - f.monto);
    });
    // Fechas ordenadas únicas para calcular días
    const dates = [...new Set(sorted.map(f=>f.date))].sort();

    return flows.map(f => {
      if(f.tipo!=='cupon') return f;      // amorts no se tocan
      if(f.cobrado) return f;             // cobrados no se tocan
      if(f.date <= today) return f;       // vencidos no se tocan
      const idx = dates.indexOf(f.date);
      const prevDate = idx > 0 ? dates[idx-1] : f.date;
      const diasCalc = base==='30/360'
        ? dias30_360(prevDate, f.date)
        : diasReales(prevDate, f.date);
      const vnAntes = vnMap[f.date] ?? 100;
      const nuevoInteres = calcInteres(tna, base, diasCalc, vnAntes);
      return {...f, monto: nuevoInteres};
    });
  };

  // CER se carga desde historicos.json — no necesita fetch propio

  // ── Handlers ─────────────────────────────────────────────────────────────
  const fetchFlows = async (ticker) => {
    setLoadingTicker(ticker);
    const flows = await fetchBondFlows(ticker);
    setLoadingTicker(null);
    if(flows&&flows.length) {
      setBondFlows(prev => ({...prev, [ticker]: flows}));
    } else {
      setBondFlows(prev => ({...prev, [ticker]: prev[ticker]||[]}));
    }
    setSelected(ticker);
    setAddingFlow(flows&&flows.length ? null : ticker);
  };

  const confirmCobro = (ticker, ids) => {
    setBondFlows(prev => ({
      ...prev,
      [ticker]: (prev[ticker]||[]).map(f =>
        ids.includes(f.id) ? {...f, cobrado:true, fechaCobro:today} : f
      )
    }));
  };

  const deleteFlow = (ticker, id) => {
    setBondFlows(prev => ({...prev, [ticker]: (prev[ticker]||[]).filter(f=>f.id!==id)}));
  };

  const deleteRow = (ticker, ids) => {
    setBondFlows(prev => ({...prev, [ticker]: (prev[ticker]||[]).filter(f=>!ids.includes(f.id))}));
  };

  const saveCellEdit = (ticker, id, field, value) => {
    setBondFlows(prev => ({
      ...prev,
      [ticker]: (prev[ticker]||[]).map(f =>
        f.id===id ? {...f, monto: parseFloat(value)||f.monto} : f
      )
    }));
    setEditingCell(null);
  };

  const applyMeta = () => {
    const tna = parseFloat(metaDraft.tna);
    const base = metaDraft.base;
    const emisionDate = metaDraft.emisionDate||null;
    if(!isNaN(tna) && tna >= 0) {
      setBondMeta(prev => ({...prev, [selected]: {tna, base, emisionDate}}));
      // Recalcular flujos futuros
      setBondFlows(prev => {
        const flows = prev[selected]||[];
        return {...prev, [selected]: recalcularFuturos(selected, flows, tna, base)};
      });
    }
    setEditingMeta(false);
  };

  const addNewFlow = () => {
    if(!newFlow.date) return;
    const meta = bondMeta[addingFlow] || {tna:0, base:'30/360'};
    const flows = (bondFlows[addingFlow]||[]).sort((a,b)=>a.date.localeCompare(b.date));
    // VN residual hasta esta fecha
    let vn = 100;
    flows.forEach(f => { if(f.date<newFlow.date && f.tipo==='amortizacion') vn=Math.max(0,vn-f.monto); });
    // Fecha anterior para calcular días
    const prevDates = [...new Set(flows.map(f=>f.date))].filter(d=>d<newFlow.date).sort();
    const prevDate = prevDates.length ? prevDates[prevDates.length-1] : newFlow.date;
    const diasCalc = meta.base==='30/360'
      ? dias30_360(prevDate, newFlow.date)
      : diasReales(prevDate, newFlow.date);

    const amortVal = parseFloat(newFlow.amort)||0;
    const interesVal = newFlow.tipo==='cupon' ? calcInteres(meta.tna, meta.base, diasCalc, vn) : 0;

    const flowsToAdd = [];
    if(newFlow.tipo==='cupon' || newFlow.tipo==='ambos') {
      flowsToAdd.push({id:Date.now(), date:newFlow.date, tipo:'cupon', monto:interesVal, cobrado:false, fechaCobro:null, fuente:'manual', nota:newFlow.nota||''});
    }
    if(newFlow.tipo==='amortizacion' || newFlow.tipo==='ambos') {
      flowsToAdd.push({id:Date.now()+1, date:newFlow.date, tipo:'amortizacion', monto:amortVal, cobrado:false, fechaCobro:null, fuente:'manual', nota:newFlow.nota||''});
    }
    setBondFlows(prev => ({...prev, [addingFlow]: [...(prev[addingFlow]||[]), ...flowsToAdd].sort((a,b)=>a.date.localeCompare(b.date))}));
    setNewFlow({date:'',tipo:'cupon',amort:'',nota:''});
  };

  // Guarda edición de una fila existente (reemplaza los flows con los mismos IDs)
  const saveEditFlow = () => {
    if(!newFlow.date || !editingRowIds) return;
    const amortVal  = parseFloat(newFlow.amort)||0;
    const cuponVal  = parseFloat(newFlow.cuponMonto)||0;
    const dateCalcVal = newFlow.dateCalc || newFlow.date;
    setBondFlows(prev => {
      const flows = (prev[addingFlow]||[]).map(f => {
        if(!editingRowIds.includes(f.id)) return f;
        if(f.tipo==='amortizacion') return {...f, date:newFlow.date, dateCalc:dateCalcVal, monto:amortVal, nota:newFlow.nota||f.nota};
        if(f.tipo==='cupon')        return {...f, date:newFlow.date, dateCalc:dateCalcVal, monto:cuponVal, nota:newFlow.nota||f.nota};
        return f;
      });
      return {...prev, [addingFlow]: flows.sort((a,b)=>a.date.localeCompare(b.date))};
    });
    setEditingRowIds(null);
    setAddingFlow(null);
    setNewFlow({date:'',tipo:'cupon',amort:'',nota:'',cuponMonto:''});
  };

  // ── Próximos pagos — todos los pagos futuros de todos los bonos, ordenados cronológicamente
  const proximosPagos = bonds.flatMap(b => {
    const flows = (bondFlows[b.ticker]||[]);
    const byDate = {};
    flows.forEach(f => {
      if(!byDate[f.date]) byDate[f.date]={date:f.date,monto:0,montoCupon:0,montoAmort:0,cobrado:true,hasAmort:false,hasCupon:false};
      byDate[f.date].monto += f.monto;
      if(!f.cobrado) byDate[f.date].cobrado = false;
      if(f.tipo==='amortizacion'){byDate[f.date].hasAmort=true;byDate[f.date].montoAmort+=f.monto;}
      else{byDate[f.date].hasCupon=true;byDate[f.date].montoCupon+=f.monto;}
    });
    const meta = bondMeta[b.ticker]||{};
    const isCER = (SEED_BOND_META[b.ticker]?.adjustsBy==='CER') && cerSerie;
    const cerBase = isCER && meta.emisionDate ? getCERMinus10(cerSerie, meta.emisionDate) : null;

    return Object.values(byDate)
      .filter(r=>!r.cobrado&&r.date>=today)
      .map(r=>{
        let total, totalCupon, totalAmort;
        if(isCER && cerBase){
          const cerPago = getCERMinus10(cerSerie, r.date);
          const coef = cerPago && cerBase ? cerPago/cerBase : 1;
          totalAmort = r.montoAmort * coef * b.qty / 100;
          // Para interés CER usamos una aproximación: monto% × coef × qty/100
          totalCupon = r.montoCupon * coef * b.qty / 100;
          total = totalAmort + totalCupon;
        } else {
          total      = r.monto*(b.qty/100);
          totalCupon = r.montoCupon*(b.qty/100);
          totalAmort = r.montoAmort*(b.qty/100);
        }
        return {
          ticker:b.ticker, name:b.name, currency:b.buyCurrency,
          date:r.date, monto:r.monto,
          montoCupon:r.montoCupon, montoAmort:r.montoAmort,
          hasAmort:r.hasAmort, hasCupon:r.hasCupon,
          total, totalCupon, totalAmort,
        };
      });
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.ticker.localeCompare(b.ticker));
  const [calMonth, setCalMonth] = useState(new Date());
  const [calSelectedDate, setCalSelectedDate] = useState(null);

  const selBond  = bonds.find(b=>b.ticker===selected);
  const selFlows = selected ? (bondFlows[selected]||[]).sort((a,b)=>a.date.localeCompare(b.date)) : [];
  const selMeta  = bondMeta[selected] || {tna:0, base:'30/360'};
  const seedMeta = SEED_BOND_META[selected] || {};
  const adjustsBy = seedMeta.adjustsBy || null;
  const coef = parseFloat(cerCoef[selected])||1;
  const currency = selBond?.buyCurrency==='USD' ? 'US$' : '$';

  const inp = {background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:6,padding:'5px 9px',color:'var(--text-primary)',fontSize:12,width:'100%'};

  // ── Agrupar flows por fecha ───────────────────────────────────────────────
  const buildRows = (flows) => {
    const byDate = {};
    flows.forEach(f => {
      if(!byDate[f.date]) byDate[f.date]={date:f.date,dateCalc:f.dateCalc||f.date,cupon:null,amort:null,ids:[]};
      if(f.tipo==='amortizacion') byDate[f.date].amort=f;
      else byDate[f.date].cupon=f;
      byDate[f.date].ids.push(f.id);
      // Tomar dateCalc del flow si existe
      if(f.dateCalc && f.dateCalc!==f.date) byDate[f.date].dateCalc=f.dateCalc;
    });
    const rows = Object.values(byDate).sort((a,b)=>a.date.localeCompare(b.date));
    let vn = 100;
    return rows.map((row,i) => {
      const amortPct    = row.amort?.monto ?? 0;
      const interestPct = row.cupon?.monto ?? 0;
      const vnAntes     = vn;
      vn = Math.max(0, vn - amortPct);
      // Días: usar dateCalc (teórica) para el cálculo, no la fecha de pago
      const prevRow = i>0 ? rows[i-1] : null;
      const prevCalc = prevRow ? (prevRow.dateCalc||prevRow.date) : (row.dateCalc||row.date);
      const curCalc  = row.dateCalc || row.date;
      const diasR = i===0 ? 0 : diasReales(prevCalc, curCalc);
      const dias3 = i===0 ? 0 : dias30_360(prevCalc, curCalc);
      return {...row, amortPct, interestPct, totalPct:amortPct+interestPct, vnAntes, vnDespues:vn, diasReales:diasR, dias30360:dias3};
    });
  };

  const rows = buildRows(selFlows);

  // Estilos tabla
  const thP  = {padding:'7px 10px',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:0.6,background:'var(--bg-input)',borderBottom:'2px solid var(--border)',textAlign:'right',whiteSpace:'nowrap',color:'var(--text-muted)'};
  const thPL = {...thP,textAlign:'left'};
  const tdP  = {padding:'6px 10px',fontFamily:"'DM Mono',monospace",fontSize:12,textAlign:'right',borderBottom:'1px solid var(--border)',color:'var(--text-secondary)'};
  const tdPL = {...tdP,textAlign:'left'};

  return (
    <>
    <div style={{display:'flex',flexDirection:'column',gap:16}}>

      {/* ── Calendario de cobros ──────────────────────────────────────────── */}
      {(()=>{
        // Agrupar todos los pagos por fecha (YYYY-MM-DD)
        const pagosByDate = {};
        proximosPagos.forEach(p=>{
          if(!pagosByDate[p.date]) pagosByDate[p.date]=[];
          pagosByDate[p.date].push(p);
        });

        const calYear  = calMonth.getFullYear();
        const calMon   = calMonth.getMonth(); // 0-indexed
        const firstDay = new Date(calYear, calMon, 1);
        const lastDay  = new Date(calYear, calMon+1, 0);
        // Día de semana del 1ero (0=Dom, ajustar a Lun=0)
        const startDow = (firstDay.getDay()+6)%7;
        const daysInMonth = lastDay.getDate();
        const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
        const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        // Total del mes visible
        const totalMesUSD = proximosPagos.filter(p=>p.date.startsWith(`${calYear}-${String(calMon+1).padStart(2,'0')}`))
          .reduce((a,p)=>a+(p.currency==='USD'?p.total:p.total/fxRate),0);

        // Celdas del calendario: blancos antes + días del mes
        const cells = [];
        for(let i=0;i<startDow;i++) cells.push(null);
        for(let d=1;d<=daysInMonth;d++) cells.push(d);

        const todayStr2 = todayAR();
        const fmtMoney = (p) => p.currency==='USD' ? `US$${fmtN2(p.total)}` : `$${fmtN2(p.total)}`;

        return(
          <div style={{...card,padding:isMobile?'10px 12px':'16px 20px',display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 300px',gap:isMobile?12:20,maxHeight:isMobile?'none':390,overflow:isMobile?'visible':'hidden'}}>

            {/* Calendario */}
            <div>
              {/* Header mes */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div>
                  <div style={{fontSize:18,fontWeight:700,color:'var(--text-primary)',letterSpacing:'-0.5px'}}>
                    {MONTHS[calMon]} {calYear}
                  </div>
                  {totalMesUSD>0&&(
                    <div style={{fontSize:11,color:'var(--accent)',marginTop:2}}>
                      Total del mes: <b style={{fontFamily:"'DM Mono',monospace"}}>≈ US${fmtN2(totalMesUSD)}</b>
                    </div>
                  )}
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))}
                    style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,width:32,height:32,cursor:'pointer',color:'var(--text-secondary)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
                  <button onClick={()=>setCalMonth(new Date())}
                    style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 12px',cursor:'pointer',color:'var(--text-secondary)',fontSize:11}}>Hoy</button>
                  <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))}
                    style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,width:32,height:32,cursor:'pointer',color:'var(--text-secondary)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
                </div>
              </div>

              {/* Grid días semana */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:3}}>
                {DAYS.map(d=>(
                  <div key={d} style={{textAlign:'center',fontSize:10,color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:0.8,padding:'4px 0'}}>{d}</div>
                ))}
              </div>

              {/* Grid celdas */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
                {cells.map((d,i)=>{
                  if(!d) return <div key={'empty-'+i}/>;
                  const dateStr = `${calYear}-${String(calMon+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                  const pagos = pagosByDate[dateStr]||[];
                  const isToday = dateStr===todayStr2;
                  const isSelected = calSelectedDate===dateStr;
                  const hasPago = pagos.length>0;
                  const hasAmort = pagos.some(p=>p.hasAmort);
                  const dotColor = hasAmort?'var(--yellow)':'var(--accent)';
                  // Total del día en USD
                  const totalDia = pagos.reduce((a,p)=>a+(p.currency==='USD'?p.total:p.total/fxRate),0);

                  return(
                    <div key={dateStr}
                      onClick={()=>hasPago&&setCalSelectedDate(isSelected?null:dateStr)}
                      style={{
                        borderRadius:8,
                        padding:'4px 3px',
                        minHeight:38,
                        cursor:hasPago?'pointer':'default',
                        background:isSelected?'rgba(59,130,246,0.15)':isToday?'rgba(59,130,246,0.06)':'transparent',
                        border:isSelected?'1px solid var(--accent)':isToday?'1px solid rgba(59,130,246,0.3)':'1px solid transparent',
                        transition:'background 0.12s',
                        position:'relative',
                        textAlign:'center',
                      }}
                      onMouseEnter={e=>{if(hasPago&&!isSelected)e.currentTarget.style.background='rgba(255,255,255,0.04)';}}
                      onMouseLeave={e=>{if(hasPago&&!isSelected)e.currentTarget.style.background='transparent';}}>
                      <div style={{fontSize:12,fontWeight:isToday?700:400,color:isToday?'var(--accent)':hasPago?'var(--text-primary)':'var(--text-muted)',marginBottom:2}}>
                        {d}
                      </div>
                      {hasPago&&(
                        <>
                          {/* Dots por ticker */}
                          <div style={{display:'flex',justifyContent:'center',gap:2,flexWrap:'wrap',marginBottom:2}}>
                            {pagos.slice(0,3).map(p=>(
                              <div key={p.ticker} style={{width:5,height:5,borderRadius:'50%',background:p.hasAmort?'var(--yellow)':'var(--accent)'}}/>
                            ))}
                            {pagos.length>3&&<div style={{width:5,height:5,borderRadius:'50%',background:'var(--text-muted)'}}/>}
                          </div>
                          {/* Total del día */}
                          <div style={{fontSize:9,color:dotColor,fontFamily:"'DM Mono',monospace",fontWeight:600,lineHeight:1}}>
                            {totalDia>=1000?`${(totalDia/1000).toFixed(1)}k`:`${fmtN2(totalDia)}`}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Leyenda */}
              <div style={{display:'flex',gap:16,marginTop:12,fontSize:10,color:'var(--text-muted)'}}>
                <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:7,height:7,borderRadius:'50%',background:'var(--accent)'}}/> Cupón</div>
                <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:7,height:7,borderRadius:'50%',background:'var(--yellow)'}}/> Amort.</div>
              </div>
            </div>

            {/* Panel derecho: próximos o detalle del día */}
            <div style={{borderLeft:'1px solid var(--border)',paddingLeft:20,display:'flex',flexDirection:'column',gap:0,overflow:'hidden'}}>
              {calSelectedDate?(()=>{
                // Detalle del día seleccionado
                const pagosDelDia = pagosByDate[calSelectedDate]||[];
                const [dd,mm,yyyy] = [calSelectedDate.slice(8),calSelectedDate.slice(5,7),calSelectedDate.slice(0,4)];
                return(<>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:'var(--text-primary)'}}>{dd}/{mm}/{yyyy}</div>
                      <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1}}>{pagosDelDia.length} pago{pagosDelDia.length!==1?'s':''}</div>
                    </div>
                    <button onClick={()=>setCalSelectedDate(null)}
                      style={{background:'transparent',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:16}}>✕</button>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8,overflowY:'auto',maxHeight:380}}>
                    {pagosDelDia.map(p=>(
                      <div key={p.ticker+p.date} onClick={()=>setSelected(p.ticker)}
                        style={{background:'var(--bg-input)',borderRadius:10,padding:'12px 14px',cursor:'pointer',
                          borderLeft:`3px solid ${p.hasAmort?'var(--yellow)':'var(--accent)'}`,
                          transition:'opacity 0.12s'}}
                        onMouseEnter={e=>e.currentTarget.style.opacity='0.85'}
                        onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                          <span style={{fontWeight:700,fontSize:13,color:'var(--accent)',fontFamily:"'DM Mono',monospace"}}>{p.ticker}</span>
                          <span style={{fontSize:10,color:p.hasAmort?'var(--yellow)':'var(--accent)'}}>
                            {p.hasAmort&&p.hasCupon?'💰+🎫':p.hasAmort?'💰':'🎫'}
                          </span>
                        </div>
                        <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:6,lineHeight:1.4}}>{p.name}</div>
                        <div style={{fontSize:16,fontWeight:700,color:'var(--text-primary)',fontFamily:"'DM Mono',monospace"}}>
                          {p.currency==='USD'?'US$':'$'}{fmtN2(p.total)}
                        </div>
                        {p.hasAmort&&p.hasCupon&&(
                          <div style={{display:'flex',gap:10,marginTop:4}}>
                            <span style={{fontSize:10,color:'var(--yellow)'}}>Amort: {p.currency==='USD'?'US$':'$'}{fmtN2(p.totalAmort)}</span>
                            <span style={{fontSize:10,color:'var(--accent)'}}>Int: {p.currency==='USD'?'US$':'$'}{fmtN2(p.totalCupon)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>);
              })():(()=>{
                // Lista próximos pagos
                const proximos = proximosPagos.filter(p=>p.date>=todayStr2);
                return(<>
                  <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1,fontWeight:600,marginBottom:12}}>
                    Próximos cobros
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:1,overflowY:'auto',maxHeight:390}}>
                    {proximos.length===0
                      ? <div style={{color:'var(--text-muted)',fontSize:13}}>No hay flujos cargados.</div>
                      : proximos.map((p,i)=>{
                          const isFirst = i===0;
                          return(
                            <div key={p.ticker+p.date} onClick={()=>{setSelected(p.ticker);setCalSelectedDate(p.date);setCalMonth(new Date(p.date));}}
                              style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,cursor:'pointer',
                                background:isFirst?'rgba(59,130,246,0.06)':'transparent',
                                transition:'background 0.12s'}}
                              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                              onMouseLeave={e=>e.currentTarget.style.background=isFirst?'rgba(59,130,246,0.06)':'transparent'}>
                              {/* Fecha grande */}
                              <div style={{textAlign:'center',minWidth:42,flexShrink:0}}>
                                <div style={{fontSize:isMobile?16:20,fontWeight:700,fontFamily:"'DM Mono',monospace",color:p.hasAmort?'var(--yellow)':'var(--accent)',lineHeight:1}}>
                                  {p.date.slice(8)}
                                </div>
                                <div style={{fontSize:9,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:0.5}}>
                                  {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(p.date.slice(5,7))-1]}
                                </div>
                              </div>
                              {/* Separador */}
                              <div style={{width:1,height:32,background:'var(--border)',flexShrink:0}}/>
                              {/* Info */}
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                                  <span style={{fontWeight:700,fontSize:12,color:'var(--text-primary)',fontFamily:"'DM Mono',monospace"}}>{p.ticker}</span>
                                  <span style={{fontSize:9,color:p.hasAmort?'var(--yellow)':'var(--accent)'}}>
                                    {p.hasAmort&&p.hasCupon?'Amort.+Cupón':p.hasAmort?'Amort.':'Cupón'}
                                  </span>
                                  {isFirst&&<span style={{fontSize:8,background:'var(--accent)',color:'#fff',borderRadius:3,padding:'1px 4px',fontWeight:700}}>NEXT</span>}
                                </div>
                                <div style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)',fontFamily:"'DM Mono',monospace"}}>
                                  {p.currency==='USD'?'US$':'$'}{fmtN2(p.total)}
                                </div>
                              </div>
                            </div>
                          );
                        })
                    }
                  </div>
                </>);
              })()}
            </div>
          </div>
        );
      })()}

      {/* Lista de bonos + tabla */}
      <div style={{...card,padding:'16px 20px'}}>
        <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1.2,fontWeight:600,marginBottom:12}}>Bonos y ONs en cartera</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
          {bonds.map(b=>{
            const hasFlows = (bondFlows[b.ticker]||[]).length>0;
            const isActive = selected===b.ticker;
            return(
              <button key={b.ticker}
                onClick={()=>{ if(hasFlows){setSelected(b.ticker);setAddingFlow(null);}else{fetchFlows(b.ticker);} }}
                style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${isActive?'var(--accent)':'var(--border)'}`,
                  background:isActive?'var(--accent)':'var(--bg-input)',
                  color:isActive?'#fff':'var(--text-secondary)',cursor:'pointer',fontSize:12,fontWeight:isActive?700:400,
                  display:'flex',alignItems:'center',gap:6}}>
                {loadingTicker===b.ticker?'⟳ ':hasFlows?'✓ ':'+ '}
                {b.ticker}
              </button>
            );
          })}
        </div>

        {selected&&selBond&&(
          <div>
            {/* Header del bono */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12,flexWrap:'wrap',gap:8}}>
              <div>
                <span style={{fontWeight:700,color:'var(--text-primary)',fontSize:14}}>{selBond.ticker}</span>
                <span style={{color:'var(--text-muted)',fontSize:12,marginLeft:8}}>{selBond.name}</span>
                <span style={{color:'var(--text-muted)',fontSize:11,marginLeft:8}}>{selBond.qty.toLocaleString('es-AR')} nominales</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                {/* TNA + Base — editable */}
                {editingMeta ? (
                  <div style={{display:'flex',gap:8,alignItems:'center',background:'var(--bg-input)',border:'1px solid var(--accent)',borderRadius:8,padding:'6px 12px'}}>
                    <span style={{fontSize:11,color:'var(--text-muted)'}}>Cupón:</span>
                    <input type="number" step="0.01" value={metaDraft.tna}
                      onChange={e=>setMetaDraft(p=>({...p,tna:e.target.value}))}
                      style={{...inp,width:70,textAlign:'right'}}/>
                    <span style={{fontSize:11,color:'var(--text-muted)'}}>%</span>
                    <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:8}}>Base:</span>
                    <select value={metaDraft.base} onChange={e=>setMetaDraft(p=>({...p,base:e.target.value}))}
                      style={{...inp,width:110}}>
                      <option value="30/360">30/360</option>
                      <option value="dias/365">Días/365</option>
                    </select>
                    {adjustsBy==='CER'&&<>
                      <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:8}}>Emisión:</span>
                      <input type="date" value={metaDraft.emisionDate||''}
                        onChange={e=>setMetaDraft(p=>({...p,emisionDate:e.target.value}))}
                        style={{...inp,width:140}}/>
                    </>}
                    <button onClick={applyMeta}
                      style={{background:'var(--accent)',border:'none',borderRadius:6,padding:'4px 12px',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:600}}>
                      ✓ Aplicar
                    </button>
                    <button onClick={()=>setEditingMeta(false)}
                      style={{background:'transparent',border:'1px solid var(--border)',borderRadius:6,padding:'4px 8px',color:'var(--text-muted)',cursor:'pointer',fontSize:12}}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{display:'flex',gap:6,alignItems:'center',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 12px',cursor:'pointer'}}
                    onClick={()=>{setMetaDraft({tna:selMeta.tna, base:selMeta.base, emisionDate:selMeta.emisionDate||''});setEditingMeta(true);}}>
                    <span style={{fontSize:12,color:'var(--text-secondary)'}}>Cupón <b style={{color:'var(--accent)'}}>{selMeta.tna}%</b></span>
                    <span style={{fontSize:10,color:'var(--text-muted)'}}>·</span>
                    <span style={{fontSize:12,color:'var(--text-secondary)'}}>Base <b style={{color:'var(--text-primary)'}}>{selMeta.base}</b></span>
                    {adjustsBy==='CER'&&<><span style={{fontSize:10,color:'var(--text-muted)'}}>·</span><span style={{fontSize:12,color:'var(--text-secondary)'}}>Emisión <b style={{color:'var(--yellow)'}}>{selMeta.emisionDate?fmtD(selMeta.emisionDate):'—'}</b></span></>}
                    <span style={{fontSize:10,color:'var(--text-muted)',marginLeft:4}}>✏️</span>
                  </div>
                )}
                <button onClick={()=>setWizardFlujosOpen(true)}
                  style={{background:'rgba(59,130,246,0.12)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:6,padding:'5px 12px',cursor:'pointer',color:'#60A5FA',fontSize:12,fontWeight:600}}>
                  ⚡ Carga rápida
                </button>
                <button onClick={()=>setAddingFlow(selected)}
                  style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:6,padding:'5px 12px',cursor:'pointer',color:'var(--text-secondary)',fontSize:12}}>
                  + Agregar pago
                </button>
              </div>
            </div>

            {/* Descripción */}
            {seedMeta.desc&&(
              <div style={{background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.12)',borderRadius:8,padding:'9px 14px',marginBottom:10,fontSize:12,color:'var(--text-secondary)'}}>
                📋 {seedMeta.desc}
              </div>
            )}

            {/* Estado CER — inline */}
            {adjustsBy==='CER'&&(()=>{
              const emisionDate = selMeta.emisionDate||null;
              const cerBaseVal = emisionDate&&cerSerie ? getCERMinus10(cerSerie,emisionDate) : null;
              const cerHoy = cerSerie ? getCER(cerSerie,todayAR()) : null;
              const coefHoy = cerBaseVal&&cerHoy ? (cerHoy/cerBaseVal) : null;
              // Fecha efectiva del CER base (10d antes de emisión)
              const cerBaseFecha = emisionDate ? (()=>{const d=new Date(emisionDate);d.setDate(d.getDate()-10);return d.toISOString().slice(0,10);})() : null;
              return(
                <div style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:8,padding:'8px 14px',marginBottom:10,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap',fontSize:11}}>
                  <span style={{color:'var(--yellow)',fontWeight:600}}>⚡ CER</span>
                  {!cerSerie&&<span style={{color:'var(--text-muted)'}}>⏳ Esperando datos del histórico — el script Python actualiza el CER diariamente</span>}
                  {cerSerie&&!emisionDate&&<span style={{color:'var(--text-muted)'}}>Editá el chip ✏️ para ingresar la fecha de emisión</span>}
                  {cerBaseVal&&<span style={{color:'var(--text-muted)'}}>CER base ({fmtD(cerBaseFecha)}): <b style={{color:'var(--text-secondary)',fontFamily:"'DM Mono',monospace"}}>{cerBaseVal.toFixed(4)}</b></span>}
                  {cerHoy&&<span style={{color:'var(--text-muted)'}}>CER hoy: <b style={{color:'var(--text-secondary)',fontFamily:"'DM Mono',monospace"}}>{cerHoy.toFixed(4)}</b></span>}
                  {coefHoy&&<span style={{color:'var(--text-muted)'}}>Coef. actual: <b style={{color:'var(--yellow)',fontFamily:"'DM Mono',monospace"}}>{coefHoy.toFixed(4)}</b></span>}
                  {cerSerie&&cerSerie.length>0&&!cerLoading&&<span style={{color:'var(--green)',marginLeft:'auto',fontSize:10}}>✓ {cerSerie.length} registros</span>}

                </div>
              );
            })()}

            {/* Form agregar pago */}
            {addingFlow===selected&&(
              <div style={{background:editingRowIds?'rgba(96,165,250,0.06)':'rgba(59,130,246,0.06)',border:`1px solid ${editingRowIds?'rgba(96,165,250,0.3)':'rgba(59,130,246,0.15)'}`,borderRadius:10,padding:'14px 16px',marginBottom:12,display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
                {editingRowIds&&<div style={{width:'100%',fontSize:11,color:'#60A5FA',fontWeight:600,marginBottom:2}}>✏️ Editando fila — modificá los campos y guardá</div>}
                {/* F. Pago */}
                <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:130}}>
                  <span style={{fontSize:10,color:'var(--text-muted)'}}>F. Pago</span>
                  <input type="date" value={newFlow.date} onChange={e=>setNewFlow(p=>({...p,date:e.target.value}))} style={inp}/>
                </div>
                {/* F. Teórica */}
                <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:130}}>
                  <span style={{fontSize:10,color:'var(--text-muted)'}}>F. Teórica (cálculo)</span>
                  <input type="date" value={newFlow.dateCalc||newFlow.date} onChange={e=>setNewFlow(p=>({...p,dateCalc:e.target.value}))} style={{...inp,color:'var(--text-secondary)'}}/>
                </div>
                {/* Tipo */}
                <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:140}}>
                  <span style={{fontSize:10,color:'var(--text-muted)'}}>Tipo</span>
                  <select value={newFlow.tipo} onChange={e=>setNewFlow(p=>({...p,tipo:e.target.value}))} style={inp}>
                    <option value="cupon">🎫 Solo cupón</option>
                    <option value="amortizacion">💰 Solo amort.</option>
                    <option value="ambos">💰+🎫 Amort.+Cupón</option>
                  </select>
                </div>
                {/* Amort */}
                {(newFlow.tipo==='amortizacion'||newFlow.tipo==='ambos')&&(
                  <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:110}}>
                    <span style={{fontSize:10,color:'var(--text-muted)'}}>Amort. % VN</span>
                    <input type="number" step="0.0001" value={newFlow.amort} onChange={e=>setNewFlow(p=>({...p,amort:e.target.value}))} placeholder="ej: 4.5455" style={inp}/>
                  </div>
                )}
                {/* Cupón — editable si modo edición, calculado si modo nuevo */}
                {(newFlow.tipo==='cupon'||newFlow.tipo==='ambos')&&(
                  <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:110}}>
                    <span style={{fontSize:10,color:'var(--text-muted)'}}>{editingRowIds?'Cupón % VN':'Interés calculado'}</span>
                    {editingRowIds
                      ? <input type="number" step="0.000001" value={newFlow.cuponMonto} onChange={e=>setNewFlow(p=>({...p,cuponMonto:e.target.value}))} placeholder="ej: 3.25" style={{...inp,color:'var(--accent)',fontWeight:700}}/>
                      : <div style={{...inp,background:'transparent',color:'var(--accent)',fontWeight:700,textAlign:'right'}}>
                          {(()=>{
                            if(!newFlow.date) return '—';
                            const meta2 = bondMeta[addingFlow]||{tna:0,base:'30/360'};
                            const flows2 = (bondFlows[addingFlow]||[]).sort((a,b)=>a.date.localeCompare(b.date));
                            let vn2=100;
                            flows2.forEach(f=>{if(f.date<newFlow.date&&f.tipo==='amortizacion')vn2=Math.max(0,vn2-f.monto);});
                            const prevDates2=[...new Set(flows2.map(f=>f.date))].filter(d=>d<newFlow.date).sort();
                            const prev2=prevDates2.length?prevDates2[prevDates2.length-1]:newFlow.date;
                            const dc=meta2.base==='30/360'?dias30_360(prev2,newFlow.date):diasReales(prev2,newFlow.date);
                            return fmtN(calcInteres(meta2.tna,meta2.base,dc,vn2))+'%';
                          })()}
                        </div>
                    }
                  </div>
                )}
                {/* Nota */}
                <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:130}}>
                  <span style={{fontSize:10,color:'var(--text-muted)'}}>Nota (opcional)</span>
                  <input value={newFlow.nota} onChange={e=>setNewFlow(p=>({...p,nota:e.target.value}))} placeholder="ej: cuota 5/22" style={inp}/>
                </div>
                <button onClick={editingRowIds ? saveEditFlow : addNewFlow}
                  style={{background:'var(--accent)',border:'none',borderRadius:8,padding:'7px 16px',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>
                  {editingRowIds ? '✓ Guardar cambios' : 'Guardar'}
                </button>
                <button onClick={()=>{setAddingFlow(null);setEditingRowIds(null);setNewFlow({date:'',tipo:'cupon',amort:'',nota:'',cuponMonto:'',dateCalc:''});}}
                  style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'7px 12px',color:'var(--text-muted)',cursor:'pointer',fontSize:13}}>
                  Cancelar
                </button>
              </div>
            )}

            {rows.length===0
              ? <div style={{color:'var(--text-muted)',fontSize:13,padding:'20px 0'}}>No hay flujos. Usá "+ Agregar pago" para cargarlos.</div>
              : (<>
                {/* Toggle vista */}
                <div style={{display:'flex',gap:8,marginBottom:12}}>
                  {[['prospecto','📋 Prospecto'],['micobro','💰 Mi cobro']].map(([k,lbl])=>(
                    <button key={k} onClick={()=>setViewMode(k)}
                      style={{padding:'5px 14px',borderRadius:6,border:`1px solid ${viewMode===k?'var(--accent)':'var(--border)'}`,
                        background:viewMode===k?'var(--accent)':'var(--bg-input)',
                        color:viewMode===k?'#fff':'var(--text-secondary)',cursor:'pointer',fontSize:12,fontWeight:viewMode===k?700:400}}>
                      {lbl}
                    </button>
                  ))}
                </div>

                {/* ── VISTA PROSPECTO ── */}
                {viewMode==='prospecto'&&(()=>{
                  // Datos CER para este bono si aplica
                  const isCERBond = adjustsBy==='CER';
                  const meta2 = SEED_BOND_META[selected]||{};
                  const emisionDate2 = selMeta.emisionDate||meta2.emisionDate||null;
                  // CER base = último CER conocido 10 días antes de la emisión
                  const cerBaseVal2 = (isCERBond&&cerSerie&&emisionDate2) ? getCERMinus10(cerSerie,emisionDate2) : null;

                  return(
                  <div style={{overflowX:'auto',borderRadius:10,border:'1px solid var(--border)'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                      <thead>
                        <tr>
                          <th style={{...thPL,width:28}}>#</th>
                          <th style={{...thPL}}>F. Pago</th>
                          <th style={{...thPL,color:'var(--text-muted)',fontSize:9}}>F. Teórica</th>
                          <th style={thP}>Días ({selMeta.base})</th>
                          <th style={thP}>Amort. % VN</th>
                          <th style={thP}>VN Residual</th>
                          <th style={thP}>Cupón</th>
                          <th style={thP}>Interés % VN</th>
                          {isCERBond&&<><th style={{...thP,background:'rgba(251,191,36,0.06)',color:'var(--yellow)'}}>CER</th><th style={{...thP,background:'rgba(251,191,36,0.06)',color:'var(--yellow)'}}>VN Ajust.</th><th style={{...thP,background:'rgba(251,191,36,0.06)',color:'var(--yellow)'}}>Interés Aj.</th></>}
                          <th style={{...thP,background:'rgba(251,191,36,0.1)',color:'var(--yellow)'}}>Amort.</th>
                          <th style={{...thP,background:'rgba(59,130,246,0.1)',color:'var(--accent)'}}>Interés</th>
                          <th style={{...thP,background:'rgba(52,211,153,0.1)',color:'var(--green)'}}>Total</th>
                          <th style={{...thP,textAlign:'center',width:56}}>Acc.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row,i)=>{
                          const isPast    = row.date < today;
                          const isCobrado = (row.cupon?.cobrado??!row.cupon) && (row.amort?.cobrado??!row.amort);
                          const dias      = i===0 ? '—' : (selMeta.base==='30/360' ? row.dias30360 : row.diasReales);
                          const rowBg = isCobrado?'rgba(52,211,153,0.04)':isPast?'rgba(251,191,36,0.03)':'transparent';
                          // CER de la fecha de pago
                          // getCER devuelve el último valor conocido <= fecha (o el más antiguo si no hay anterior)
                          // CER de pago = CER de (fecha_pago - 10 días hábiles), o (hoy - 10hd) si es futuro
                          const cerPagoVal = (isCERBond&&cerSerie&&cerBaseVal2) ? getCERMinus10(cerSerie,row.date) : null;
                          const coefCER = (cerBaseVal2&&cerPagoVal) ? cerPagoVal/cerBaseVal2 : null;
                          const vnAjust = coefCER ? 100*coefCER : null; // VN ajustado por cada 100 originales
                          // Interés ajustado CER
                          const diasNum = typeof dias === 'number' ? dias : 0;
                          const divisor = selMeta.base==='30/360'?360:365;
                          const interesAjust = (coefCER&&selMeta.tna&&diasNum>0) ? parseFloat(((selMeta.tna/100)*(diasNum/divisor)*100*coefCER).toFixed(4)) : null;
                          return(
                            <tr key={row.date} style={{background:rowBg}}>
                              <td style={{...tdPL,color:'var(--text-muted)',fontSize:11}}>{i+1}</td>
                              <td style={{...tdPL,fontWeight:600,color:isCobrado?'var(--green)':isPast?'var(--yellow)':'var(--text-primary)'}}>
                                {fmtD(row.date)}{isCobrado&&<span style={{fontSize:9,marginLeft:5,color:'var(--green)'}}>✓</span>}
                              </td>
                              <td style={{...tdPL,fontSize:10,color:row.dateCalc&&row.dateCalc!==row.date?'var(--text-secondary)':'var(--text-muted)'}}>
                                {fmtD(row.dateCalc||row.date)}
                              </td>
                              <td style={{...tdP,color:'var(--text-muted)'}}>{dias}</td>
                              {/* Amort — input siempre visible en todas las filas */}
                              <td style={{...tdP,color:row.amortPct>0?'var(--yellow)':'var(--text-muted)',padding:'4px 6px'}}>
                                <input type="number" step="0.0001" min="0"
                                    defaultValue={row.amortPct||0}
                                    key={'a-'+(row.amort?.id||row.date)+'-'+row.amortPct}
                                    onFocus={e=>{e.target.select();e.target.style.background='var(--bg-input)';e.target.style.color='var(--yellow)';e.target.style.border='1px solid var(--accent)';}}
                                    onBlur={e=>{
                                      e.target.style.background='transparent';e.target.style.border='none';
                                      const val=parseFloat(e.target.value)||0;
                                      e.target.style.color=val>0?'var(--yellow)':'var(--text-muted)';
                                      if(row.amort){
                                        if(val===0){
                                          // Eliminar amort si se pone 0
                                          setBondFlows(prev=>({...prev,[selected]:(prev[selected]||[]).filter(f=>f.id!==row.amort.id)}));
                                        } else {
                                          saveCellEdit(selected,row.amort.id,'monto',e.target.value);
                                        }
                                      } else if(val>0){
                                        // Crear amort nueva en esta fecha
                                        const newId=Date.now()+Math.random();
                                        setBondFlows(prev=>({...prev,[selected]:[...(prev[selected]||[]),{id:newId,date:row.date,tipo:'amortizacion',monto:val,cobrado:false,fechaCobro:null,fuente:'manual',nota:''}].sort((a,b)=>a.date.localeCompare(b.date))}));
                                      }
                                    }}
                                    onKeyDown={e=>{if(e.key==='Enter')e.target.blur();if(e.key==='Escape'){e.target.value=row.amortPct||0;e.target.blur();}}}
                                    style={{background:'transparent',border:'none',color:'inherit',fontFamily:"'DM Mono',monospace",fontSize:12,textAlign:'right',width:'100%',outline:'none',cursor:'pointer',borderRadius:4,padding:'2px 4px'}}/>
                              </td>
                              <td style={tdP}>{fmtN2(row.vnDespues)}%</td>
                              <td style={{...tdP,color:'var(--text-muted)'}}>{selMeta.tna}%</td>
                              {/* Interés — input siempre visible, estilo texto hasta focus */}
                              <td style={{...tdP,color:'var(--accent)',padding:'4px 6px'}}>
                                {row.cupon
                                  ?<input type="number" step="0.0001"
                                      defaultValue={row.interestPct}
                                      key={'i-'+row.cupon.id+'-'+row.cupon.monto}
                                      onFocus={e=>{e.target.select();e.target.style.background='var(--bg-input)';e.target.style.color='var(--accent)';e.target.style.border='1px solid var(--accent)';}}
                                      onBlur={e=>{e.target.style.background='transparent';e.target.style.border='none';e.target.style.color='var(--accent)';saveCellEdit(selected,row.cupon.id,'monto',e.target.value);}}
                                      onKeyDown={e=>{if(e.key==='Enter')e.target.blur();if(e.key==='Escape'){e.target.value=row.cupon.monto;e.target.blur();}}}
                                      style={{background:'transparent',border:'none',color:'inherit',fontFamily:"'DM Mono',monospace",fontSize:12,textAlign:'right',width:'100%',outline:'none',cursor:'pointer',borderRadius:4,padding:'2px 4px'}}/>
                                  :<span style={{color:'var(--text-muted)'}}>—</span>
                                }
                              </td>
                              {/* Celdas CER — solo bonos CER con serie cargada */}
                              {isCERBond&&(
                                <>
                                  <td style={{...tdP,background:'rgba(251,191,36,0.03)',color:'var(--yellow)',fontSize:11}}>
                                    {cerPagoVal?cerPagoVal.toFixed(4):<span style={{color:'var(--text-muted)'}}>—</span>}
                                  </td>
                                  <td style={{...tdP,background:'rgba(251,191,36,0.03)',color:'var(--yellow)',fontSize:11}}>
                                    {vnAjust?fmtN2(vnAjust):<span style={{color:'var(--text-muted)'}}>—</span>}
                                  </td>
                                  <td style={{...tdP,background:'rgba(251,191,36,0.03)',color:'var(--yellow)',fontSize:11,fontWeight:600}}>
                                    {interesAjust!=null?fmtN(interesAjust)+'%':<span style={{color:'var(--text-muted)'}}>—</span>}
                                  </td>
                                </>
                              )}
                              <td style={{...tdP,background:'rgba(251,191,36,0.04)',color:'var(--yellow)',fontWeight:row.amortPct>0?700:400}}>
                                {row.amortPct>0?fmtN(row.amortPct):'—'}
                              </td>
                              <td style={{...tdP,background:'rgba(59,130,246,0.04)',color:'var(--accent)'}}>
                                {row.interestPct>0?fmtN(row.interestPct):'—'}
                              </td>
                              <td style={{...tdP,background:'rgba(52,211,153,0.04)',color:'var(--green)',fontWeight:700}}>
                                {fmtN(row.totalPct)}
                              </td>
                              <td style={{...tdP,textAlign:'center',whiteSpace:'nowrap'}}>
                                <button onClick={()=>{
                                    setAddingFlow(selected);
                                    setEditingRowIds(row.ids);
                                    const tipoKey = row.cupon&&row.amort?'ambos':row.amort?'amortizacion':'cupon';
                                    setNewFlow({
                                      date:      row.date,
                                      dateCalc:  row.dateCalc||row.date,
                                      tipo:      tipoKey,
                                      amort:     row.amort?.monto!=null?String(row.amort.monto):'',
                                      cuponMonto:row.cupon?.monto!=null?String(row.cupon.monto):'',
                                      nota:      (row.cupon||row.amort)?.nota||''
                                    });
                                  }}
                                  title="Editar" style={{background:'transparent',border:'none',cursor:'pointer',color:'#60A5FA',fontSize:11,padding:'0 2px'}}>✏️</button>
                                <button onClick={()=>deleteRow(selected,row.ids)}
                                  title="Eliminar" style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--red)',fontSize:12,padding:'0 2px'}}>🗑</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{borderTop:'2px solid var(--border)',background:'var(--bg-input)'}}>
                          <td colSpan={isCERBond?12:9} style={{...tdPL,fontWeight:700,fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:0.8}}>Total</td>
                          <td style={{...tdP,background:'rgba(251,191,36,0.08)',color:'var(--yellow)',fontWeight:700}}>{fmtN(rows.reduce((a,r)=>a+r.amortPct,0))}</td>
                          <td style={{...tdP,background:'rgba(59,130,246,0.08)',color:'var(--accent)',fontWeight:700}}>{fmtN(rows.reduce((a,r)=>a+r.interestPct,0))}</td>
                          <td style={{...tdP,background:'rgba(52,211,153,0.08)',color:'var(--green)',fontWeight:700}}>{fmtN(rows.reduce((a,r)=>a+r.totalPct,0))}</td>
                          <td style={tdP}/>
                        </tr>
                      </tfoot>
                    </table>
                    <div style={{fontSize:9,color:'var(--text-muted)',padding:'6px 10px'}}>
                      ✎ Click en celda para editar
                      {isCERBond&&cerSerie&&cerSerie.length>0?' · Columnas CER calculadas con serie argentinadatos':''}
                      {isCERBond&&!cerSerie?' · Cargá la serie CER para ver columnas ajustadas':''}
                    </div>
                  </div>
                  );
                })()}

                {/* ── VISTA MI COBRO ── */}
                {viewMode==='micobro'&&(
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                    <thead>
                      <tr>
                        {['Fecha','Tipo','% VN total','Nominales','Cobro estimado','Estado',''].map(h=>(
                          <th key={h} style={{padding:'8px 12px',textAlign:h==='Cobro estimado'||h==='% VN total'?'right':'left',fontSize:10,color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:0.8,borderBottom:'1px solid var(--border)'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row=>{
                        const isFuture  = row.date > today;
                        const cobrado   = (row.cupon?.cobrado??!row.cupon) && (row.amort?.cobrado??!row.amort);
                        const hasAmort  = !!row.amort;
                        const hasCupon  = !!row.cupon;
                        // Para bonos CER: cobro = VN ajustado × qty / 100
                        // VN ajustado = vnDespues (o vnAntes para amort) × coefCER
                        const isCERRow = adjustsBy==='CER' && cerSerie;
                        const cerPagoRow = isCERRow ? getCERMinus10(cerSerie, row.date) : null;
                        const cerBaseRow = isCERRow && selMeta.emisionDate ? getCERMinus10(cerSerie, selMeta.emisionDate) : null;
                        const coefCERRow = (cerPagoRow && cerBaseRow) ? cerPagoRow/cerBaseRow : null;

                        // Amortización: monto% × VN ajustado × qty/100
                        const montoAmortBase = hasAmort ? row.amort.monto : 0;
                        const montoIntBase   = hasCupon ? row.cupon.monto : 0;

                        let totalCobro;
                        if(isCERRow && coefCERRow){
                          // Amort: montoAmortBase% × 100 × coefCER × qty/100 = montoAmortBase × coefCER × qty/100
                          const cobroAmort = montoAmortBase * coefCERRow * selBond.qty / 100;
                          // Interés: sobre VN ajustado antes del pago
                          const vnAjustAntes = row.vnAntes * coefCERRow;
                          const divisorBase  = selMeta.base==='30/360' ? 360 : 365;
                          const diasRow      = row.dias30360 || 0;
                          const cobroInt = hasCupon
                            ? (selMeta.tna/100) * (diasRow/divisorBase) * vnAjustAntes * selBond.qty / 100
                            : 0;
                          totalCobro = cobroAmort + cobroInt;
                        } else {
                          const montoAmort= hasAmort?(adjustsBy?row.amort.monto*coef:row.amort.monto):0;
                          const montoInt  = hasCupon?(adjustsBy?row.cupon.monto*coef:row.cupon.monto):0;
                          totalCobro = (montoAmort+montoInt)*(selBond.qty/100);
                        }
                        const montoTotal= (montoAmortBase+montoIntBase); // para mostrar % VN
                        const tipoLabel = hasAmort&&hasCupon?'💰+🎫 Amort.+Cupón':hasAmort?'💰 Amort.':'🎫 Cupón';
                        const tipoColor = hasAmort?'var(--yellow)':'var(--accent)';
                        return(
                          <tr key={row.date} style={{borderBottom:'1px solid var(--border)',
                            background:cobrado?'rgba(52,211,153,0.03)':!isFuture?'rgba(251,191,36,0.03)':'transparent'}}>
                            <td style={{padding:'10px 12px',fontFamily:"'DM Mono',monospace",fontSize:12}}>{fmtD(row.date)}</td>
                            <td style={{padding:'10px 12px'}}><span style={{color:tipoColor,fontSize:12}}>{tipoLabel}</span></td>
                            <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:12}}>
                              {fmtN(montoTotal)}%
                              {adjustsBy&&coef!==1&&<span style={{fontSize:9,color:'var(--yellow)',display:'block'}}>×{coef} {adjustsBy}</span>}
                            </td>
                            <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:12,color:'var(--text-muted)'}}>{selBond.qty.toLocaleString('es-AR')}</td>
                            <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:13}}>
                              {currency}{fmtN2(totalCobro)}
                            </td>
                            <td style={{padding:'10px 12px',fontSize:12}}>
                              {cobrado
                                ?<span style={{color:'var(--green)'}}>â
 {fmtD(row.cupon?.fechaCobro||row.amort?.fechaCobro)}</span>
                                :!isFuture
                                  ?<button onClick={()=>confirmCobro(selected,row.ids)}
                                    style={{background:'rgba(52,211,153,0.1)',border:'1px solid rgba(52,211,153,0.3)',borderRadius:6,padding:'3px 10px',color:'var(--green)',cursor:'pointer',fontSize:11}}>
                                    Confirmar cobro
                                  </button>
                                  :<span style={{color:'var(--text-muted)',fontSize:11}}>🟡 Pendiente</span>
                              }
                            </td>
                            <td style={{padding:'10px 12px'}}>
                              <button onClick={()=>deleteRow(selected,row.ids)}
                                style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--red)',fontSize:13}}>🗑</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>)
            }
          </div>
        )}
      </div>
    </div>

    {/* BondWizard inline — carga rápida desde FlujoTab */}
    {wizardFlujosOpen && selected && (
      <BondWizard
        ticker={selected}
        darkMode={true}
        onConfirm={(newFlows, meta)=>{
          const existing = bondFlows[selected]||[];
          if(existing.length > 0){
            const replace = window.confirm(
              `Ya hay ${existing.length} flujo(s) cargados para ${selected}.\n\n` +
              `¿Reemplazar todo? (Cancelar = agregar al final)`
            );
            if(replace){
              setBondFlows(prev=>({...prev,[selected]:newFlows}));
            } else {
              const existingKeys = new Set(existing.map(f=>f.date+'|'+f.tipo));
              const toAdd = newFlows.filter(f=>!existingKeys.has(f.date+'|'+f.tipo));
              setBondFlows(prev=>({...prev,[selected]:[...existing,...toAdd].sort((a,b)=>a.date.localeCompare(b.date))}));
            }
          } else {
            setBondFlows(prev=>({...prev,[selected]:newFlows}));
          }
          // Actualizar bondMeta con TNA/base del wizard
          if(meta) setBondMeta(prev=>({...prev,[selected]:{tna:meta.tna,base:meta.base,emisionDate:meta.emisionDate||null}}));
          setWizardFlujosOpen(false);
        }}
        onSkip={()=>setWizardFlujosOpen(false)}
      />
    )}
    </>
  );
}

