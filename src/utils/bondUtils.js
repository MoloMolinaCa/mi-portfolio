/* eslint-disable */
import { SEED_BOND_FLOWS } from '../constants/bondFlows';

export function computeBondFlowsDelta(flows) {
  const delta = {};
  Object.entries(flows).forEach(([ticker, items]) => {
    if (!Array.isArray(items)) return;
    const seedItems = SEED_BOND_FLOWS[ticker];
    if (!seedItems) { delta[ticker] = items; return; }
    const seedMap = Object.fromEntries(seedItems.map(x => [x.id, x]));
    const modified = items.filter(item => {
      const seed = seedMap[item.id];
      if (!seed) return true;
      return item.cobrado !== seed.cobrado || item.fechaCobro !== seed.fechaCobro || item.monto !== seed.monto;
    });
    if (modified.length > 0) delta[ticker] = modified;
  });
  return delta;
}

export function expandBondFlowsDelta(delta) {
  if (!delta || typeof delta !== 'object') return {...SEED_BOND_FLOWS};
  const result = {...SEED_BOND_FLOWS};
  Object.entries(delta).forEach(([ticker, modItems]) => {
    if (!Array.isArray(modItems)) return;
    const seedItems = SEED_BOND_FLOWS[ticker];
    if (!seedItems) { result[ticker] = modItems; return; }
    const modMap = Object.fromEntries(modItems.map(x => [x.id, x]));
    result[ticker] = seedItems.map(item => modMap[item.id] ? {...item, ...modMap[item.id]} : item);
  });
  return result;
}
