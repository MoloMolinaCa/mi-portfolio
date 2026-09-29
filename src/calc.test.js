/* eslint-disable */
// Controles de consistencia que corren antes de cada build (npm run build).
// Usan los datos reales del repo: si un cambio rompe los cálculos, no se publica.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { calcTWR, calcPeriodPnL, setKnownBonds, isBondTicker } from './utils/calcUtils';
import { expandBondFlowsDelta } from './utils/bondUtils';
import { calcVNR } from './utils/shared';
import { SEED_BOND_META } from './constants/bondFlows';
import { mergeSnapshots, sameSnapshot } from './utils/sync';
import { tradeProblems, maxSellable, holdingsFromTrades } from './utils/positions';
import { toRaw, toDisplay } from './components/NumInput';
import { buildTaxReport, taxReportCSV } from './utils/taxReport';

const data = JSON.parse(fs.readFileSync(new URL('../public/portfolio_data.json', import.meta.url)));
const hist = JSON.parse(fs.readFileSync(new URL('../public/historicos.json', import.meta.url)));
setKnownBonds(data.port.filter(p => String(p.type).startsWith('bono')).map(p => p.ticker));
const bf = expandBondFlowsDelta(data.bondFlowsDelta);
const END = hist.CCL[hist.CCL.length - 1].date;
const FAR = '2099-01-01'; // "hoy" lejano: todo se valúa con históricos, sin precios live
const START = [...data.trades].map(t => t.date).sort()[0];
const DATES = [...new Set(hist.CCL.map(b => b.date))].filter(x => x >= START && x <= END).sort();
const T = [...data.trades].sort((a, b) => a.date.localeCompare(b.date));

// Reconstrucción independiente, día por día, del valor de la cartera y sus flujos (USD CCL)
const le = (b, x) => { let r = null; for (const y of b) { if (y.date <= x) r = y; else break; } return r; };
const ccl = x => le(hist.CCL, x).close;
const cur = {}; for (const t of T) cur[t.ticker] = String(t.currency).toUpperCase(); for (const p of data.port) cur[p.ticker] = String(p.buyCurrency).toUpperCase();
const usd = (tk, a, x) => cur[tk] === 'USD' ? a : a / ccl(x);
const qF = (tk, q) => isBondTicker(tk) ? q / 100 : q;
const price = (tk, x) => { const b = le(hist[tk] || [], x); if (b) return b.close; const lb = T.filter(t => t.ticker === tk && t.tipo === 'compra' && t.date <= x).pop(); return lb ? +lb.price : 0; };
const qtyAt = (tk, x) => T.reduce((a, t) => t.ticker === tk && t.date <= x ? a + (t.tipo === 'compra' ? +t.qty : -t.qty) : a, 0);
const coupon = (tk, f) => { const q = qtyAt(tk, f.fechaCobro); if (q <= 0) return 0; return usd(tk, f.tipo === 'amortizacion' ? f.monto * q / 100 : f.monto * q * calcVNR(bf[tk], f.fechaCobro, SEED_BOND_META?.[tk]?.vnrInicial ?? 100) / 10000, f.fechaCobro); };
function dailyGains(tickers) {
  let prevV = 0, prev = '0000', idx = 100, sum = 0;
  for (const x of DATES) {
    let V = 0, F = 0, C = 0;
    for (const tk of tickers) {
      const q = qtyAt(tk, x); if (q > 0) V += usd(tk, price(tk, x) * qF(tk, q), x);
      for (const t of T) if (t.ticker === tk && t.date > prev && t.date <= x) { const g = usd(tk, +t.price * qF(tk, +t.qty), t.date), c = usd(tk, +t.comision || 0, t.date); F += t.tipo === 'compra' ? g + c : -(g - c); }
      for (const f of bf[tk] || []) if (f.cobrado && f.fechaCobro > prev && f.fechaCobro <= x) C += coupon(tk, f);
    }
    sum += V - prevV - F + C;
    if (prevV > 0) idx *= (V - F + C) / prevV; else if (F > 0) idx *= (V + C) / F;
    prevV = V; prev = x;
  }
  return { idx, sum };
}
const allTickers = [...new Set(T.map(t => t.ticker))];
const twr = (dates) => calcTWR(dates, data.trades, data.port, hist, hist.CCL, hist.MEP || [], 'USD_CCL', 1600, {}, END, FAR, bf);
const pnl = (s) => calcPeriodPnL({ s, e: END, trades: data.trades, en: data.port, historicos: hist, bondFlows: bf, today: FAR });

