/* eslint-disable */
import { isBondTicker } from './calcUtils';
import { calcVNR } from './shared';
import { SEED_BOND_META } from '../constants/bondFlows';

// Datos para la declaración anual: ventas con costo FIFO, cobros de cupones/amortizaciones y tenencia al cierre.
// Es un resumen informativo: los criterios impositivos (tipo de cambio, exenciones) los define tu contador.
export function buildTaxReport({ year, trades, port = [], historicos = {}, bondFlows = {}, today }) {
  const y = String(year), from = `${y}-01-01`, to = `${y}-12-31`;
  const cut = today && today < to ? today : to;
  const cclBars = historicos.CCL || [];
  const lastLE = (bars, d) => { let r = null; for (const b of bars || []) { if (b.date <= d) r = b; else break; } return r; };
  const ccl = d => lastLE(cclBars, d)?.close || null;
  const cur = {};
  for (const t of trades) if (!cur[t.ticker]) cur[t.ticker] = String(t.currency || 'ARS').toUpperCase();
  for (const p of port) if (p.buyCurrency) cur[p.ticker] = String(p.buyCurrency).toUpperCase();
  const f = (tk, q) => isBondTicker(tk) ? q / 100 : q;
  const toUSD = (tk, a, d) => cur[tk] === 'USD' ? a : (ccl(d) ? a / ccl(d) : null);

  // FIFO por ticker, recorriendo toda la historia (las compras de años anteriores forman el costo)
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date) || (a.tipo === b.tipo ? 0 : a.tipo === 'compra' ? -1 : 1) || (a.ts || 0) - (b.ts || 0));
  const lots = {}, ventas = [];
  for (const t of sorted) {
    const tk = t.ticker, q = +t.qty, com = +t.comision || 0;
    if (t.tipo === 'compra') { (lots[tk] = lots[tk] || []).push({ q, unit: (+t.price * f(tk, q) + com) / q, unitUSD: (toUSD(tk, +t.price * f(tk, q) + com, t.date) ?? 0) / q }); continue; }
    let rest = q, cost = 0, costUSD = 0;
    for (const l of lots[tk] || []) { if (rest <= 0) break; const u = Math.min(l.q, rest); cost += u * l.unit; costUSD += u * l.unitUSD; l.q -= u; rest -= u; }
    lots[tk] = (lots[tk] || []).filter(l => l.q > 1e-9);
    if (t.date < from || t.date > to) continue;
    const neto = +t.price * f(tk, q) - com, netoUSD = toUSD(tk, neto, t.date);
    ventas.push({ fecha: t.date, ticker: tk, moneda: cur[tk], cantidad: q, precio: +t.price, comision: com, neto, costo: cost, resultado: neto - cost, netoUSD, costoUSD: costUSD, resultadoUSD: netoUSD != null ? netoUSD - costUSD : null, sinCosto: rest > 1e-9 });
  }

  const cobros = [];
  for (const [tk, flows] of Object.entries(bondFlows || {})) for (const fl of flows || []) {
    if (!fl.cobrado || !fl.fechaCobro || fl.fechaCobro < from || fl.fechaCobro > to) continue;
    const q = trades.filter(t => t.ticker === tk && t.date <= fl.fechaCobro).reduce((a, t) => a + (t.tipo === 'compra' ? +t.qty : -t.qty), 0);
    if (q <= 0) continue;
    const monto = fl.tipo === 'amortizacion' ? fl.monto * q / 100 : fl.monto * q * calcVNR(flows, fl.fechaCobro, SEED_BOND_META?.[tk]?.vnrInicial ?? 100) / 10000;
    cobros.push({ fecha: fl.fechaCobro, ticker: tk, tipo: fl.tipo === 'amortizacion' ? 'Amortización' : 'Cupón', moneda: cur[tk] || 'USD', nominales: q, monto, montoUSD: toUSD(tk, monto, fl.fechaCobro) });
  }
  cobros.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const tenencia = [];
  const tcCierre = ccl(cut);
  for (const tk of [...new Set(trades.map(t => t.ticker))].sort()) {
    const q = trades.filter(t => t.ticker === tk && t.date <= cut).reduce((a, t) => a + (t.tipo === 'compra' ? +t.qty : -t.qty), 0);
    if (q <= 1e-9) continue;
    const bar = lastLE(historicos[tk], cut);
    const lastBuy = trades.filter(t => t.ticker === tk && t.tipo === 'compra' && t.date <= cut).sort((a, b) => b.date.localeCompare(a.date))[0];
    const precio = bar?.close ?? (lastBuy ? +lastBuy.price : 0);
    const valor = precio * f(tk, q);
    const moneda = cur[tk];
    tenencia.push({ ticker: tk, nombre: port.find(p => p.ticker === tk)?.name || lastBuy?.name || tk, moneda, cantidad: q, precio, fechaPrecio: bar?.date || lastBuy?.date, valor, valorARS: moneda === 'USD' ? (tcCierre ? valor * tcCierre : null) : valor, valorUSD: moneda === 'USD' ? valor : (tcCierre ? valor / tcCierre : null) });
  }

  const sum = (arr, k) => arr.reduce((a, x) => a + (x[k] || 0), 0);
  return { year: y, fechaCorte: cut, tcCierre, ventas, cobros, tenencia,
    totales: { resultadoUSD: sum(ventas, 'resultadoUSD'), cobrosUSD: sum(cobros, 'montoUSD'), tenenciaUSD: sum(tenencia, 'valorUSD'), tenenciaARS: sum(tenencia, 'valorARS') } };
}

