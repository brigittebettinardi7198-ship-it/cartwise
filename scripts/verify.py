import json,re,requests,html,concurrent.futures as cf
from harvest import text_of,UA
m=json.load(open('menus.json'))
def chk(o):
    try: t=text_of(requests.get(o['menuUrl'],headers=UA,timeout=15).text)
    except Exception: return o,[]
    ok=[]
    for it in o['items']:
        if re.search(r',',it['name']) and len(it['name'].split())>3: continue
        i=t.find(it['name'])
        if i<0: continue
        win=t[i:i+400]; p=f"{it['price']:.2f}"; p0=p.rstrip('0').rstrip('.') if p.endswith('.00') else p
        if re.search(r'\$?\s?'+re.escape(p)+r'\b',win) or re.search(r'\$\s?'+re.escape(p0)+r'\b',win) or re.search(r'(?<![\d.])'+re.escape(p0)+r'(?![\d])',win[len(it['name']):len(it['name'])+40]):
            ok.append(it)
    return o,ok
res=[]
with cf.ThreadPoolExecutor(16) as ex:
    for o,ok in ex.map(chk,m):
        print(f"{o['name'][:30]:30} {len(ok)}/{len(o['items'])}")
        if len(ok)>=4 and o['name']!="So Gong Dong Tofu & Korean BBQ": o['items']=ok; res.append(o)
json.dump(res,open('menus_v.json','w'),indent=1); print(len(res))
