"""Refresh BLS Average Price Data (U.S. city average) -> data/bls_prices.json. No API key (BLS API v1)."""
import json, urllib.request, datetime
SERIES = {
 "APU0000708111":("eggs","Eggs, grade A, large","dozen"),
 "APU0000709112":("milk","Milk, fresh, whole, fortified","gallon"),
 "APU0000703112":("ground beef","Ground beef, 100% beef","lb"),
 "APU0000FF1101":("chicken breast","Chicken breast, boneless","lb"),
 "APU0000702111":("bread","Bread, white, pan","lb"),
 "APU0000701312":("rice","Rice, white, long grain, uncooked","lb"),
 "APU0000701322":("pasta","Spaghetti and macaroni","lb"),
 "APU0000711211":("bananas","Bananas","lb"),
 "APU0000712311":("tomatoes","Tomatoes, field grown","lb"),
 "APU0000710212":("cheese","Cheddar cheese, natural","lb"),
 "APU0000FS1101":("butter","Butter, salted, grade AA, stick","lb"),
 "APU0000717311":("coffee","Coffee, 100%, ground roast","lb"),
 "APU0000702421":("cookies","Cookies, chocolate chip","lb"),
 "APU0000710411":("ice cream","Ice cream, prepackaged, bulk, regular","1/2 gallon"),
}
req = urllib.request.Request("https://api.bls.gov/publicAPI/v1/timeseries/data/", data=json.dumps({"seriesid":list(SERIES)}).encode(), headers={"Content-Type":"application/json"})
d = json.load(urllib.request.urlopen(req, timeout=30))
items = []
for s in d["Results"]["series"]:
    if not s["data"]: continue
    cur = s["data"][0]
    if int(cur["year"]) < datetime.date.today().year - 1: continue  # skip discontinued series
    prev = next((x for x in s["data"] if x["year"] == str(int(cur["year"])-1) and x["period"] == cur["period"]), None)
    key, label, unit = SERIES[s["seriesID"]]
    items.append({"key":key,"label":label,"unit":unit,"price":round(float(cur["value"]),2),
      "period":f'{cur["periodName"]} {cur["year"]}',"yoyPct":round((float(cur["value"])/float(prev["value"])-1)*100,1) if prev else None,
      "series":s["seriesID"],"sourceUrl":f'https://data.bls.gov/timeseries/{s["seriesID"]}'})
out = {"source":"U.S. Bureau of Labor Statistics, Average Price Data (U.S. city average)","sourceUrl":"https://www.bls.gov/cpi/factsheets/average-prices.htm","retrieved":datetime.date.today().isoformat(),"items":items}
json.dump(out, open("data/bls_prices.json","w"), indent=1); print(len(items), "items")
