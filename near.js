/* Restaurants near you: free sources only. Zippopotam.us (ZIP -> lat/lon) + OpenStreetMap Overpass API.
   Etiquette: one request per ZIP, cached 24h in localStorage, 2 km radius, no polling. No prices or ratings are shown. */
(() => {
  const TTL = 864e5, R = 2000, input = document.querySelector("#nzip"), out = document.querySelector("#nout");
  let TYPE = localStorage.getItem("cw_ntype") || "all", last = null;
  const cacheGet = k => { try { const v = JSON.parse(localStorage.getItem(k)); return v && Date.now() - v.t < TTL ? v.d : null; } catch { return null; } };
  const cacheSet = (k, d) => { try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), d })); } catch {} };
  const hav = (a, b, c, d) => { const r = x => x * Math.PI / 180; const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * 3958.8 * Math.asin(Math.sqrt(h)); };
  async function geo(zip) {
    const k = "cw_geo_" + zip, c = cacheGet(k); if (c) return c;
    const r = await fetch(`https://api.zippopotam.us/us/${zip}`); if (!r.ok) throw new Error("We couldn't find that ZIP code.");
    const p = (await r.json()).places[0], d = { lat: +p.latitude, lon: +p.longitude, place: `${p["place name"]}, ${p["state abbreviation"]}` }; cacheSet(k, d); return d;
  }
  async function osm(lat, lon) {
    const k = `cw_osm_${lat.toFixed(3)}_${lon.toFixed(3)}`, c = cacheGet(k); if (c) return c;
    const q = `[out:json][timeout:25];nwr["amenity"~"^(restaurant|fast_food)$"]["name"](around:${R},${lat},${lon});out center tags 300;`;
    const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
    if (!r.ok) throw new Error(r.status === 429 ? "The map service is busy. Try again in a minute." : "The map service didn't respond.");
    const d = (await r.json()).elements.map(e => ({ t: e.type, id: e.id, name: e.tags.name, amenity: e.tags.amenity, cuisine: (e.tags.cuisine || "").split(";")[0].replace(/_/g, " "),
      lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, street: [e.tags["addr:housenumber"], e.tags["addr:street"]].filter(Boolean).join(" ") }));
    cacheSet(k, d); return d;
  }
  function render() {
    document.querySelectorAll("[data-nt]").forEach(b => b.classList.toggle("on", b.dataset.nt === TYPE));
    if (!last) return; const { g, places } = last;
    const list = places.filter(p => TYPE === "all" || p.amenity === TYPE).map(p => ({ ...p, dist: hav(g.lat, g.lon, p.lat, p.lon) })).sort((a, b) => a.dist - b.dist);
    out.innerHTML = `<p class="hint">${list.length}${places.length >= 300 ? "+" : ""} places within 1.2 mi of ${esc(g.place)}</p>
      <ul class="places">${list.slice(0, 50).map(p => `<li><div><div class="nm">${esc(p.name)}</div><div class="meta">${p.amenity === "fast_food" ? "Fast food" : "Sit-down"}${p.cuisine ? " · " + esc(p.cuisine) : ""}${p.street ? " · " + esc(p.street) : ""}</div>
        <div class="links"><a href="https://www.openstreetmap.org/${p.t}/${p.id}" target="_blank" rel="noopener">OpenStreetMap</a><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + " " + (p.street || "") + " " + g.place)}" target="_blank" rel="noopener">Google Maps</a></div></div>
        <div class="dist">${p.dist.toFixed(1)} mi</div></li>`).join("")}</ul>
      ${list.length > 50 ? `<p class="hint">Showing the 50 closest.</p>` : ""}
      <p class="src">Places © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> via Overpass API · ZIP location by Zippopotam.us · cached 24h</p>`;
  }
  async function search() {
    const zip = input.value.replace(/\D/g, "").slice(0, 5); if (zip.length !== 5 || zip === last?.zip) return;
    localStorage.setItem("cw_zip", zip); out.innerHTML = `<p class="hint">Finding places near ${zip}…</p>`;
    try { const g = await geo(zip); last = { zip, g, places: await osm(g.lat, g.lon) }; render(); }
    catch (err) { last = null; out.innerHTML = `<p class="hint">${esc(err.message || "Network error")}</p>`; }
  }
  input.addEventListener("input", search);
  document.querySelectorAll("[data-nt]").forEach(b => b.onclick = () => { TYPE = b.dataset.nt; localStorage.setItem("cw_ntype", TYPE); render(); });
  const z0 = localStorage.getItem("cw_zip"); if (z0) input.value = z0;
  render();
  // Fetch only when the user opens the tab (respects the API).
  document.querySelector('.tabs button[data-t="restaurants"]').addEventListener("click", search);
  if (location.hash === "#restaurants") search();
})();
