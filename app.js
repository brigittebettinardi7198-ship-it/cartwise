const $ = s => document.querySelector(s);
const money = n => "$" + Number(n).toFixed(2);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const srcLine = (name, url, date) => `<p class="src">Source: <a href="${url}" target="_blank" rel="noopener">${esc(name)}</a> · retrieved ${esc(date)}</p>`;
renderTips([]);

const NOTE = "Use this as a benchmark. If your store charges much more than this, look at store brands, Aldi, or Walmart.";
const STOP = new Set(["organic","fresh","frozen","bag","bags","of","and","the","a","lb","box","pack","bunch","raw","whole","baby"]);
const SYN = { berry:["blueberries","strawberries","raspberries","blackberries"], berries:["blueberries","strawberries","raspberries","blackberries"],
  greens:["kale","collards","spinach","lettuce","salad"], salad:["salad","lettuce"], lettuce:["lettuce","salad"], "spring mix":["salad"], "mixed greens":["salad"],
  potato:["potatoes"], "sweet potato":["sweet potatoes"], yam:["sweet potatoes"], yams:["sweet potatoes"], onion:["onions"], pepper:["peppers"], "bell pepper":["peppers"],
  squash:["squash"], zucchini:["squash"], pumpkin:["pumpkins"], tomato:["tomatoes"], mushroom:["mushrooms"], citrus:["lemons","oranges"], orange:["oranges"], lemon:["lemons"],
  kiwi:["kiwifruit"], grape:["grapes"], pear:["pears"], apple:["apples"], "apple juice":["apples, processed"], juice:["apples, processed"], avocado:["avocados"], banana:["bananas"],
  parsley:["parsley"], herbs:["parsley"], sprouts:["brussels sprouts"], "brussel sprouts":["brussels sprouts"], hemp:["hemp"], fruit:["apples","bananas","pears","grapes","oranges"] };
const sing = w => w.replace(/ies$/, "y").replace(/oes$/, "o").replace(/(ches|shes)$/, m => m.slice(0, -2)).replace(/([^s])s$/, "$1");
const words = t => t.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(w => w && !STOP.has(w));
function matchRows(it, org) {
  const q = it.toLowerCase().replace(/organic|frozen|fresh/g, "").trim(), qw = words(it).map(sing);
  const syn = SYN[q] || SYN[qw.join(" ")] || qw.flatMap(w => SYN[w] || []);
  return org.items.filter(r => {
    const hay = (r.commodity + " " + (r.variety || "")).toLowerCase(), hw = words(hay).map(sing);
    if (syn.some(s => hay.includes(s))) return true;
    return qw.length && qw.every(w => hw.some(h => h === w || (w.length >= 4 && (h.startsWith(w) || w.startsWith(h) || h.endsWith(w)))));
  });
}
async function compare(zip, items, mode, out) {
  const [org, kroger, reports] = await Promise.all([DATA.org, krogerPrices(zip, items.map(i => "organic " + i)), shopperReports("grocery", zip)]);
  let html = "";
  if (!org) { $(out).innerHTML = `<div class="empty">Organic price data didn't load. Please refresh the page.</div>`; return; }
  const found = [], miss = [];
  items.forEach(it => { const rows = matchRows(it, org); rows.length ? found.push([it, rows.sort((x, y) => y.ads - x.ads)]) : miss.push(it); });
  html += `<h3>Organic benchmark prices <small class="muted">(USDA, week of ${esc(org.reportDate)})</small></h3>
  <p class="note">${NOTE}</p>`;
  html += found.length ? found.map(([it, rows]) => `<div class="itemcard"><b>Organic ${esc(it)}</b>
    <div class="tbl"><table><thead><tr><th>Variety</th><th>Size</th><th>Avg advertised price</th><th>Ads</th></tr></thead><tbody>
    ${rows.slice(0, 8).map(r => `<tr><td>${esc(r.variety || r.commodity)}</td><td>${esc(r.unit)}</td><td class="low">${money(r.price)}</td><td><small class="muted">${r.ads.toLocaleString()}</small></td></tr>`).join("")}</tbody></table></div></div>`).join("")
    : `<div class="empty">None of these items are in this week's USDA organic report.</div>`;
  if (miss.length) { const avail = [...new Set(org.items.map(r => r.commodity.split(/[,(]/)[0].trim().toLowerCase()))].sort();
    html += `<p class="muted">No USDA organic benchmark this week for: <b>${miss.map(esc).join(", ")}</b>. Items with prices this week (tap to add):</p><div class="chips">${avail.map(c => `<button type="button" class="chip" data-add="${esc(c)}">${esc(c)}</button>`).join("")}</div>`; }
  html += `<p class="src">${esc(org.note)} Ad period ${esc(org.adPeriod)}.</p>` + srcLine(org.source, org.sourceUrl, org.retrieved);
  const rowsLive = [...kroger, ...reports.filter(r => /organic/i.test(r.item))];
  if (rowsLive.length) html += `<h3>Store prices near ${zip}</h3><div class="tbl"><table><tbody>${rowsLive.map(r => `<tr><td>${esc(r.item)}</td><td>${esc(r.store)}</td><td>${money(r.price)}</td><td><small class="muted">${esc(r.source)} · ${esc((r.asOf || "").slice(0, 10))}</small></td></tr>`).join("")}</tbody></table></div>`;
  $(out).innerHTML = html;
  $(out).querySelectorAll("[data-add]").forEach(b => b.onclick = () => { const ta = $("#listo"); ta.value = ta.value.split("\n").filter(l => !miss.includes(l.trim().toLowerCase())).concat(b.dataset.add).join("\n"); $("#fo").requestSubmit(); });
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