export function taxReportCSV(r) {
  const n = (v, d = 2) => v == null || isNaN(v) ? '' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
  const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const L = [];
  L.push(q(`Reporte anual ${r.year} — resumen informativo, no es asesoramiento impositivo. Montos en USD al CCL de cada fecha; costo de ventas por FIFO con comisiones.`));
  L.push('');
  L.push(q('VENTAS DEL AÑO'));
  L.push(['Fecha', 'Ticker', 'Moneda', 'Cantidad', 'Precio', 'Comisión', 'Neto cobrado', 'Costo FIFO', 'Resultado', 'Neto USD', 'Costo USD', 'Resultado USD'].map(q).join(';'));
  for (const v of r.ventas) L.push([v.fecha, v.ticker, v.moneda, n(v.cantidad, 4), n(v.precio, 4), n(v.comision), n(v.neto), n(v.costo), n(v.resultado), n(v.netoUSD), n(v.costoUSD), n(v.resultadoUSD)].map((x, i) => i < 3 ? q(x) : x).join(';') + (v.sinCosto ? ';' + q('Venta mayor a las compras registradas') : ''));
  L.push([q('Total resultado USD'), '', '', '', '', '', '', '', '', '', '', n(r.totales.resultadoUSD)].join(';'));
  L.push('');
  L.push(q('CUPONES Y AMORTIZACIONES COBRADOS'));
  L.push(['Fecha', 'Ticker', 'Tipo', 'Moneda', 'Nominales', 'Monto', 'Monto USD'].map(q).join(';'));
  for (const c of r.cobros) L.push([q(c.fecha), q(c.ticker), q(c.tipo), q(c.moneda), n(c.nominales, 0), n(c.monto), n(c.montoUSD)].join(';'));
  L.push([q('Total cobrado USD'), '', '', '', '', '', n(r.totales.cobrosUSD)].join(';'));
  L.push('');
  L.push(q(`TENENCIA AL ${r.fechaCorte.split('-').reverse().join('/')} (CCL ${n(r.tcCierre)})`));
  L.push(['Ticker', 'Nombre', 'Moneda', 'Cantidad', 'Precio', 'Fecha precio', 'Valuación moneda original', 'Valuación ARS', 'Valuación USD'].map(q).join(';'));
  for (const t of r.tenencia) L.push([q(t.ticker), q(t.nombre), q(t.moneda), n(t.cantidad, 4), n(t.precio, 4), q(t.fechaPrecio), n(t.valor), n(t.valorARS), n(t.valorUSD)].join(';'));
  L.push([q('Total'), '', '', '', '', '', '', n(r.totales.tenenciaARS), n(r.totales.tenenciaUSD)].join(';'));
  return '﻿' + L.join('\n');
}
