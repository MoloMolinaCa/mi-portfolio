/* eslint-disable */
// Las operaciones son la fuente de verdad de las cantidades: la tenencia se calcula desde ellas.

const EPS = 1e-9;
// Mismo día: primero compras, después ventas (una venta del día puede usar lo comprado ese día)
const byDate = (a, b) => a.date.localeCompare(b.date) || (a.tipo === b.tipo ? 0 : a.tipo === 'compra' ? -1 : 1) || (a.ts || 0) - (b.ts || 0);

export function holdingsFromTrades(trades) {
  const q = {};
  for (const t of trades || []) q[t.ticker] = (q[t.ticker] || 0) + (t.tipo === 'compra' ? +t.qty : -t.qty);
  return q;
}

// Ventas que dejan la tenencia en negativo en algún momento (venta sin compra, o mayor a lo que había)
export function tradeProblems(trades) {
  const q = {}, out = [];
  for (const t of [...(trades || [])].sort(byDate)) {
    q[t.ticker] = (q[t.ticker] || 0) + (t.tipo === 'compra' ? +t.qty : -t.qty);
    if (q[t.ticker] < -EPS && !out.some(p => p.ticker === t.ticker))
      out.push({ ticker: t.ticker, date: t.date, faltante: -q[t.ticker] });
  }
  return out;
}

// Máximo que se puede vender de un ticker en una fecha sin dejar negativa la tenencia ese día ni después
export function maxSellable(trades, ticker, date, excludeId = null) {
  const ts = (trades || []).filter(t => t.ticker === ticker && t.id !== excludeId).sort(byDate);
  let q = 0, min = Infinity;
  for (const t of ts) {
    q += t.tipo === 'compra' ? +t.qty : -t.qty;
    if (t.date >= date) min = Math.min(min, q);
  }
  const atDate = ts.filter(t => t.date <= date).reduce((a, t) => a + (t.tipo === 'compra' ? +t.qty : -t.qty), 0);
  return Math.max(0, Math.min(atDate, min));
}
