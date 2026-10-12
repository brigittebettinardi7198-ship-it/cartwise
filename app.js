const $ = s => document.querySelector(s);
const money = n => "$" + Number(n).toFixed(2);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const srcLine = (name, url, date) => `<p class="src">Source: <a href="${url}" target="_blank" rel="noopener">${esc(name)}</a> · retrieved ${esc(date)}</p>`;

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
/* Organic list: instant, chip-based, saved in localStorage. */
const LS = "cw_list", POPULAR = ["apples","bananas","berries","spinach","avocados","carrots","kale","potatoes","grapes","tomatoes","salad","onions"];
let LIST = JSON.parse(localStorage.getItem(LS) || "null") || ["apples","bananas","frozen berries","spinach","avocados","carrots"];
const save = () => localStorage.setItem(LS, JSON.stringify(LIST));
function addItem(v) { v = v.trim().toLowerCase(); if (v && !LIST.includes(v)) { LIST.push(v); save(); } $("#osearch").value = ""; renderOrganic(); }
function removeItem(v) { LIST = LIST.filter(x => x !== v); save(); renderOrganic(); }
const chip = (t, attr, x) => `<button type="button" class="chip${x ? " on" : ""}" ${attr}="${esc(t)}">${esc(t)}${x ? ' <span aria-hidden="true">×</span>' : ""}</button>`;
async function renderOrganic() {
  const org = await DATA.org, out = $("#outo");
  $("#mylist").innerHTML = LIST.length ? LIST.map(i => chip(i, "data-rm", 1)).join("") : `<span class="muted">Your list is empty. Add an item above.</span>`;
  $("#popular").innerHTML = POPULAR.filter(p => !LIST.includes(p)).slice(0, 8).map(p => chip(p, "data-add")).join("");
  renderOrgTips(LIST); renderTips(LIST);
  if (!org) { out.innerHTML = `<div class="empty">Organic price data didn't load. Please refresh the page.</div>`; return; }
  if (!LIST.length) { out.innerHTML = ""; return; }
  const found = [], miss = [];
  LIST.forEach(it => { const rows = matchRows(it, org); rows.length ? found.push([it, rows.sort((x, y) => y.ads - x.ads)]) : miss.push(it); });
  const avail = [...new Set(org.items.map(r => r.commodity.split(/[,(]/)[0].trim().toLowerCase()))].sort();
  out.innerHTML = `<p class="note">${NOTE}</p>
  <div class="cards">${found.map(([it, rows]) => { const top = rows[0], frozen = /frozen/i.test(it);
    return `<article class="pc"><header><b>${esc(it)}</b>${frozen ? '<span class="pill">fresh price</span>' : ""}</header>
      <div class="big">${money(top.price)}</div><div class="sz">${esc(top.unit)} · ${esc(top.variety || top.commodity)}</div>
      ${rows.length > 1 ? `<ul>${rows.slice(1, 4).map(r => `<li><span>${esc(r.variety || r.commodity)}, ${esc(r.unit)}</span><b>${money(r.price)}</b></li>`).join("")}</ul>` : ""}</article>`; }).join("")}</div>
  ${miss.length ? `<p class="muted miss">No USDA organic benchmark this week for: <b>${miss.map(esc).join(", ")}</b>. Try one of these:</p><div class="chips">${avail.filter(c => !LIST.includes(c)).map(c => chip(c, "data-add")).join("")}</div>` : ""}
  <p class="src">USDA AMS national weighted-average advertised organic prices, week of ${esc(org.reportDate)} (ads ${esc(org.adPeriod)}). Shelf prices may be higher. <a href="${org.sourceUrl}" target="_blank" rel="noopener">Source</a> · retrieved ${esc(org.retrieved)}</p>`;
}
DATA.org.then(org => { if (org) $("#olist").innerHTML = [...new Set(org.items.map(r => r.commodity.split(/[,(]/)[0].trim().toLowerCase()).concat(["berries","greens","frozen berries","sweet potatoes"]))].sort().map(c => `<option value="${esc(c)}">`).join(""); });
document.addEventListener("click", e => { const a = e.target.closest("[data-add]"), r = e.target.closest("[data-rm]"); if (a) addItem(a.dataset.add); if (r) removeItem(r.dataset.rm); });
$("#oadd").onclick = () => addItem($("#osearch").value);
$("#osearch").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addItem(e.target.value); } });
$("#osearch").addEventListener("input", e => { if (e.inputType === "insertReplacementText" || e.inputType == null) addItem(e.target.value); }); // datalist pick
renderOrganic();
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
  document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", x === b));
  document.querySelectorAll(".panel").forEach(p => p.hidden = p.id !== b.dataset.t); history.replaceState(null, "", "#" + b.dataset.t);
});
const tb = document.querySelector(`.tabs button[data-t="${location.hash.slice(1)}"]`); if (tb) tb.click();
/* Compare stores mode */
document.querySelectorAll(".segb").forEach(b => b.onclick = () => {
  document.querySelectorAll(".segb").forEach(x => x.classList.toggle("on", x === b));
  $("#m-bench").hidden = b.dataset.mode !== "bench"; $("#m-stores").hidden = b.dataset.mode !== "stores"; localStorage.setItem("cw_mode", b.dataset.mode);
});
if (localStorage.getItem("cw_mode") === "stores") document.querySelector('.segb[data-mode="stores"]').click();
let SEL = JSON.parse(localStorage.getItem("cw_sel") || "null");
async function renderStores() {
  const [st, org] = await Promise.all([DATA.stores, DATA.org]); if (!st) { $("#sout").innerHTML = `<div class="empty">Store data didn't load.</div>`; return; }
  const all = [...new Set(st.items.map(i => i.item))]; SEL ||= ["strawberries", "spinach", "avocados", "carrots", "kale", "cucumbers", "sweet potatoes", "bananas"];
  $("#schips").innerHTML = all.map(i => `<button type="button" class="chip${SEL.includes(i) ? " on" : ""}" data-sel="${esc(i)}">${esc(i)}${SEL.includes(i) ? ' <span aria-hidden="true">×</span>' : ""}</button>`).join("");
  const keys = Object.keys(st.stores), per = r => r.price / r.qty;
  const rowsHtml = SEL.filter(i => all.includes(i)).map(it => {
    const rs = keys.map(k => st.items.find(x => x.item === it && x.store === k));
    const dims = new Set(rs.filter(Boolean).map(r => r.dim)), comparable = rs.filter(Boolean).length > 1 && dims.size === 1;
    const best = comparable ? Math.min(...rs.filter(Boolean).map(per)) : null;
    const u = org ? matchRows(it, org).sort((a, b) => b.ads - a.ads)[0] : null;
    return `<tr><th scope="row">${esc(it)}${rs.filter(Boolean).length > 1 && !comparable ? '<br><small class="muted">sizes differ</small>' : ""}</th>${rs.map(r => r ? `<td class="${comparable && per(r) === best ? "best" : ""}"><b>${money(r.price)}</b>${r.regular ? ` <s class="muted">${money(r.regular)}</s>` : ""}<br><small><a href="${r.sourceUrl}" target="_blank" rel="noopener">${esc(r.size)}</a></small></td>` : `<td class="np">not published</td>`).join("")}<td class="bm">${u ? `<b>${money(u.price)}</b><br><small class="muted">${esc(u.unit)}</small>` : '<span class="np">–</span>'}</td></tr>`;
  }).join("");
  $("#sout").innerHTML = `<p class="note">${NOTE}</p>
  <div class="tbl"><table class="stbl"><thead><tr><th>Item</th>${keys.map(k => `<th>${esc(st.stores[k].name)}</th>`).join("")}<th>USDA benchmark</th></tr></thead><tbody>${rowsHtml || `<tr><td colspan="4" class="muted">Tap items above to compare.</td></tr>`}</tbody></table></div>
  <p class="muted"><small>Green = cheapest per unit when sizes are comparable. Struck-through = regular price (sale shown). <b>Not published:</b> ${st.notPublished.stores.join(", ")}. ${esc(st.notPublished.reason)} <b>Not checked yet:</b> ${st.notChecked.join(", ")}.</small></p>
  <p class="src">${keys.map(k => `<b>${esc(st.stores[k].name)}:</b> ${esc(st.stores[k].note)}`).join(" ")} Retrieved ${esc(st.retrieved)}. USDA benchmark: national average advertised price, week of ${esc(org?.reportDate || "")}.</p>`;
}
document.addEventListener("click", e => { const b = e.target.closest("[data-sel]"); if (!b) return; const v = b.dataset.sel; SEL = SEL.includes(v) ? SEL.filter(x => x !== v) : [...SEL, v]; localStorage.setItem("cw_sel", JSON.stringify(SEL)); renderStores(); });
renderStores();
