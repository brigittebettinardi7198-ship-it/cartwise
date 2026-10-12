// OPTIONAL. Live Kroger prices via the free Kroger Developer API. Needs KROGER_CLIENT_ID / KROGER_CLIENT_SECRET env vars.
// GET ?zip=60614&q=eggs|milk  ->  { rows:[{query,item,store,price,size,source,asOf}] }
const API = "https://api.kroger.com/v1";
let token = null, tokenExp = 0; const cache = new Map(); const TTL = 6 * 3600e3; // warm-instance caches
async function getToken() {
  if (token && Date.now() < tokenExp - 60e3) return token;
  const id = process.env.KROGER_CLIENT_ID, sec = process.env.KROGER_CLIENT_SECRET;
  const r = await fetch(`${API}/connect/oauth2/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + Buffer.from(`${id}:${sec}`).toString("base64") }, body: "grant_type=client_credentials&scope=product.compact" });
  if (!r.ok) throw new Error("token " + r.status);
  const j = await r.json(); token = j.access_token; tokenExp = Date.now() + j.expires_in * 1000; return token;
}
const kget = async (path) => { const r = await fetch(API + path, { headers: { Authorization: "Bearer " + await getToken(), Accept: "application/json" } }); if (!r.ok) throw new Error(path + " " + r.status); return r.json(); };
const cached = async (key, fn) => { const c = cache.get(key); if (c && Date.now() - c.t < TTL) return c.v; const v = await fn(); cache.set(key, { t: Date.now(), v }); return v; };
const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json", "Cache-Control": code === 200 ? "public, max-age=21600" : "no-store" }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (!process.env.KROGER_CLIENT_ID || !process.env.KROGER_CLIENT_SECRET) return json(503, { error: "not_configured", rows: [] });
  const zip = (event.queryStringParameters?.zip || "").trim(), q = (event.queryStringParameters?.q || "").split("|").map(s => s.trim()).filter(Boolean).slice(0, 25);
  if (!/^\d{5}$/.test(zip) || !q.length) return json(400, { error: "zip and q required", rows: [] });
  try {
    const locs = await cached("loc:" + zip, () => kget(`/locations?filter.zipCode.near=${zip}&filter.radiusInMiles=10&filter.limit=3`));
    const stores = (locs.data || []).slice(0, 3); if (!stores.length) return json(200, { rows: [], note: "No Kroger-family store within 10 miles" });
    const asOf = new Date().toISOString(), rows = [];
    await Promise.all(stores.flatMap(s => q.map(term => cached(`p:${s.locationId}:${term}`, () => kget(`/products?filter.term=${encodeURIComponent(term)}&filter.locationId=${s.locationId}&filter.limit=10`)).then(res => {
      const priced = (res.data || []).flatMap(p => (p.items || []).filter(i => i.price?.regular).map(i => ({ p, i, price: i.price.promo || i.price.regular })));
      priced.sort((a, b) => a.price - b.price); const best = priced[0]; if (!best) return;
      rows.push({ query: term, item: best.p.description, store: `${s.chain} ${s.address?.addressLine1 || ""}`.trim(), price: best.price, regular: best.i.price.regular, size: best.i.size, source: "Kroger API", asOf });
    }).catch(() => {}))));
    return json(200, { rows });
  } catch (e) { return json(502, { error: String(e.message), rows: [] }); }
};
