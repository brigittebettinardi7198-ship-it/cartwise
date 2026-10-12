/* Contextual tips: matched to list keywords. General tips are fallbacks. */
const TIPS = [
 {k:["beef","chicken","pork","steak","meat","turkey"],tag:"Markdown timing",t:"Shop the meat case early",d:"Many meat departments reduce packages that are near the sell-by date first thing in the morning. Look for orange or red 'Manager's Special' stickers, then freeze the meat the same day."},
 {k:["bread","bagel","muffin","bakery","rolls"],tag:"Markdown timing",t:"Bakery discounts come late",d:"In-store bakery items are often reduced in the last few hours before closing, or the next morning as 'day-old.' Bread freezes well for up to 3 months."},
 {k:["pepper","cumin","spice","cinnamon","paprika","turmeric","oregano"],tag:"Aisle swap",t:"Buy spices in the international aisle",d:"The same ground spices in cellophane bags in the Hispanic or Indian section often cost a fraction of the glass jar in the baking aisle. Compare the price per ounce."},
 {k:["rice","beans","lentil","oats","flour"],tag:"Bulk swap",t:"Rice: go bigger, or go international",d:"A 10–20 lb bag of rice in the international aisle or at a warehouse store usually beats a 2 lb bag on unit price, and dry rice keeps for years in a sealed container."},
 {k:["almond","nuts","walnut","cashew","pecan","peanut"],tag:"Bulk swap",t:"Nuts cost less loose or in baking bags",d:"Baking-aisle nuts and bulk bins are often cheaper per ounce than snack-aisle canisters. Store them in the freezer so they don't go rancid."},
 {k:["cereal","chips","cookies","crackers","coffee","ice cream","detergent","toilet paper"],tag:"Shrinkflation alert",t:"Check the net weight, not the box",d:"Cereal, snacks, coffee, and paper goods are common shrinkflation targets. A box that looks the same may hold fewer ounces. Compare the unit price on the shelf tag."},
 {k:["cereal","milk","cheese","butter","yogurt","pasta","eggs","coffee"],tag:"Store-brand twin",t:"Try the store brand on staples",d:"Store brands like Kroger, Great Value, and Aldi labels typically cost 20–30% less. Many are made in the same plants as name brands, so check the ingredient list for a near-identical match."},
 {k:["coffee","cereal","yogurt","detergent","cheese"],tag:"Coupon stacking",t:"Stack four layers of savings",d:"Sale price, then the store's digital coupon, then a manufacturer coupon (if the store allows it), then a cash-back app rebate (such as Ibotta or Fetch) after checkout."},
 {k:["eggs","milk","bananas","apples"],tag:"Unit-price trap",t:"Watch the unit on the tag",d:"Shelf tags may list 'per each' for one size and 'per lb' or 'per oz' for another. Convert to the same unit before you decide. Bagged produce is often cheaper per pound than loose."},
 {k:[],tag:"Price match",t:"Ask about price matching",d:"Some retailers match their own website price or a competitor's ad. Bring the ad on your phone, and check the store's policy first because policies change."},
 {k:[],tag:"Rain check",t:"Get a rain check when sale items run out",d:"If an advertised sale item is out of stock, ask customer service for a rain check so you can buy it later at the sale price. Not every chain offers them."},
 {k:[],tag:"Unit-price trap",t:"Bigger isn't always cheaper",d:"Family-size packs sometimes cost more per ounce than the regular size, especially when the smaller size is on sale. Always check the unit price."}
];
function tipsFor(items){
  const txt = items.join(" ");
  const hit = TIPS.filter(t => t.k.some(k => txt.includes(k)));
  const gen = TIPS.filter(t => !t.k.length);
  const seen = new Set(), out = [];
  [...hit, ...gen].forEach(t => { if (!seen.has(t.t)) { seen.add(t.t); out.push(t); } });
  return out.slice(0, 9);
}
function renderTips(items){
  const list = items.length ? tipsFor(items) : TIPS.filter(t => !t.k.length);
  document.getElementById("tipgrid").innerHTML = list.map(t => {
    const why = items.length && t.k.length ? ` <span class="muted">· for: ${items.filter(i => t.k.some(k => i.includes(k))).join(", ")}</span>` : "";
    return `<article class="tip"><span class="tag">${t.tag}</span>${why}<h3>${t.t}</h3><p>${t.d}</p></article>`;
  }).join("");
}
const ORG_TIPS = [
 {k:["strawberr","spinach","kale","apple","grape","peach","pear","cherr","celery","tomato","pepper"],tag:"Dirty Dozen",t:"Buy organic where it matters most",d:"The EWG 'Dirty Dozen' list (strawberries, spinach, kale, apples, grapes, peaches and others) tends to carry the most pesticide residue. If your budget is limited, spend your organic dollars here."},
 {k:["avocado","onion","pineapple","corn","papaya","mango","banana","cabbage","asparagus","watermelon"],tag:"Clean Fifteen",t:"Skip the organic premium on the Clean Fifteen",d:"Thick-skinned produce on the EWG 'Clean Fifteen' list (avocados, pineapple, onions and others) shows low residue even when grown conventionally. Buying it conventional can free up a few dollars."},
 {k:["berr","frozen","spinach","peas","broccoli","mango"],tag:"Frozen organic",t:"Frozen organic is the cheapest organic",d:"Frozen organic berries and vegetables are picked ripe, cost less per pound than fresh, and don't spoil. A large frozen bag usually has the best unit price."},
 {k:[],tag:"Store-brand organic",t:"Organic store brands carry the same seal",d:"Simple Truth Organic, SimplyNature, 365, Trader Joe's, and Great Value Organic use the same USDA Organic standard as name brands, usually for less."},
 {k:["eggs","milk","chicken","beef"],tag:"Label check",t:"Know which labels mean organic",d:"Only 'USDA Organic' is a regulated organic claim. 'Natural' and 'farm fresh' aren't, so don't pay an organic premium for them."}
];
function renderOrgTips(items){
  const txt=items.join(" "), hit=ORG_TIPS.filter(t=>!t.k.length||t.k.some(k=>txt.includes(k)));
  document.getElementById("orgtips").innerHTML=(items.length?hit:ORG_TIPS).map(t=>`<article class="tip"><span class="tag">${t.tag}</span><h3>${t.t}</h3><p>${t.d}</p></article>`).join("");
}
renderOrgTips([]);
