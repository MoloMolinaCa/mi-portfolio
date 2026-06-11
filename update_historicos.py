"""
update_historicos.py v2
Descarga historico de precios para todos los tickers del portfolio.
Los tickers se leen dinamicamente desde el sync endpoint de la app.
Si no esta disponible, usa portfolio_tickers.json como fallback.
Fuentes:
- BYMA open data: acciones AR, bonos, CEDEARs
- yfinance: benchmarks (^GSPC, ^TNX)
- ArgentinaDatos: CCL y MEP historico
- estadisticasbcra.com: CER historico

v2: Deteccion automatica de splits en CEDEARs.
    Si al mergear barras detecta discontinuidad en un CEDEAR,
    re-descarga el ticker completo desde Yahoo (split-adjusted).
"""
import json, os, time, math
from datetime import datetime, timedelta
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

DAYS_HISTORY    = 365 * 3
OUTPUT_FILE     = "public/historicos.json"
TICKERS_FILE    = "public/portfolio_tickers.json"

CER_TOKEN = os.environ.get("CER_TOKEN", "")

YAHOO_TICKERS = {
    "^GSPC": "sp500",
    "^TNX":  "t10y",
}

BYMA_TICKERS_FALLBACK = [
    "TZXD6","TZX27","TLCUD","AO27D","GD38D",
    "TXAR","YPFD","GLD","NU","SPY","META","MSFT","VIST",
]

# CEDEARs conocidos - solo estos se chequean por splits
CEDEAR_TICKERS = {
    "SPY","META","MSFT","GLD","NU","VIST","MELI","AAPL","AMZN",
    "GOOGL","TSLA","NVDA","BABA","KO","DIS","NFLX","BA","JPM","WMT","PG",
}

# Log de splits detectados durante la ejecucion
split_log = []


# ── Carga de tickers ─────────────────────────────────────────────────────────
def load_portfolio_tickers():
    """Lee tickers desde el sync endpoint (dinamico) + portfolio_tickers.json (fallback)."""
    tickers = set()
    # 1. Sync endpoint
    try:
        r = requests.get("https://portafolio-rendimientos.vercel.app/api/sync", timeout=10)
        if r.ok:
            data = r.json()
            port = data.get("port", [])
            trades = data.get("trades", [])
            for item in port:
                t = item.get("ticker", "")
                if t:
                    tickers.add(t)
            for item in trades:
                t = item.get("ticker", "")
                if t:
                    tickers.add(t)
            if tickers:
                print(f"  Sync endpoint: {len(tickers)} tickers")
    except Exception as e:
        print(f"  ! Sync endpoint: {e}")
    # 2. Fallback
    if os.path.exists(TICKERS_FILE):
        try:
            with open(TICKERS_FILE) as f:
                data = json.load(f)
                for t in data.get("tickers", []):
                    tickers.add(t)
        except:
            pass
    # 3. Hardcoded fallback
    if not tickers:
        tickers = set(BYMA_TICKERS_FALLBACK)
    # Excluir FCI
    tickers = {t for t in tickers if not t.startswith("FIMA")}
    print(f"  Total tickers: {sorted(tickers)}")
    return sorted(tickers)


# ── Carga de historico existente ─────────────────────────────────────────────
def load_existing_historicos():
    """Carga el historicos.json existente para preservar datos historicos."""
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE) as f:
                data = json.load(f)
            print(f"  Historico existente: {len(data)} tickers, {sum(len(v) for v in data.values())} pts")
            return data
        except Exception as e:
            print(f"  ! Error leyendo historico existente: {e}")
    return {}


