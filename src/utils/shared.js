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
