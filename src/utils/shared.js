/* eslint-disable */

export const ASSET_TYPES = {
  accion_ar: { label: "Acciones AR",  color: "#3B82F6", icon: "📈" },
  cedear:    { label: "CEDEARs",      color: "#10B981", icon: "🌎" },
  bono_ars:  { label: "Bonos ARS",    color: "#F59E0B", icon: "📜" },
  bono_usd:  { label: "Bonos USD",    color: "#F97316", icon: "💵" },
  fci_ars:   { label: "FCI Pesos",    color: "#8B5CF6", icon: "🏦" },
  fci_usd:   { label: "FCI Dólares",  color: "#A78BFA", icon: "💰" },
};

export function todayAR() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset() - 180);
  return d.toISOString().slice(0,10);
}

/**
 * Calcula el VNR (Valor Nominal Residual) de un bono en un momento dado.
 * VNR = vnrInicial - suma de amortizaciones confirmadas con fechaCobro < beforeDate
 * Retorna un porcentaje (ej: 87.5 significa VNR = 87.5% del VN original)
 */
export function calcVNR(flows, beforeDate, vnrInicial = 100) {
  if (!flows || !flows.length) return vnrInicial;
  const amortsPaid = flows.filter(
    f => f.tipo === 'amortizacion' && f.cobrado && f.fechaCobro && f.fechaCobro < beforeDate
  );
  const amortTotal = amortsPaid.reduce((a, f) => a + (f.monto || 0), 0);
  return Math.max(0, vnrInicial - amortTotal);
}
