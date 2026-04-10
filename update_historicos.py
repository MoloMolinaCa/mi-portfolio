"""
update_historicos.py
Descarga histórico de precios para todos los tickers del portfolio.
Fuentes:
  - BYMA open data: acciones AR, bonos, CEDEARs
  - yfinance: benchmarks (^GSPC, ^TNX)
  - ArgentinaDatos: CCL y MEP histórico
Guarda public/historicos.json con los tickers activos del portfolio.
"""
import json, os, time
from datetime import datetime, timedelta
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

DAYS_HISTORY = 365 * 3
OUTPUT_FILE  = "public/historicos.json"

BYMA_TICKERS = {
    "TZXD6": "TZXD6", "TZX27": "TZX27", "TLCUD": "TLCUD",
    "AO27D": "AO27D", "GD38D": "GD38D", "TXAR":  "TXAR",
    "YPFD":  "YPFD",  "GLD":   "GLD",   "NU":    "NU",
    "SPY":   "SPY",   "META":  "META",  "MSFT":  "MSFT",
    "VIST":  "VIST",
}

YAHOO_TICKERS = {
    "^GSPC": "sp500",
    "^TNX":  "t10y",
}

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
    """Descarga CCL o MEP histórico desde ArgentinaDatos.
       tipo: 'contadoconliqui' | 'bolsa'
    """
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

def main():
    end   = datetime.now()
    start = end - timedelta(days=DAYS_HISTORY)

    print(f"\n=== update_historicos.py ===")
    print(f"Período: {start.date()} → {end.date()}")
    print(f"Output:  {OUTPUT_FILE}\n")

    result = {}

    print("── BYMA ──────────────────────────────")
    for ticker, sym in BYMA_TICKERS.items():
        bars = byma_get_series(sym, start, end)
        if bars:
            result[ticker] = bars

    print("\n── Yahoo Finance (benchmarks) ────────")
    for sym, key in YAHOO_TICKERS.items():
        bars = yahoo_get_series(sym, start, end)
        if bars:
            result[key] = bars

    print("\n── FX histórico (ArgentinaDatos) ─────")
    ccl = argentinadatos_get_fx("contadoconliqui", start, end)
    if ccl:
        result["CCL"] = ccl

    mep = argentinadatos_get_fx("bolsa", start, end)
    if mep:
        result["MEP"] = mep

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(result, f, separators=(",", ":"))

    size_kb = os.path.getsize(OUTPUT_FILE) / 1024
    print(f"\n✓ Guardado {OUTPUT_FILE} ({size_kb:.1f} KB)")
    print(f"  Tickers: {sorted(result.keys())}")
    print(f"  Total puntos: {sum(len(v) for v in result.values())}")

if __name__ == "__main__":
    main()
