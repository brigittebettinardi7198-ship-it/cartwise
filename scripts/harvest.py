"""Fetch restaurant websites, find a menu page, extract (item, price) pairs from visible text. Writes cand.json."""
import json, re, sys, random, concurrent.futures as cf, urllib.parse, html
import requests
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"}
def text_of(h):
    h = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|div|li|h\d|tr|td|span|a|dd|dt)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return "\n".join(l.strip() for l in t.splitlines() if l.strip())
PRICE = re.compile(r"^\$?\s?(\d{1,2}(?:\.\d{2}))$|^\$(\d{1,2})$")
def items_from(t):
    L = [l for l in t.split("\n") if len(l) < 120]; out = []
    for i, l in enumerate(L):
        m = re.match(r"^([A-Za-z][A-Za-z0-9 '&,\-\.\(\)/éèñ]{2,60}?)\s*(?:\.{2,}|\s[-–|]\s|\s{1,})\s*\$\s?(\d{1,2}(?:\.\d{2})?)$", l)
        if m: out.append((m.group(1).strip(" .-"), float(m.group(2)))); continue
        p = PRICE.match(l)
        if p and i > 0:
            nm = L[i-1]
            if re.match(r"^[A-Za-z][A-Za-z0-9 '&,\-\.\(\)/éèñ]{2,60}$", nm) and not PRICE.match(nm) and len(nm.split()) <= 9:
                out.append((nm, float(p.group(1) or p.group(2))))
    seen, res = set(), []
    for n, pr in out:
        k = n.lower()
        if k in seen or not (1 <= pr <= 80) or re.search(r"(?i)gift|delivery|catering|fee|tax|order|cart|shipping|total|minimum|reward", n): continue
        seen.add(k); res.append({"name": n, "price": pr})
    return res
def get(u):
    r = requests.get(u, headers=UA, timeout=12, allow_redirects=True)
    return r.url, r.text if r.ok and "html" in r.headers.get("content-type", "") else ""
def try_place(p):
    site = p["website"]
    if not site.startswith("http"): site = "https://" + site
    try:
        url, h = get(site)
        if not h: return None
        cands = [url]
        for href in re.findall(r'href=["\']([^"\']+)["\']', h):
            if re.search(r"(?i)menu", href) and not re.search(r"(?i)\.(pdf|jpg|png)$|facebook|instagram|doordash|grubhub|ubereats|toasttab|order", href):
                cands.append(urllib.parse.urljoin(url, href))
        best = None
        for u in list(dict.fromkeys(cands))[:4]:
            try:
                u2, h2 = (url, h) if u == url else get(u)
                its = items_from(text_of(h2))
                if not best or len(its) > len(best[1]): best = (u2, its)
            except Exception: pass
        if best and len(best[1]) >= 6: return {**p, "menuUrl": best[0], "items": best[1]}
    except Exception: return None
if __name__ == "__main__":
    places = json.load(open("places.json")); res = []
    with cf.ThreadPoolExecutor(24) as ex:
        for r in ex.map(try_place, places):
            if r: res.append(r); print(len(res), r["name"], len(r["items"]), flush=True)
    json.dump(res, open("cand.json", "w"), indent=1)
