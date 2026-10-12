// OPTIONAL shopper price reports, stored in Supabase (free tier). Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server-side only), IP_SALT.
// GET ?kind=gas|menu|grocery&zip=60614 -> recent reports in that ZIP3.  POST {kind,place,item,price,zip,website(honeypot),elapsedMs} -> saves one report.
const crypto = require("crypto");
const MAX_AGE_DAYS = { gas: 3, menu: 120, grocery: 30 };
const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const sb = (path, init = {}) => fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) } });
exports.handler = async (event) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return json(503, { error: "not_configured", rows: [] });
  if (event.httpMethod === "GET") {
    const { kind, zip = "" } = event.queryStringParameters || {};
    if (!MAX_AGE_DAYS[kind] || !/^\d{5}$/.test(zip)) return json(400, { rows: [] });
    const since = new Date(Date.now() - MAX_AGE_DAYS[kind] * 864e5).toISOString();
    const r = await sb(`price_reports?select=kind,place,item,price,unit,zip,created_at&kind=eq.${kind}&zip3=eq.${zip.slice(0, 3)}&approved=eq.true&created_at=gte.${since}&order=created_at.desc&limit=100`);
    const rows = (await r.json()).map(x => ({ ...x, store: x.place, source: "Shopper report", asOf: x.created_at }));
    return json(200, { rows });
  }
  if (event.httpMethod !== "POST") return json(405, {});
  let d; try { d = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "bad json" }); }
  if (d.website) return json(200, { ok: true });                 // honeypot: silently drop bots
  if (!(d.elapsedMs > 3000)) return json(429, { error: "too fast" });
  const price = Number(d.price), place = String(d.place || "").trim().slice(0, 80), item = String(d.item || "").trim().slice(0, 80);
  const limits = { gas: [1, 10], menu: [0.5, 300], grocery: [0.1, 200] };
  if (!limits[d.kind] || !/^\d{5}$/.test(d.zip || "") || !place || (d.kind !== "gas" && !item) || !(price >= limits[d.kind][0] && price <= limits[d.kind][1])) return json(400, { error: "invalid" });
  const ip = event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || "";
  const ipHash = crypto.createHash("sha256").update(ip + (process.env.IP_SALT || "cartwise")).digest("hex").slice(0, 32);
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const recent = await sb(`price_reports?select=id&ip_hash=eq.${ipHash}&created_at=gte.${hourAgo}`, { headers: { Prefer: "count=exact", Range: "0-0" } });
  if (Number((recent.headers.get("content-range") || "/0").split("/")[1]) >= 10) return json(429, { error: "rate limited" });
  const r = await sb("price_reports", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ kind: d.kind, place, item: item || (d.kind === "gas" ? "regular" : null), price, unit: d.unit ? String(d.unit).slice(0, 20) : null, zip: d.zip, zip3: d.zip.slice(0, 3), ip_hash: ipHash, source: "shopper_report" }) });
  return r.ok ? json(200, { ok: true }) : json(502, { error: "save failed" });
};
