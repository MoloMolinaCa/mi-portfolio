/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";

// Input numérico con formato es-AR (1.234.567,89) mientras se escribe.
// onChange recibe {target:{value}} con el número en formato JS ("1234567.89"), igual que un input type=number.
const toDisplay = (raw) => {
  if (raw === "" || raw == null) return "";
  const s = String(raw);
  const neg = s.startsWith("-");
  const [int, dec] = s.replace("-", "").split(".");
  const intFmt = (int || "0").replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "-" : "") + intFmt + (dec !== undefined ? "," + dec : "");
};

const toRaw = (text) => {
  const neg = text.trim().startsWith("-");
  const clean = text.replace(/[^\d,]/g, "");
  const [int, ...rest] = clean.split(",");
  const dec = rest.join("");
  if (!int && !rest.length) return neg ? "-" : "";
  return (neg ? "-" : "") + (int || "0") + (rest.length ? "." + dec : "");
};

export default function NumInput({ value, onChange, ...rest }) {
  const [text, setText] = useState(() => toDisplay(value));
  const ref = useRef(null);
  const caret = useRef(null);

  useEffect(() => {
    if (toRaw(text) !== String(value ?? "")) setText(toDisplay(value));
  }, [value]);

  useEffect(() => {
    if (caret.current == null || !ref.current) return;
    const digitsBefore = caret.current;
    let pos = 0, seen = 0;
    while (pos < text.length && seen < digitsBefore) { if (/[\d,\-]/.test(text[pos])) seen++; pos++; }
    ref.current.setSelectionRange(pos, pos);
    caret.current = null;
  }, [text]);

  const handle = (e) => {
    let t = e.target.value;
    const sel = e.target.selectionStart ?? t.length;
    // El punto que escribe el usuario (teclado de celu) es separador decimal si todavía no hay coma
    if (t.length === text.length + 1) {
      if (t[sel - 1] === "." && !text.includes(",")) t = t.slice(0, sel - 1) + "," + t.slice(sel);
    } else if (!t.includes(",") && (t.match(/\./g) || []).length === 1 && !/\.\d{3}$/.test(t)) {
      // Texto pegado tipo "1234.5": un único punto que no es de miles es el decimal
      t = t.replace(".", ",");
    }
    const raw = toRaw(t);
    caret.current = (t.slice(0, sel).match(/[\d,\-]/g) || []).length;
    setText(toDisplay(raw === "-" ? "" : raw) || (raw === "-" ? "-" : ""));
    if (raw !== "-") onChange && onChange({ target: { value: raw } });
  };

  const { type, step, min, max, ...inputProps } = rest;
  return <input ref={ref} type="text" inputMode="decimal" autoComplete="off" value={text} onChange={handle} {...inputProps} />;
}
