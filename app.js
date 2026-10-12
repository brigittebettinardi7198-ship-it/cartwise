const $ = s => document.querySelector(s);
const money = n => "$" + Number(n).toFixed(2);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const srcLine = (name, url, date) => `<p class="src">Source: <a href="${url}" target="_blank" rel="noopener">${esc(name)}</a> · retrieved ${esc(date)}</p>`;
renderTips([]);

const NOTE = "Use this as a benchmark. If your store charges much more than this, look at store brands, Aldi, or Walmart.";
const norm = w => w.toLowerCase().replace(/^organic\s+/, "").replace(/ies$/, "y").replace(/(oes|es|s)$/, m => m === "oes" ? "o" : "").trim();
async function compare(zip, items, mode, out) {
  const [org, kroger, reports] = await Promise.all([DATA.org, krogerPrices(zip, items.map(i => "organic " + i)), shopperReports("grocery", zip)]);
  let html = "";
  if (!org) { $(out).innerHTML = `<div class="empty">Organic price data didn't load.</div>`; return; }
  const found = [], miss = [];
  items.forEach(it => {
    const n = norm(it), rows = org.items.filter(r => { const c = norm(r.commodity.split(/[,(]/)[0]); return c === n || c.includes(n) || n.includes(c) || norm(r.variety || "").includes(n); });
    rows.length ? found.push([it, rows.sort((x, y) => y.ads - x.ads)]) : miss.push(it);
  });
  html += `<h3>Organic benchmark prices <small class="muted">(USDA, week of ${esc(org.reportDate)})</small></h3>
  <p class="note">${NOTE}</p>`;
  html += found.length ? found.map(([it, rows]) => `<div class="itemcard"><b>Organic ${esc(it)}</b>
    <div class="tbl"><table><thead><tr><th>Variety</th><th>Size</th><th>Avg advertised price</th><th>Ads</th></tr></thead><tbody>
    ${rows.slice(0, 6).map(r => `<tr><td>${esc(r.variety || r.commodity)}</td><td>${esc(r.unit)}</td><td class="low">${money(r.price)}</td><td><small class="muted">${r.ads.toLocaleString()}</small></td></tr>`).join("")}</tbody></table></div></div>`).join("")
    : `<div class="empty">None of these items are in this week's USDA organic report.</div>`;
  if (miss.length) html += `<p class="muted">No verified organic price this week for: ${miss.map(esc).join(", ")}. USDA's report covers organic produce only (for example ${[...new Set(org.items.map(r => r.commodity.split(/[,(]/)[0].toLowerCase()))].slice(0, 14).join(", ")}…). We leave out anything we can't verify.</p>`;
  html += `<p class="src">${esc(org.note)} Ad period ${esc(org.adPeriod)}.</p>` + srcLine(org.source, org.sourceUrl, org.retrieved);
  const rowsLive = [...kroger, ...reports.filter(r => /organic/i.test(r.item))];
  if (rowsLive.length) html += `<h3>Store prices near ${zip}</h3><div class="tbl"><table><tbody>${rowsLive.map(r => `<tr><td>${esc(r.item)}</td><td>${esc(r.store)}</td><td>${money(r.price)}</td><td><small class="muted">${esc(r.source)} · ${esc((r.asOf || "").slice(0, 10))}</small></td></tr>`).join("")}</tbody></table></div>`;
  $(out).innerHTML = html;
}
function bindCompare(form, zipSel, listSel, outSel, mode) {
  $(form).addEventListener("submit", e => {
    e.preventDefault(); const zip = $(zipSel).value.trim(); if (!/^\d{5}$/.test(zip)) { $(zipSel).focus(); return; }
    const items = [...new Set($(listSel).value.toLowerCase().split(/\n|,/).map(s => s.trim()).filter(Boolean))];
    compare(zip, items, mode, outSel);
    renderOrgTips(items); $("#tipsnote").textContent = "Tips matched to the items on your list:"; renderTips(items);
  });
}
bindCompare("#fo", "#zipo", "#listo", "#outo", "organic");
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
  document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", x === b));
  document.querySelectorAll(".panel").forEach(p => p.hidden = p.id !== b.dataset.t); history.replaceState(null, "", "#" + b.dataset.t);
});
const tb = document.querySelector(`.tabs button[data-t="${location.hash.slice(1)}"]`); if (tb) tb.click();
