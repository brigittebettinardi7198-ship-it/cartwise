/* Restaurant estimator (real Denny's menu prices) + gas (real AAA state averages). */
const ZIP3_STATE = [[0,null],[5,"New York"],[6,"Puerto Rico"],[10,"Massachusetts"],[28,"Rhode Island"],[30,"New Hampshire"],[39,"Maine"],[50,"Vermont"],[60,"Connecticut"],[70,"New Jersey"],[90,null],[100,"New York"],[150,"Pennsylvania"],[197,"Delaware"],[200,"District of Columbia"],[201,"Virginia"],[202,"District of Columbia"],[206,"Maryland"],[220,"Virginia"],[247,"West Virginia"],[270,"North Carolina"],[290,"South Carolina"],[300,"Georgia"],[320,"Florida"],[350,"Alabama"],[370,"Tennessee"],[386,"Mississippi"],[398,"Georgia"],[400,"Kentucky"],[430,"Ohio"],[460,"Indiana"],[480,"Michigan"],[500,"Iowa"],[530,"Wisconsin"],[550,"Minnesota"],[570,"South Dakota"],[580,"North Dakota"],[590,"Montana"],[600,"Illinois"],[630,"Missouri"],[660,"Kansas"],[680,"Nebraska"],[700,"Louisiana"],[716,"Arkansas"],[730,"Oklahoma"],[733,"Texas"],[734,"Oklahoma"],[750,"Texas"],[800,"Colorado"],[820,"Wyoming"],[832,"Idaho"],[840,"Utah"],[850,"Arizona"],[870,"New Mexico"],[885,"Texas"],[889,"Nevada"],[900,"California"],[962,null],[967,"Hawaii"],[969,null],[970,"Oregon"],[980,"Washington"],[995,"Alaska"]];
const zipToState = zip => { const z = +zip.slice(0, 3); let s = null; for (const [p, n] of ZIP3_STATE) if (z >= p) s = n; return s; };