# ── BYMA ────────────────────────────────────────────────────────────────────
def byma_get_series(symbol, start, end):
    url = "https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/chart/historical-series/history"
    for sett in ["24HS", "48HS", "CDO"]:
        sym = f"{symbol} {sett}"
        params = {"symbol": sym, "resolution": "D", "from": int(start.timestamp()), "to": int(end.timestamp())}
        try:
            r = requests.get(url, params=params, verify=False, timeout=10)
            d = r.json()
            if d.get("s") == "ok" and d.get("t"):
                bars = [{"date": datetime.fromtimestamp(t).strftime("%Y-%m-%d"), "close": round(float(c), 4)}
                        for t, c in zip(d["t"], d["c"]) if c is not None]
                if bars:
                    print(f"  BYMA {sym} ({sett}): {len(bars)} pts")
                    return bars
        except Exception as e:
            print(f"  ! BYMA {sym}: {e}")
        time.sleep(0.3)
    print(f"  x BYMA {symbol}: sin datos")
    return []


# ── Yahoo Finance ─────────────────────────────────────────────────────────
def yahoo_get_series(symbol, start, end):
    try:
        import yfinance as yf
        df = yf.download(symbol, start=start.strftime("%Y-%m-%d"),
                         end=end.strftime("%Y-%m-%d"), progress=False, auto_adjust=True)
        if df.empty:
            print(f"  x Yahoo {symbol}: sin datos")
            return []
        bars = []
        for date, row in df.iterrows():
            close = row["Close"]
            close = float(close.iloc[0]) if hasattr(close, 'iloc') else float(close)
            bars.append({"date": date.strftime("%Y-%m-%d"), "close": round(close, 4)})
        print(f"  Yahoo {symbol}: {len(bars)} pts")
        return bars
    except Exception as e:
        print(f"  x Yahoo {symbol}: {e}")
        return []


# ── Yahoo re-download completo (para splits) ────────────────────────────
def yahoo_redownload_full(ticker, start, end):
    """Re-descarga historico completo de un CEDEAR desde Yahoo (split-adjusted).
    Intenta con .BA primero (BYMA en Yahoo), luego sin sufijo (US)."""
    for suffix in [".BA", ""]:
        sym = ticker + suffix
        bars = yahoo_get_series(sym, start, end)
        if bars and len(bars) > 10:
            print(f"  >> Re-download completo {sym}: {len(bars)} pts (split-adjusted)")
            return bars
    return []


# ── ArgentinaDatos FX ──────────────────────────────────────────────────────
def argentinadatos_get_fx(tipo, start, end):
    try:
        r = requests.get(
            f"https://api.argentinadatos.com/v1/cotizaciones/dolares/{tipo}",
            timeout=15
        )
        arr = r.json()
        bars = []
        for x in arr:
            date  = x.get("fecha", "")
            price = float(x.get("venta") or x.get("compra") or 0)
            if date and price > 0:
                d = datetime.fromisoformat(date)
                if start <= d <= end:
                    bars.append({"date": date, "close": round(price, 2)})
        bars.sort(key=lambda x: x["date"])
        print(f"  {tipo} (ArgentinaDatos): {len(bars)} pts")
        return bars
    except Exception as e:
        print(f"  x {tipo}: {e}")
        return []


# ── BCRA CER XLS ──────────────────────────────────────────────────────────
def bcra_get_cer_xls():
    try:
        import io
        import pandas as pd
    except ImportError:
        print("  ! CER XLS: pandas no disponible")
        return []
    return []


# ── ArgentinaDatos UVA ─────────────────────────────────────────────────────
def argentinadatos_get_uva():
    try:
        r = requests.get(
            "https://api.argentinadatos.com/v1/finanzas/indices/uva",
            timeout=15
        )
        if not r.ok:
            print(f"  x UVA: status {r.status_code}")
            return []
        arr = r.json()
        bars = []
        for x in arr:
            date  = str(x.get("fecha", "")).strip()[:10]
            valor = float(x.get("valor", 0))
            if date and valor > 0:
                bars.append({"date": date, "close": round(valor, 6)})
        bars.sort(key=lambda x: x["date"])
        print(f"  UVA (argentinadatos): {len(bars)} pts, ultimo: {bars[-1] if bars else chr(8212)}")
        return bars
    except Exception as e:
        print(f"  x UVA: {e}")
        return []


