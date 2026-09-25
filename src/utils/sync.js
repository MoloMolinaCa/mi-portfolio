/* eslint-disable */
// Merge de 3 vías entre la última versión sincronizada (base), lo local y lo del servidor.
// Gana el servidor salvo en lo que este dispositivo cambió desde la base (altas, ediciones, bajas).

const keyOf = x => (x && x.id != null) ? String(x.id) : JSON.stringify(x);
const byKey = arr => new Map((arr || []).map(x => [keyOf(x), x]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function merge3Arr(base, local, server) {
  const B = byKey(base), L = byKey(local);
  const out = byKey(server);
  for (const [k, x] of L) {
    const b = B.get(k);
    if (!b || !same(b, x)) out.set(k, x);
  }
  for (const k of B.keys()) if (!L.has(k)) out.delete(k);
  return [...out.values()];
}

function merge3Obj(base, local, server) {
  const out = { ...(server || {}) };
  for (const k of Object.keys(local || {})) if (!same(local[k], base?.[k])) out[k] = local[k];
  for (const k of Object.keys(base || {})) if (!(k in (local || {}))) delete out[k];
  return out;
}

const flatDelta = d => Object.entries(d || {}).flatMap(([tk, items]) => (items || []).map(it => ({ id: tk + '|' + it.id, tk, it })));
const unflatDelta = arr => { const o = {}; for (const { tk, it } of arr) (o[tk] = o[tk] || []).push(it); return o; };

export function mergeSnapshots(base, local, server) {
  return {
    port: merge3Arr(base.port, local.port, server.port),
    trades: merge3Arr(base.trades, local.trades, server.trades),
    bondFlowsDelta: unflatDelta(merge3Arr(flatDelta(base.bondFlowsDelta), flatDelta(local.bondFlowsDelta), flatDelta(server.bondFlowsDelta))),
    bondMeta: merge3Obj(base.bondMeta, local.bondMeta, server.bondMeta),
  };
}

export const sameSnapshot = same;
