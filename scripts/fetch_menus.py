from playwright.sync_api import sync_playwright
import re
U={"olivegarden":"https://www.olivegarden.com/menu/entrees","applebees":"https://www.applebees.com/en/menu/full-menu","chilis":"https://www.chilis.com/menu","chipotle":"https://www.chipotle.com/order","dennys":"https://www.dennys.com/menu","texasroadhouse":"https://www.texasroadhouse.com/menu"}
with sync_playwright() as p:
    b=p.chromium.launch(channel="chrome",args=["--disable-blink-features=AutomationControlled"]); 
    for k,u in U.items():
        pg=b.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36")
        try:
            pg.goto(u,timeout=30000); pg.wait_for_timeout(4000); t=pg.inner_text("body")
            prices=re.findall(r'([^\n]{3,60})\n[^\n]{0,80}?\$(\d+\.\d\d)',t)
            print(k,pg.title()[:50],len(t),len(prices),prices[:4])
            open(f"menu_{k}.txt","w").write(t)
        except Exception as e: print(k,"ERR",str(e)[:80])
        pg.close()
    b.close()
