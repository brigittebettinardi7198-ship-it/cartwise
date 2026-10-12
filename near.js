/* Restaurants near you: free sources only. Zippopotam.us (ZIP -> lat/lon) + OpenStreetMap Overpass API.
   Etiquette: one request per search, results cached 24h in localStorage, 2 km radius, no auto-refresh. */
(() => {
  const TTL = 864e5, R = 2000;
  const cacheGet = k => { try { const v = JSON.parse(localStorage.getItem(k)); return v && Date.now() - v.t < TTL ? v.d : null; } catch { return null; } };
  const cacheSet = (k, d) => { try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), d })); } catch {} };
  const hav = (a, b, c, d) => { const r = x => x * Math.PI / 180, R0 = 3958.8; const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * R0 * Math.asin(Math.sqrt(h)); };
  async function geo(zip) {
    const k = "cw_geo_" + zip, c = cacheGet(k); if (c) return c;
    const r = await fetch(`https://api.zippopotam.us/us/${zip}`); if (!r.ok) throw new Error("ZIP not found");
    const j = await r.json(), p = j.places[0], d = { lat: +p.latitude, lon: +p.longitude, place: `${p["place name"]}, ${p["state abbreviation"]}` }; cacheSet(k, d); return d;
  }
  async function osm(lat, lon) {
    const k = `cw_osm_${lat.toFixed(3)}_${lon.toFixed(3)}`, c = cacheGet(k); if (c) return c;
    const q = `[out:json][timeout:25];nwr["amenity"~"^(restaurant|fast_food)$"]["name"](around:${R},${lat},${lon});out center tags 300;`;
    const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
    if (!r.ok) throw new Error(r.status === 429 ? "The map service is busy. Try again in a minute." : "Map service error");
    const d = (await r.json()).elements.map(e => ({ id: e.type[0] + e.id, name: e.tags.name, brand: e.tags.brand || "", amenity: e.tags.amenity, cuisine: (e.tags.cuisine || "").replace(/_/g, " ").replace(/;/g, ", "),
      price: e.tags.price || e.tags["price:range"] || e.tags["price:meal"] || "", lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, street: [e.tags["addr:housenumber"], e.tags["addr:street"]].filter(Boolean).join(" ") }));
    cacheSet(k, d); return d;
  }
  const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  async function verifiedChains() {
    const m = await DATA.menu; if (!m) return [];
    const ent = median(m.items.filter(i => i.category === "entree").map(i => i.price)), dr = median(m.items.filter(i => i.category === "drink").map(i => i.price));
    return [{ re: /denny'?s/i, perPerson: ent + dr, label: `about ${money(ent + dr)} per person`, detail: `median entrée + drink, Denny's online menu (${m.location.split(",").slice(-2).join(",").trim()}), retrieved ${m.retrieved}` }];
  }
  const numPrice = s => { const m = String(s).match(/\d+(\.\d+)?/); return m ? +m[0] : null; };
  const out = document.querySelector("#nout"), f = document.querySelector("#nf");
  const z0 = localStorage.getItem("cw_zip"); if (z0) document.querySelector("#nzip").value = z0;
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const zip = document.querySelector("#nzip").value.replace(/\D/g, "").slice(0, 5), bud = +document.querySelector("#nbud").value || null, type = document.querySelector("#ntype").value;
    if (zip.length !== 5) { out.innerHTML = `<p class="muted">Enter a 5-digit ZIP code.</p>`; return; }
    localStorage.setItem("cw_zip", zip); out.innerHTML = `<p class="muted">Searching near ${zip}…</p>`;
    try {
      const g = await geo(zip), [places, chains] = await Promise.all([osm(g.lat, g.lon), verifiedChains()]);
      let list = places.filter(p => type === "all" || p.amenity === type).map(p => {
        const ch = chains.find(c => c.re.test(p.name) || c.re.test(p.brand)), osmP = numPrice(p.price);
        const known = ch ? ch.perPerson : osmP;
        return { ...p, dist: hav(g.lat, g.lon, p.lat, p.lon), known, priceLabel: ch ? ch.label : p.price ? `OSM: ${p.price}` : null, priceSrc: ch ? ch.detail : p.price ? "OpenStreetMap price tag" : null };
      });
      const over = bud ? list.filter(p => p.known != null && p.known > bud).length : 0;
      if (bud) list = list.filter(p => p.known == null || p.known <= bud);
      const withP = list.filter(p => p.known != null).sort((a, b) => a.known - b.known), noP = list.filter(p => p.known == null).sort((a, b) => a.dist - b.dist);
      const row = p => `<li><div><div class="nm">${esc(p.name)}</div><div class="meta">${p.amenity === "fast_food" ? "Fast food" : "Sit-down"}${p.cuisine ? " · " + esc(p.cuisine) : ""} · ${p.dist.toFixed(1)} mi${p.street ? " · " + esc(p.street) : ""}</div></div>
        ${p.known != null ? `<div class="pr">${esc(p.priceLabel)}<small>${esc(p.priceSrc)}</small></div>` : p.price ? `<div class="pr">OSM: ${esc(p.price)}<small>OpenStreetMap price tag</small></div>` : `<div class="pr na">price not listed</div>`}</li>`;
      out.innerHTML = `<p class="muted" style="margin-top:18px">${list.length >= 300 && !bud ? "300+" : list.length} places within ${(R / 1609).toFixed(1)} mi of ${esc(g.place)}${bud ? ` · budget ${money(bud)}/person` : ""}${over ? ` · ${over} hidden as over budget` : ""}</p>
        ${withP.length ? `<h3>With a verified price</h3><ul class="places">${withP.map(row).join("")}</ul>` : bud ? `<div class="empty"><b>No nearby places have a verified price yet.</b><p>Places below have no price listed, so we can't say whether they fit ${money(bud)}.</p></div>` : ""}
        ${noP.length ? `<h3>Price not listed</h3><ul class="places">${noP.slice(0, 40).map(row).join("")}</ul>${noP.length > 40 ? `<p class="muted"><small>Showing the 40 closest of ${noP.length}.</small></p>` : ""}` : ""}
        <p class="src">Places © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> via Overpass API · ZIP location via Zippopotam.us · cached 24h. No ratings or estimated prices are shown.</p>`;
    } catch (err) { out.innerHTML = `<div class="empty"><b>Couldn't load nearby places.</b><p>${esc(err.message || "Network error")}</p></div>`; }
  });
})();
