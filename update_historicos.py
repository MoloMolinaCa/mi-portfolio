"""
update_historicos.py
Descarga histórico de precios para todos los tickers del portfolio.
Los tickers se leen dinámicamente desde public/portfolio_tickers.json
generado por la app React. Si no existe ese archivo, usa la lista hardcodeada.

Fuentes:
  - BYMA open data: acciones AR, bonos, CEDEARs
  - yfinance: benchmarks (^GSPC, ^TNX)
  - ArgentinaDatos: CCL y MEP histórico
  - estadisticasbcra.com: CER histórico
"""
import json, os, time
from datetime import datetime, timedelta
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

DAYS_HISTORY    = 365 * 3
OUTPUT_FILE     = "public/historicos.json"
TICKERS_FILE    = "public/portfolio_tickers.json"

# Token estadisticasbcra.com — se lee desde variable de entorno CER_TOKEN
# En GitHub Actions: Settings → Secrets → Actions → agregar CER_TOKEN
CER_TOKEN = os.environ.get("CER_TOKEN", "")

# Tickers fijos que siempre se descargan (benchmarks y FX no vienen del portfolio)
YAHOO_TICKERS = {
    "^GSPC": "sp500",
    "^TNX":  "t10y",
}

# Fallback hardcodeado si no existe portfolio_tickers.json
BYMA_TICKERS_FALLBACK = [
    "TZXD6","TZX27","TLCUD","AO27D","GD38D",
    "TXAR","YPFD","GLD","NU","SPY","META","MSFT","VIST",
]

def load_portfolio_tickers():
    """Lee los tickers desde portfolio_tickers.json generado por la app."""
    if os.path.exists(TICKERS_FILE):
        try:
            with open(TICKERS_FILE) as f:
                data = json.load(f)
            tickers = data.get("tickers", [])
            if tickers:
                print(f"  ✓ Leyendo {len(tickers)} tickers desde {TICKERS_FILE}")
                return tickers
        except Exception as e:
            print(f"  ! Error leyendo {TICKERS_FILE}: {e}")
    print(f"  ⚠ {TICKERS_FILE} no encontrado — usando lista hardcodeada")
    return BYMA_TICKERS_FALLBACK

def load_existing_historicos():
    """Carga el historicos.json existente para preservar datos históricos."""
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE) as f:
                data = json.load(f)
            print(f"  ✓ Histórico existente: {len(data)} tickers, {sum(len(v) for v in data.values())} pts")
            return data
        except Exception as e:
            print(f"  ! Error leyendo histórico existente: {e}")
    return {}

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
                    print(f"  ✓ BYMA {symbol} ({sett}): {len(bars)} pts")
                    return bars
        except Exception as e:
            print(f"  ! BYMA {symbol} {sett}: {e}")
        time.sleep(0.3)
    print(f"  ✗ BYMA {symbol}: sin datos")
    return []

def yahoo_get_series(symbol, start, end):
    try:
        import yfinance as yf
        df = yf.download(symbol, start=start.strftime("%Y-%m-%d"),
                         end=end.strftime("%Y-%m-%d"), progress=False, auto_adjust=True)
        if df.empty:
            print(f"  ✗ Yahoo {symbol}: sin datos")
            return []
        bars = []
        for date, row in df.iterrows():
            close = row["Close"]
            close = float(close.iloc[0]) if hasattr(close, 'iloc') else float(close)
            bars.append({"date": date.strftime("%Y-%m-%d"), "close": round(close, 4)})
        print(f"  ✓ Yahoo {symbol}: {len(bars)} pts")
        return bars
    except Exception as e:
        print(f"  ✗ Yahoo {symbol}: {e}")
        return []

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
        print(f"  ✓ {tipo} (ArgentinaDatos): {len(bars)} pts")
        return bars
    except Exception as e:
        print(f"  ✗ {tipo}: {e}")
        return []

def bcra_get_cer():
    """
    Descarga la serie CER desde la API oficial del BCRA (sin token, pública).
    Variable 3540 = CER diario.
    Pagina de a 3000 registros por año para obtener la serie completa.
    Respuesta: {results:[{fecha,valor},...]}
    """
    bars = []
    seen_dates = set()
    # Descargar desde 2002 hasta hoy en bloques anuales
    start_year = 2002
    end_year = datetime.now().year
    base_url = "https://api.bcra.gob.ar/estadisticas/v1/datosvariable/3540"

    for year in range(start_year, end_year + 1):
        desde = f"{year}-01-01"
        hasta = f"{year}-12-31" if year < end_year else datetime.now().strftime("%Y-%m-%d")
        url = f"{base_url}/{desde}/{hasta}"
        try:
            r = requests.get(url, timeout=15, headers={"Accept": "application/json"})
            if not r.ok:
                print(f"  ! CER BCRA {year}: status {r.status_code}")
                continue
            data = r.json()
            results = data.get("results", data.get("data", []))
            for x in results:
                date  = str(x.get("fecha", "")).strip()[:10]
                valor = float(x.get("valor", 0))
                if date and valor > 0 and date not in seen_dates:
                    bars.append({"date": date, "close": round(valor, 6)})
                    seen_dates.add(date)
        except Exception as e:
            print(f"  ! CER BCRA {year}: {e}")
        time.sleep(0.2)

    bars.sort(key=lambda x: x["date"])
    if bars:
        print(f"  ✓ CER (BCRA oficial): {len(bars)} pts, último: {bars[-1]}")
    else:
        print(f"  ✗ CER BCRA: sin datos")
    return bars


