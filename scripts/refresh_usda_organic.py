"""USDA AMS 'Weekly Grocery Store Specialty Crops Feature Activity' (FVWRETAIL): NATIONAL ORGANIC SUMMARY -> data/organic_usda.json.
Free public report; prices are weighted averages of advertised retail prices (ads/circulars) at major US grocery chains."""
import re, json, subprocess, urllib.request, datetime, tempfile, os
URL = "https://www.ams.usda.gov/mnreports/fvwretail.pdf"
pdf = os.path.join(tempfile.gettempdir(), "fvwretail.pdf")
urllib.request.urlretrieve(URL, pdf)
txt = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
date = re.search(r"(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\w{3} \d{1,2}, \d{4})", txt).group(2)
period = re.search(r"period of ([\d/]+ to [\d/]+)", txt).group(1)
sec = txt[txt.index("NATIONAL ORGANIC SUMMARY"):txt.index("REGIONAL ORGANIC DETAILS")]
num = re.compile(r"^[\d,]+(\.\d+)?$")
rows, group = [], None
for line in sec.splitlines():
    s = line.strip()
    if s in ("Fruit", "Vegetables", "Potatoes & Onions", "Other Specialty Crop Items"): group = s; continue
    t = re.split(r"\s{2,}", s)
    if len(t) < 4 or t[0] in ("Commodity",) or not num.match(t[-1]): continue
    if num.match(t[2]): commodity, variety, unit, nums = t[0], "", t[1], t[2:]
    else: commodity, variety, unit, nums = t[0], t[1], t[2], t[3:]
    if len(nums) < 2 or "." not in nums[1]: continue
    rows.append({"group": group, "commodity": commodity, "variety": variety.title() if variety.isupper() else variety, "unit": unit, "ads": int(nums[0].replace(",", "")), "price": float(nums[1])})
assert len(rows) > 20, "parse failed"
json.dump({"source": "USDA AMS Market News, Weekly Grocery Store Specialty Crops Feature Activity (FVWRETAIL), National Organic Summary",
  "sourceUrl": URL, "reportDate": date, "adPeriod": period, "retrieved": datetime.date.today().isoformat(),
  "note": "Weighted average ADVERTISED (sale/circular) prices for organic produce at major US grocery chains, excluding AK and HI. Shelf prices may be higher.",
  "items": rows}, open("data/organic_usda.json", "w"), indent=1)
print(len(rows), "organic rows,", date)