# ── estadisticasbcra CER ───────────────────────────────────────────────────
def estadisticasbcra_get_cer():
    bars_bcra_privado = []
    if CER_TOKEN:
        try:
            r = requests.get(
                "https://api.estadisticasbcra.com/cer",
                headers={"Authorization": f"Bearer {CER_TOKEN}"},
                timeout=15
            )
            if r.ok:
                arr = r.json()
                for x in arr:
                    date  = str(x.get("d", "")).strip()
                    valor = float(x.get("v", 0))
                    if date and valor > 0:
                        bars_bcra_privado.append({"date": date, "close": round(valor, 6)})
                bars_bcra_privado.sort(key=lambda x: x["date"])
        except Exception as e:
            print(f"  ! estadisticasbcra.com: {e}")
    return bars_bcra_privado


# ── Deteccion de splits (NUEVO v2) ─────────────────────────────────────────
def detect_split_in_merge(existing, new_bars, ticker):
    """Detecta split comparando precios entre barras viejas y nuevas.
    Solo chequea CEDEARs. Retorna dict con info del split o None.

    Metodo 1: busca fechas en comun donde el precio viejo es ~Nx el nuevo
              (Yahoo re-entrega barras historicas ya ajustadas por el split)
    Metodo 2: compara ultima barra existente vs primera barra nueva posterior
              (detecta split que ocurrio entre la ultima descarga y ahora)
    """
    if ticker not in CEDEAR_TICKERS or not existing or not new_bars:
        return None

    old_by_date = {b["date"]: b["close"] for b in existing}
    new_by_date = {b["date"]: b["close"] for b in new_bars}

    # Metodo 1: fechas en comun
    for date in sorted(set(old_by_date) & set(new_by_date)):
        op = old_by_date[date]
        np_ = new_by_date[date]
        if op <= 0 or np_ <= 0:
            continue
        ratio = op / np_
        rounded = round(ratio)
        if 2 <= rounded <= 20 and abs(ratio - rounded) / rounded < 0.15:
            return {"ratio": rounded, "date": date, "old_price": op, "new_price": np_}

    # Metodo 2: ultima existente vs primera nueva posterior
    last = existing[-1]
    later = [b for b in new_bars if b["date"] > last["date"]]
    if later and last["close"] > 0 and later[0]["close"] > 0:
        ratio = last["close"] / later[0]["close"]
        rounded = round(ratio)
        if 2 <= rounded <= 20 and abs(ratio - rounded) / rounded < 0.15:
            return {"ratio": rounded, "date": later[0]["date"],
                    "old_price": last["close"], "new_price": later[0]["close"]}

    return None