describe('gráfico base 100 y P&L (datos reales)', () => {
  const app = twr(DATES);
  const ind = dailyGains(allTickers);
  const full = pnl('0000-01-01');

  it('la curva coincide con la reconstrucción independiente', () => {
    expect(app[app.length - 1].val).toBeCloseTo(ind.idx, 3);
  });
  it('las ganancias diarias de la curva suman el P&L total', () => {
    expect(ind.sum).toBeCloseTo(full.total, 2);
  });
  it('cada activo cuadra con Análisis (incluidos los vendidos)', () => {
    for (const tk of allTickers) expect(dailyGains([tk]).sum, tk).toBeCloseTo(full.byTicker[tk]?.pnl ?? 0, 2);
  });
  it('un período calculado solo coincide con su tramo de la curva anual', () => {
    for (const back of [30, 90]) {
      const s = DATES[Math.max(0, DATES.length - 1 - back)];
      const part = twr(DATES.filter(x => x >= s));
      const at = app.filter(p => p.date <= s).pop().val;
      // Tolerancia 0,005%: una operación el mismo día de inicio se mide distinto (precio de compra vs cierre previo)
      expect(part[part.length - 1].val / 100).toBeCloseTo(app[app.length - 1].val / at, 4);
    }
  });
});

describe('reporte impositivo', () => {
  const years = [...new Set(T.map(t => t.date.slice(0, 4)))];
  const reps = years.map(year => buildTaxReport({ year, trades: data.trades, port: data.port, historicos: hist, bondFlows: bf, today: END }));
  const full = pnl('0000-01-01');
  it('el resultado de un activo cerrado sin cupones coincide con Análisis', () => {
    const closed = allTickers.filter(tk => qtyAt(tk, END) <= 1e-9 && !(bf[tk] || []).some(f => f.cobrado));
    expect(closed.length).toBeGreaterThan(0);
    for (const tk of closed) {
      const res = reps.flatMap(r => r.ventas).filter(v => v.ticker === tk).reduce((a, v) => a + v.resultadoUSD, 0);
      expect(res, tk).toBeCloseTo(full.byTicker[tk].pnl, 2);
    }
  });
  it('la tenencia al cierre coincide con las operaciones y no hay ventas sin costo', () => {
    const r = reps[reps.length - 1];
    for (const t of r.tenencia) expect(t.cantidad, t.ticker).toBeCloseTo(qtyAt(t.ticker, r.fechaCorte), 6);
    expect(reps.flatMap(r => r.ventas).some(v => v.sinCosto)).toBe(false);
  });
});

describe('posiciones desde operaciones', () => {
  const trades = [
    { id: 1, ticker: 'X', tipo: 'compra', qty: 100, date: '2026-01-10' },
    { id: 2, ticker: 'X', tipo: 'venta', qty: 60, date: '2026-02-10' },
    { id: 3, ticker: 'X', tipo: 'compra', qty: 20, date: '2026-03-10' },
  ];
  it('calcula la tenencia', () => { expect(holdingsFromTrades(trades).X).toBe(60); });
  it('el tope de venta respeta las ventas posteriores', () => {
    expect(maxSellable(trades, 'X', '2026-01-15')).toBe(40);
    expect(maxSellable(trades, 'X', '2026-01-05')).toBe(0);
    expect(maxSellable(trades, 'X', '2026-03-15')).toBe(60);
  });
  it('detecta ventas sin tenencia', () => {
    expect(tradeProblems([...trades, { id: 4, ticker: 'Y', tipo: 'venta', qty: 5, date: '2026-01-01' }])).toEqual([{ ticker: 'Y', date: '2026-01-01', faltante: 5 }]);
  });
});

describe('sincronización entre dispositivos', () => {
  const base = { port: [{ id: 1, qty: 1 }], trades: [{ id: 1 }, { id: 2 }], bondFlowsDelta: { A: [{ id: 1, cobrado: false }] }, bondMeta: {} };
  it('combina altas, bajas y ediciones de cada lado', () => {
    const local = { ...base, trades: [...base.trades, { id: 3 }], bondFlowsDelta: { A: [{ id: 1, cobrado: true }] } };
    const server = { ...base, trades: [{ id: 1 }], port: [{ id: 1, qty: 5 }] };
    const m = mergeSnapshots(base, local, server);
    expect(m.trades.map(t => t.id).sort()).toEqual([1, 3]);
    expect(m.port[0].qty).toBe(5);
    expect(m.bondFlowsDelta.A[0].cobrado).toBe(true);
  });
  it('sin cambios locales gana el servidor', () => {
    const server = { ...base, trades: [] };
    expect(sameSnapshot(mergeSnapshots(base, base, server), server)).toBe(true);
  });
});

describe('formato de números', () => {
  it('muestra separadores es-AR', () => { expect(toDisplay('1234567.89')).toBe('1.234.567,89'); expect(toDisplay('12.')).toBe('12,'); });
  it('interpreta lo escrito', () => { expect(toRaw('1.234.567,89')).toBe('1234567.89'); expect(toRaw('0,05')).toBe('0.05'); });
});
