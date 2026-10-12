/* Restaurants near you: free sources only. Zippopotam.us (ZIP -> lat/lon) + OpenStreetMap Overpass API.
   Etiquette: one request per ZIP, cached 24h in localStorage, 2 km radius, no polling. No prices or ratings are shown. */
(() => {
  const TTL = 864e5, R = 2000, MENU_MI = 6, input = document.querySelector("#nzip"), bud = document.querySelector("#nbud"), out = document.querySelector("#nout");
  const MENUS = fetch("data/chicago_menus.json?v=9").then(r => r.ok ? r.json() : null).catch(() => null);
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
    let r = null;
    for (const ep of ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]) {
      try { r = await fetch(ep, { signal: AbortSignal.timeout(25000), method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) }); if (r.ok) break; } catch { r = null; }
    }
    if (!r || !r.ok) throw new Error("busy");
    const d = (await r.json()).elements.map(e => ({ t: e.type, id: e.id, name: e.tags.name, amenity: e.tags.amenity, cuisine: (e.tags.cuisine || "").split(";")[0].replace(/_/g, " "),
      lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, street: [e.tags["addr:housenumber"], e.tags["addr:street"]].filter(Boolean).join(" ") }));
    cacheSet(k, d); return d;
  }
  function render() {
    document.querySelectorAll("[data-nt]").forEach(b => b.classList.toggle("on", b.dataset.nt === TYPE));
    if (!last) return; const { g, places, menus, osmDown } = last, max = +bud.value || null;
    const typeOk = p => TYPE === "all" || p.type === TYPE || p.amenity === TYPE;
    const priced = (menus?.places || []).map(p => ({ ...p, dist: hav(g.lat, g.lon, p.lat, p.lon) })).filter(p => p.dist <= MENU_MI && typeOk(p));
    const inBudget = priced.filter(p => !max || p.typical.perPerson <= max).sort((a, b) => a.typical.perPerson - b.typical.perPerson);
    const pricedIds = new Set(priced.map(p => p.osm));
    const list = places.filter(p => typeOk(p) && !pricedIds.has(`${({n:"node",w:"way",r:"relation"})[p.t[0]] || p.t}/${p.id}`)).map(p => ({ ...p, dist: hav(g.lat, g.lon, p.lat, p.lon) })).sort((a, b) => a.dist - b.dist);
    const inRegion = menus && (menus.places || []).some(p => hav(g.lat, g.lon, p.lat, p.lon) <= 25);
    const maps = (name, street, place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + (street || "") + " " + place)}`;
    const pcard = p => `<li class="mp"><details><summary><div><div class="nm">${esc(p.name)}</div><div class="meta">${p.type === "fast_food" ? "Fast food" : "Sit-down"}${p.cuisine ? " · " + esc(p.cuisine) : ""} · ${p.dist.toFixed(1)} mi${p.city ? " · " + esc(p.city) : ""}</div></div>
      <div class="pp"><b>${money(p.typical.perPerson)}</b><small>typical / person</small></div></summary>
      <ul class="menu">${p.items.map(i => `<li><span>${esc(i.name)}</span><b>${money(i.price)}</b></li>`).join("")}</ul>
      <p class="src">Typical meal is ${esc(p.typical.basis)}. Prices from the <a href="${p.menuUrl}" target="_blank" rel="noopener">restaurant's menu</a>, retrieved ${esc(menus.retrieved)}. Prices can change. · <a href="${maps(p.name, p.street, p.city || g.place)}" target="_blank" rel="noopener">Map</a></p></details></li>`;
    out.innerHTML = `${priced.length ? `<h3 class="sec">With menu prices <small class="muted">${inBudget.length}${max ? ` within ${money(max)}` : ""} · cheapest first</small></h3>
        ${inBudget.length ? `<ul class="places priced">${inBudget.map(pcard).join("")}</ul>` : `<p class="hint">None within ${money(max)} per person. Try a higher budget.</p>`}`
      : inRegion ? `<p class="hint">No places with menu prices within ${MENU_MI} mi yet.</p>` : `<p class="hint">Menu prices are coming to more areas. For now they cover Chicago and the western and southwest suburbs.</p>`}
      ${osmDown ? `<p class="hint">The map service is busy, so other nearby places couldn't load. Try again in a minute.</p>` : `<h3 class="sec">All places nearby <small class="muted">${list.length}${places.length >= 300 ? "+" : ""} within 1.2 mi of ${esc(g.place)} · no prices</small></h3>
      <ul class="places">${list.slice(0, 40).map(p => `<li><div><div class="nm">${esc(p.name)}</div><div class="meta">${p.amenity === "fast_food" ? "Fast food" : "Sit-down"}${p.cuisine ? " · " + esc(p.cuisine) : ""}${p.street ? " · " + esc(p.street) : ""}</div>
        <div class="links"><a href="https://www.openstreetmap.org/${p.t}/${p.id}" target="_blank" rel="noopener">OpenStreetMap</a><a href="${maps(p.name, p.street, g.place)}" target="_blank" rel="noopener">Google Maps</a></div></div>
        <div class="dist">${p.dist.toFixed(1)} mi</div></li>`).join("")}</ul>
      ${list.length > 40 ? `<p class="hint">Showing the 40 closest.</p>` : ""}`}
      <p class="src">Places © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> via Overpass API · ZIP location by Zippopotam.us · cached 24h. No ratings shown.</p>`;
  }
  async function search() {
    const zip = input.value.replace(/\D/g, "").slice(0, 5); if (zip.length !== 5 || zip === last?.zip) return;
    localStorage.setItem("cw_zip", zip); out.innerHTML = `<p class="hint">Finding places near ${zip}…</p>`;
    try { const g = await geo(zip); const [places, menus] = await Promise.all([osm(g.lat, g.lon).catch(() => null), MENUS]); last = { zip, g, places: places || [], osmDown: !places, menus }; render(); }
    catch (err) { last = null; out.innerHTML = `<p class="hint">${esc(err.message || "Network error")}</p>`; }
  }
  input.addEventListener("input", search); bud.addEventListener("input", render);
  document.querySelectorAll("[data-nt]").forEach(b => b.onclick = () => { TYPE = b.dataset.nt; localStorage.setItem("cw_ntype", TYPE); render(); });
  const z0 = localStorage.getItem("cw_zip"); if (z0) input.value = z0;
  render();
  // Fetch only when the user opens the tab (respects the API).
  document.querySelector('.tabs button[data-t="restaurants"]').addEventListener("click", search);
  if (location.hash === "#restaurants") search();
})();
