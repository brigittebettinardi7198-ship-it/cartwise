/* CartWise data layer: REAL data only. No sample or invented prices.
 * Primary (no keys): dated JSON in /data built by /scripts from public sources.
 * Optional: Kroger store prices (Netlify Function + user's own free Kroger key) and shopper reports (Supabase free tier). */
// GitHub Pages (static): optional endpoints are off by default. Set these to a deployed function URL to enable them.
const CW = { krogerFn: null, reportsFn: null };
const loadJSON = async p => { try { const r = await fetch(p); return r.ok ? r.json() : null; } catch { return null; } };
const DATA = { org: loadJSON("data/organic_usda.json"), gas: loadJSON("data/gas_aaa.json") };

/* Optional: returns [] if the function is not deployed or has no key (503). */
async function krogerPrices(zip, items) {
  if (!CW.krogerFn) return [];
  try { const r = await fetch(`${CW.krogerFn}?zip=${zip}&q=${encodeURIComponent(items.join("|"))}`); return r.ok ? (await r.json()).rows || [] : []; } catch { return []; }
}
/* Optional shopper reports: kind = grocery | gas | menu */
async function shopperReports(kind, zip) {
  if (!CW.reportsFn) return [];
  try { const r = await fetch(`${CW.reportsFn}?kind=${kind}&zip=${zip}`); return r.ok ? (await r.json()).rows || [] : []; } catch { return []; }
}
const matchKey = (it, keys) => keys.find(k => it.includes(k) || k.includes(it));
DATA.stores = loadJSON("data/organic_stores.json");