# ── Merge de barras (MODIFICADO v2) ────────────────────────────────────────
def merge_bars(existing, new_bars, ticker=""):
    """Mergea barras existentes con nuevas.
    Para CEDEARs: detecta splits y re-descarga completo desde Yahoo."""

    # 1. Deteccion de split
    split = detect_split_in_merge(existing, new_bars, ticker)
    if split:
        r = split["ratio"]
        d = split["date"]
        op = split["old_price"]
        np_ = split["new_price"]
        print(f"  !! SPLIT detectado en {ticker}: {r}:1 el {d}")
        print(f"     Precio viejo: {op:.2f} -> Precio nuevo: {np_:.2f}")
        split_log.append(dict(**split, ticker=ticker))

        # Re-descargar completo desde Yahoo (entrega datos split-adjusted)
        end_dt = datetime.now()
        start_dt = end_dt - timedelta(days=DAYS_HISTORY)
        fresh = yahoo_redownload_full(ticker, start_dt, end_dt)
        if fresh and len(fresh) > 10:
            print(f"  >> {ticker}: reemplazado con {len(fresh)} barras split-adjusted")
            return fresh
        else:
            print(f"  !! {ticker}: Yahoo no devolvio datos, usando barras nuevas")
            return new_bars if new_bars else existing

    # 2. Merge normal (sin split)
    if not existing:
        return new_bars
    existing_dates = {b["date"] for b in existing}
    merged = list(existing)
    for b in new_bars:
        if b["date"] not in existing_dates:
            merged.append(b)
    merged.sort(key=lambda x: x["date"])
    return merged


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    end   = datetime.now()
    start = end - timedelta(days=DAYS_HISTORY)

    print(f"=== update_historicos v2 === {end.strftime('%Y-%m-%d %H:%M')}")
    print(f"Rango: {start.strftime('%Y-%m-%d')} a {end.strftime('%Y-%m-%d')}")

    # 1. Cargar tickers
    print("\n[1] Cargando tickers...")
    tickers = load_portfolio_tickers()

    # 2. Cargar historico existente
    print("\n[2] Cargando historico existente...")
    data = load_existing_historicos()

    # 3. BYMA (acciones AR, bonos, CEDEARs)
    print("\n[3] Descargando de BYMA...")
    for ticker in tickers:
        new_bars = byma_get_series(ticker, start, end)
        existing = data.get(ticker, [])
        if isinstance(existing, list):
            data[ticker] = merge_bars(existing, new_bars, ticker)
        else:
            data[ticker] = new_bars
        time.sleep(0.3)

    # 4. Yahoo benchmarks
    print("\n[4] Yahoo benchmarks...")
    for ysym, key in YAHOO_TICKERS.items():
        new_bars = yahoo_get_series(ysym, start, end)
        existing = data.get(key, [])
        if isinstance(existing, list):
            data[key] = merge_bars(existing, new_bars, key)
        else:
            data[key] = new_bars

    # 5. FX
    print("\n[5] Tipo de cambio...")
    for tipo, key in [("contadoconliqui", "CCL"), ("bolsa", "MEP")]:
        new_bars = argentinadatos_get_fx(tipo, start, end)
        existing = data.get(key, [])
        if isinstance(existing, list):
            data[key] = merge_bars(existing, new_bars, key)
        else:
            data[key] = new_bars

    # 6. CER
    print("\n[6] CER...")
    cer_bars = estadisticasbcra_get_cer()
    if cer_bars:
        existing = data.get("CER", [])
        if isinstance(existing, list):
            data["CER"] = merge_bars(existing, cer_bars, "CER")
        else:
            data["CER"] = cer_bars

    # UVA como proxy/backup del CER
    uva_bars = argentinadatos_get_uva()
    if uva_bars:
        existing = data.get("UVA", [])
        if isinstance(existing, list):
            data["UVA"] = merge_bars(existing, uva_bars, "UVA")
        else:
            data["UVA"] = uva_bars

    # 7. Guardar
    print(f"\n[7] Guardando {OUTPUT_FILE}...")
    # Limpiar entries vacias
    data = {k: v for k, v in data.items() if v and isinstance(v, list) and len(v) > 0}
    # Limpiar NaN/Inf que no son JSON valido (fix: NaN rompe el parser del browser)
    def clean_nans(obj):
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return None
        if isinstance(obj, dict):
            return {k: clean_nans(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [clean_nans(x) for x in obj]
        return obj
    data = clean_nans(data)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    size_kb = os.path.getsize(OUTPUT_FILE) / 1024
    total_pts = sum(len(v) for v in data.values())
    print(f"  {len(data)} tickers, {total_pts} pts, {size_kb:.0f} KB")

    # 8. Resumen de splits
    if split_log:
        print(f"\n[SPLITS] {len(split_log)} split(s) detectado(s) y corregido(s):")
        for s in split_log:
            tk = s["ticker"]
            rt = s["ratio"]
            dt = s["date"]
            op = s["old_price"]
            np_ = s["new_price"]
            print(f"  - {tk}: {rt}:1 el {dt} ({op:.2f} -> {np_:.2f})")
    else:
        print("\n[SPLITS] Ningun split detectado")

    print("\n=== Listo ===")


if __name__ == "__main__":
    main()
