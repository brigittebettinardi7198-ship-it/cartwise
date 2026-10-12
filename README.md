# CartWise (static, zero API fees)

Real, sourced, dated data only. Hosted on **GitHub Pages**, with no server and no keys.

## Data (in /data, each with `sourceUrl` and `retrieved`)
| File | Source | Refresh |
|---|---|---|
| bls_prices.json | BLS Average Price Data API v1 (no key) | `python scripts/refresh_bls.py` |
| gas_aaa.json | AAA state averages (headless Chrome, since the site blocks plain HTTP) | `python scripts/refresh_aaa.py` |
| menu_dennys.json | Denny's online menu, one Seattle store | `python scripts/fetch_menus.py` (manual review needed) |

`.github/workflows/refresh.yml` refreshes BLS and AAA weekly on free GitHub Actions.

## Optional extras (off by default, not needed for v1)
`optional/` contains a Kroger API proxy function (needs your own free Kroger keys) and a shopper-report function with a Supabase schema (honeypot, minimum fill time, IP-hash rate limit, dated "Shopper report" source). These need a serverless host. Enable them by setting `CW.krogerFn` / `CW.reportsFn` in data.js.

## Deploy
Push to a GitHub repo, then go to Settings → Pages → deploy from branch `main`, folder `/` (root).