document.querySelector("#gf").addEventListener("submit", e => e.preventDefault());
const savedZip = localStorage.getItem("cw_zip"); if (savedZip) document.querySelector("#zipg").value = savedZip;
document.querySelector("#zipg").addEventListener("input", gas); if (savedZip) gas();
async function gas() {
  const zip = document.querySelector("#zipg").value.replace(/\D/g, "").slice(0, 5); if (!/^\d{5}$/.test(zip)) return; localStorage.setItem("cw_zip", zip);
  const [g, reports] = [await DATA.gas, await shopperReports("gas", zip)], st = zipToState(zip), out = document.querySelector("#gout");
  if (!g || !g.states[st]) { out.innerHTML = `<div class="empty">No AAA average found for this ZIP${st ? ` (${st})` : ""}.</div>`; return; }
  const s = g.states[st], rank = Object.entries(g.states).sort((a, b) => a[1].regular - b[1].regular).findIndex(x => x[0] === st) + 1, n = Object.keys(g.states).length;
  out.innerHTML = `<h3>${esc(st)}: average gas prices today</h3>
  <div class="totals">${[["Regular", s.regular], ["Mid-grade", s.midgrade], ["Premium", s.premium], ["Diesel", s.diesel]].map(([k, v], i) => `<div class="tot ${i ? "" : "best"}"><small>${k}</small><b>$${v.toFixed(3)}</b><small>per gallon</small></div>`).join("")}</div>
  <p class="muted">${esc(st)} ranks #${rank} cheapest of ${n} (50 states + DC) for regular. A 15-gallon fill at this average costs ${money(s.regular * 15)}.</p>
  ${srcLine(g.source, g.sourceUrl, g.retrieved)}
  ${reports.length ? `<h3>Shopper-reported stations</h3><div class="tbl"><table><tbody>${reports.sort((a, b) => a.price - b.price).map(r => `<tr><td>${esc(r.place)}</td><td class="low">$${r.price.toFixed(3)}</td><td><small class="muted">reported ${esc(r.created_at.slice(0, 16).replace("T", " "))}</small></td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">Station-by-station prices aren't available yet. Know a price near you? <a href="#report" onclick="document.querySelector('[name=kind]').value='gas'">Be the first to report one.</a></p>`}`;
}

/* Restaurant estimator: median real menu prices per category. */
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const PARTY = { date: { a: 2, k: 0 }, family: { a: 2, k: 2 } };
async function calcRest() {
  const m = await DATA.menu, f = new FormData(document.querySelector("#rf")), out = document.querySelector("#rout");
  document.querySelector("#customRow").hidden = f.get("party") !== "custom";
  if (!m) { out.innerHTML = `<div class="empty">Menu data didn't load.</div>`; return; }
  const p = PARTY[f.get("party")] || { a: Math.max(1, +f.get("adults") || 1), k: Math.max(0, +f.get("kids") || 0) }, n = p.a + p.k;
  const cat = c => m.items.filter(i => i.category === c), med = c => median(cat(c).map(i => i.price));
  const lines = [["Entrées", p.a, med("entree")], ["Kids' meals", p.k, med("kids")]];
  if (f.get("drinks")) lines.push(["Drinks", n, med("drink")]);
  if (f.get("app")) lines.push(["Appetizers (1 per 3 people)", Math.ceil(n / 3), med("appetizer")]);
  if (f.get("dessert")) lines.push(["Desserts (1 per 2 people)", Math.ceil(n / 2), med("dessert")]);
  const sub = lines.reduce((a, [, q, pr]) => a + q * pr, 0), tax = sub * (+f.get("tax") / 100), tip = sub * (+f.get("tip") / 100);
  out.innerHTML = `<span class="badge">ESTIMATE · based on real median menu prices</span>
  <div class="totals"><div class="tot best"><small>Estimated total at Denny's</small><b>${money(sub + tax + tip)}</b><small>${p.a} adult${p.a > 1 ? "s" : ""}${p.k ? `, ${p.k} kid${p.k > 1 ? "s" : ""}` : ""}</small></div>
  <div class="tot"><small>Subtotal</small><b>${money(sub)}</b></div><div class="tot"><small>Tax ${f.get("tax")}% + tip ${f.get("tip")}%</small><b>${money(tax + tip)}</b><small>tip on pre-tax subtotal</small></div></div>
  <div class="tbl"><table><thead><tr><th>Line</th><th>Qty</th><th>Median menu price</th><th>Cost</th></tr></thead><tbody>${lines.filter(l => l[1]).map(([k, q, pr]) => `<tr><td>${k}</td><td>${q}</td><td>${money(pr)}</td><td>${money(q * pr)}</td></tr>`).join("")}</tbody></table></div>
  <details><summary>See the ${m.items.length} menu prices used</summary><p class="muted">${m.items.map(i => `${esc(i.name)} ${money(i.price)}${i.from ? "+" : ""}`).join(" · ")}</p></details>
  <p class="muted"><small>${esc(m.note)} Store: ${esc(m.location)}.</small></p>${srcLine(m.chain + " online menu", m.sourceUrl, m.retrieved)}`;
}
document.querySelector("#rf").addEventListener("input", calcRest); calcRest();

/* Optional shopper report form. Spam protection: honeypot + min fill time + server-side rate limit. */
const rep = document.querySelector("#repf"), t0 = Date.now();
rep?.addEventListener("submit", async e => {
  e.preventDefault(); const d = Object.fromEntries(new FormData(rep)); d.elapsedMs = Date.now() - t0;
  const msg = document.querySelector("#repmsg");
  if (!CW.reportsFn) { msg.textContent = "Price reporting isn't switched on for this site yet."; return; }
  try { const r = await fetch(CW.reportsFn, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
    msg.textContent = r.ok ? "Thanks! Your price was saved with today's date." : (r.status === 503 || r.status === 404 || r.status === 405) ? "Price reporting isn't switched on for this site yet." : "Couldn't save the price. Check the fields and try again.";
    if (r.ok) rep.reset();
  } catch { msg.textContent = "Price reporting isn't available right now."; }
});
