/* Gas: instant AAA state vs. national price by grade. */
const ZIP3_STATE = [[0,null],[5,"New York"],[6,"Puerto Rico"],[10,"Massachusetts"],[28,"Rhode Island"],[30,"New Hampshire"],[39,"Maine"],[50,"Vermont"],[60,"Connecticut"],[70,"New Jersey"],[90,null],[100,"New York"],[150,"Pennsylvania"],[197,"Delaware"],[200,"District of Columbia"],[201,"Virginia"],[202,"District of Columbia"],[206,"Maryland"],[220,"Virginia"],[247,"West Virginia"],[270,"North Carolina"],[290,"South Carolina"],[300,"Georgia"],[320,"Florida"],[350,"Alabama"],[370,"Tennessee"],[386,"Mississippi"],[398,"Georgia"],[400,"Kentucky"],[430,"Ohio"],[460,"Indiana"],[480,"Michigan"],[500,"Iowa"],[530,"Wisconsin"],[550,"Minnesota"],[570,"South Dakota"],[580,"North Dakota"],[590,"Montana"],[600,"Illinois"],[630,"Missouri"],[660,"Kansas"],[680,"Nebraska"],[700,"Louisiana"],[716,"Arkansas"],[730,"Oklahoma"],[733,"Texas"],[734,"Oklahoma"],[750,"Texas"],[800,"Colorado"],[820,"Wyoming"],[832,"Idaho"],[840,"Utah"],[850,"Arizona"],[870,"New Mexico"],[885,"Texas"],[889,"Nevada"],[900,"California"],[962,null],[967,"Hawaii"],[969,null],[970,"Oregon"],[980,"Washington"],[995,"Alaska"]];
const zipToState = zip => { const z = +zip.slice(0, 3); let s = null; for (const [p, n] of ZIP3_STATE) if (z >= p) s = n; return s; };

const G = { regular: "Regular", midgrade: "Mid-grade", premium: "Premium", diesel: "Diesel" };
let GRADE = localStorage.getItem("cw_grade") || "regular";
const zipg = document.querySelector("#zipg"), gout = document.querySelector("#gout");
async function gas() {
  document.querySelectorAll("[data-g]").forEach(b => b.classList.toggle("on", b.dataset.g === GRADE));
  const zip = zipg.value.replace(/\D/g, "").slice(0, 5); if (zip.length !== 5) return;
  localStorage.setItem("cw_zip", zip);
  const g = await DATA.gas, st = zipToState(zip);
  if (!g || !g.states[st]) { gout.innerHTML = `<p class="hint">No AAA average for this ZIP${st ? ` (${esc(st)})` : ""}.</p>`; return; }
  const p = g.states[st][GRADE], n = g.national?.[GRADE], diff = n ? p - n : null;
  gout.innerHTML = `<div class="hero-num"><div class="lbl">${esc(st)} · ${G[GRADE]}</div><div class="num">$${p.toFixed(2)}<span>/gal</span></div>
    <div class="sub2">${n ? `National $${n.toFixed(2)} · <b class="${diff > 0 ? "up" : "dn"}">${diff > 0 ? "+" : "−"}$${Math.abs(diff).toFixed(2)}</b> ${diff > 0 ? "above" : "below"} average` : ""}</div></div>
    <div class="totals"><div class="tot"><small>Fill 15 gal here</small><b>${money(p * 15)}</b></div>${n ? `<div class="tot"><small>At the national average</small><b>${money(n * 15)}</b></div>` : ""}</div>
    <p class="src">AAA, <a href="${g.sourceUrl}" target="_blank" rel="noopener">state averages</a> and <a href="${g.nationalSourceUrl || g.sourceUrl}" target="_blank" rel="noopener">national average</a> · retrieved ${esc(g.retrieved)}</p>`;
}
zipg.addEventListener("input", gas);
document.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { GRADE = b.dataset.g; localStorage.setItem("cw_grade", GRADE); gas(); });
const z0 = localStorage.getItem("cw_zip"); if (z0) { zipg.value = z0; } gas();

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
