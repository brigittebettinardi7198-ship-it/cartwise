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
