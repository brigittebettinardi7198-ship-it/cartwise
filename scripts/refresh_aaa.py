"""Refresh AAA state gas averages -> data/gas_aaa.json. The site blocks plain HTTP clients, so this uses headless Chrome (pip install playwright)."""
import json, datetime
from playwright.sync_api import sync_playwright
URL = "https://gasprices.aaa.com/state-gas-price-averages/"
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", args=["--disable-blink-features=AutomationControlled"])
    pg = b.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36")
    pg.goto(URL, timeout=45000); pg.wait_for_selector("table tbody tr", timeout=20000)
    rows = pg.eval_on_selector_all("table tbody tr", "rs=>rs.map(r=>[...r.querySelectorAll('td')].map(td=>td.innerText.trim()))")
    pg.goto("https://gasprices.aaa.com/", timeout=45000); pg.wait_for_selector("table tr", timeout=20000)
    nat = pg.eval_on_selector_all("table tr", "rs=>rs.map(r=>[...r.querySelectorAll('td,th')].map(td=>td.innerText.trim()))")
    b.close()
f = lambda v: round(float(v.replace("$","")), 3)
states = {r[0]: {"regular":f(r[1]),"midgrade":f(r[2]),"premium":f(r[3]),"diesel":f(r[4])} for r in rows if len(r) >= 5}
assert len(states) >= 50, "parse failed"
cur = next(r for r in nat if r and r[0].startswith("Current"))
national = {"regular":f(cur[1]),"midgrade":f(cur[2]),"premium":f(cur[3]),"diesel":f(cur[4])}
json.dump({"source":"AAA Gas Prices, state averages","sourceUrl":URL,"retrieved":datetime.date.today().isoformat(),"national":national,"nationalSourceUrl":"https://gasprices.aaa.com/","states":states}, open("data/gas_aaa.json","w"), indent=1)
print(len(states), "states")
