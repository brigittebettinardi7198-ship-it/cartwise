const $ = s => document.querySelector(s);
const money = n => "$" + Number(n).toFixed(2);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const srcLine = (name, url, date) => `<p class="src">Source: <a href="${url}" target="_blank" rel="noopener">${esc(name)}</a> · retrieved ${esc(date)}</p>`;
renderTips([]);

async function compare(zip, items, mode, out) {
  const [bls, kroger, reports] = await Promise.all([DATA.bls, krogerPrices(zip, mode === "organic" ? items.map(i => "organic " + i) : items), shopperReports("grocery", zip)]);
  let html = "";
  // Store-level prices (optional, only if configured)
  const rows = [...kroger, ...reports.filter(r => mode !== "organic" || /organic/i.test(r.item))];
  if (rows.length) {
    const stores = [...new Set(rows.map(r => r.store))], byItem = {};
    rows.forEach(r => { const k = r.query || r.item; const cur = (byItem[k] ||= {})[r.store]; if (!cur || r.price < cur.price) byItem[k][r.store] = r; });
    const found = Object.keys(byItem);
    html += `<h3>Store prices near ${zip}</h3><div class="tbl"><table><thead><tr><th>Item</th>${stores.map(s => `<th>${esc(s)}</th>`).join("")}</tr></thead><tbody>${found.map(i => { const r = byItem[i], min = Math.min(...Object.values(r).map(x => x.price));
      return `<tr><td>${esc(i)}</td>${stores.map(s => r[s] ? `<td class="${r[s].price === min ? "low" : ""}">${money(r[s].price)}<br><small class="muted">${esc(r[s].size || "")} · ${esc(r[s].source)} · ${esc((r[s].asOf || "").slice(0, 10))}</small></td>` : "<td>–</td>").join("")}</tr>`; }).join("")}</tbody></table></div>`;
  }
  if (mode === "organic") {
    if (!rows.length) html += `<div class="empty"><b>No verified organic store prices yet.</b><p>We only show organic prices we can verify with a source and a date. Live store prices appear here once the optional Kroger connection or shopper reports are switched on. Until then, use the organic tips below.</p></div>`;
  } else if (bls) {
    const keys = bls.items.map(i => i.key), hit = [], miss = [];
    items.forEach(it => { const k = matchKey(it, keys); k ? hit.push(bls.items.find(x => x.key === k)) : miss.push(it); });
    const uniq = [...new Map(hit.map(h => [h.key, h])).values()];
    const total = uniq.reduce((a, b) => a + b.price, 0);
    html += `<h3>U.S. average prices for your list</h3>
    <div class="totals"><div class="tot best"><small>Your list at U.S. average prices</small><b>${money(total)}</b><small>${uniq.length} items · ${esc(uniq[0]?.period || "")}</small></div>
    <div class="tot"><small>Use this as a benchmark</small><p class="muted" style="margin:4px 0 0">If your store charges much more than this, look at store brands, Aldi, or Walmart.</p></div></div>
    <div class="tbl"><table><thead><tr><th>Item (BLS definition)</th><th>Unit</th><th>U.S. avg</th><th>vs. 1 yr ago</th></tr></thead><tbody>
    ${uniq.map(i => `<tr><td><a href="${i.sourceUrl}" target="_blank" rel="noopener">${esc(i.label)}</a></td><td>${esc(i.unit)}</td><td>${money(i.price)}</td><td class="${i.yoyPct > 0 ? "up" : "low"}">${i.yoyPct == null ? "–" : (i.yoyPct > 0 ? "+" : "") + i.yoyPct + "%"}</td></tr>`).join("")}</tbody></table></div>
    ${miss.length ? `<p class="muted">No official average for: ${miss.map(esc).join(", ")}. BLS tracks ${keys.length} items here: ${keys.join(", ")}.</p>` : ""}
    ${srcLine(bls.source, bls.sourceUrl, bls.retrieved)}`;
  }
  $(out).innerHTML = html;
}
function bindCompare(form, zipSel, listSel, outSel, mode) {
  $(form).addEventListener("submit", e => {
    e.preventDefault(); const zip = $(zipSel).value.trim(); if (!/^\d{5}$/.test(zip)) { $(zipSel).focus(); return; }
    const items = [...new Set($(listSel).value.toLowerCase().split(/\n|,/).map(s => s.trim()).filter(Boolean))];
    compare(zip, items, mode, outSel);
    if (mode === "organic") renderOrgTips(items); else { $("#tipsnote").textContent = "Tips matched to the items on your list:"; renderTips(items); }
  });
}
bindCompare("#f", "#zip", "#list", "#out", "basic");
bindCompare("#fo", "#zipo", "#listo", "#outo", "organic");
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
  document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", x === b));
  document.querySelectorAll(".panel").forEach(p => p.hidden = p.id !== b.dataset.t); history.replaceState(null, "", "#" + b.dataset.t);
});
const tb = document.querySelector(`.tabs button[data-t="${location.hash.slice(1)}"]`); if (tb) tb.click();