def estadisticasbcra_get_cer():
    """
    Descarga la serie CER desde estadisticasbcra.com (requiere token).
    Fallback: si no trae datos recientes, complementa con BCRA oficial.
    """
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

    # Verificar si los datos llegan hasta hoy (menos de 30 días de atraso)
    today = datetime.now().strftime("%Y-%m-%d")
    cutoff = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    ultimo = bars_bcra_privado[-1]["date"] if bars_bcra_privado else ""

    if ultimo >= cutoff:
        print(f"  ✓ CER (estadisticasbcra): {len(bars_bcra_privado)} pts, último: {bars_bcra_privado[-1]}")
        return bars_bcra_privado

    # Si está desactualizado, complementar con BCRA oficial
    print(f"  ⚠ estadisticasbcra cortado en {ultimo} — complementando con BCRA oficial")
    bars_oficial = bcra_get_cer()

    if not bars_oficial:
        return bars_bcra_privado

    # Merge: usar privado como base, agregar fechas nuevas del oficial
    seen = {b["date"] for b in bars_bcra_privado}
    combined = list(bars_bcra_privado)
    for b in bars_oficial:
        if b["date"] not in seen:
            combined.append(b)
            seen.add(b["date"])
    combined.sort(key=lambda x: x["date"])
    print(f"  ✓ CER combinado: {len(combined)} pts, último: {combined[-1]}")
    return combined

def merge_bars(existing, new_bars):
    """Combina barras existentes con nuevas, sin duplicar fechas. Gana la nueva."""
    if not existing:
        return new_bars
    existing_dates = {b["date"] for b in existing}
    merged = list(existing)
    for b in new_bars:
        if b["date"] not in existing_dates:
            merged.append(b)
    merged.sort(key=lambda x: x["date"])
    return merged

def main():
    end   = datetime.now()
    start = end - timedelta(days=DAYS_HISTORY)

    print(f"\n=== update_historicos.py ===")
    print(f"Período: {start.date()} → {end.date()}")
    print(f"Output:  {OUTPUT_FILE}\n")

    # Cargar histórico existente (para preservar datos de tickers vendidos)
    print("── Cargando histórico existente ──────")
    result = load_existing_historicos()

    # Leer tickers del portfolio dinámicamente
    print("\n── Leyendo tickers del portfolio ─────")
    byma_tickers = load_portfolio_tickers()
    # Filtrar FCIs (no están en BYMA open data) y tickers especiales
    fci_prefixes = ("FIMA-", "BICE-", "SCHRO", "ICBC-")
    byma_tickers = [t for t in byma_tickers if not any(t.startswith(p) for p in fci_prefixes)]

    # BYMA tickers del portfolio
    print("\n── BYMA ──────────────────────────────")
    for ticker in byma_tickers:
        new_bars = byma_get_series(ticker, start, end)
        if new_bars:
            result[ticker] = merge_bars(result.get(ticker, []), new_bars)
        elif ticker not in result:
            print(f"  ⚠ {ticker}: sin datos BYMA y sin histórico previo")

    # Yahoo benchmarks
    print("\n── Yahoo Finance (benchmarks) ────────")
    for sym, key in YAHOO_TICKERS.items():
        new_bars = yahoo_get_series(sym, start, end)
        if new_bars:
            result[key] = merge_bars(result.get(key, []), new_bars)

    # FX histórico
    print("\n── FX histórico (ArgentinaDatos) ─────")
    ccl = argentinadatos_get_fx("contadoconliqui", start, end)
    if ccl:
        result["CCL"] = merge_bars(result.get("CCL", []), ccl)

    mep = argentinadatos_get_fx("bolsa", start, end)
    if mep:
        result["MEP"] = merge_bars(result.get("MEP", []), mep)

    # CER histórico completo
    print("\n── CER (estadisticasbcra.com) ────────")
    cer = estadisticasbcra_get_cer()
    if cer:
        result["cer"] = merge_bars(result.get("cer", []), cer)

    # Guardar
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(result, f, separators=(",", ":"))

    size_kb = os.path.getsize(OUTPUT_FILE) / 1024
    print(f"\n✓ Guardado {OUTPUT_FILE} ({size_kb:.1f} KB)")
    print(f"  Tickers: {sorted(result.keys())}")
    print(f"  Total puntos: {sum(len(v) for v in result.values())}")

if __name__ == "__main__":
    main()
