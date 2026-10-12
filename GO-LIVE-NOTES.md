# CartWise go-live notes
- **Zero API fees.** Data comes from free public sources: BLS API v1 (no key), AAA public state averages, and public chain menus. No paid APIs.
- **Hosting:** GitHub Pages (free, fully static). No Netlify and no functions in v1. A weekly refresh runs on free GitHub Actions.
- **Real data only:** no sample prices. Unverified items are left out. Every number links to its source with a retrieval date.
- **Known gaps:** organic shelf prices (no fetchable public source found) and more restaurant chains (Olive Garden, Applebee's, Chili's, Chipotle, and Texas Roadhouse need a store selected before they show prices). Denny's is a single Seattle store.
- **Optional later:** Kroger API proxy (free key) and Supabase shopper reports, in /optional. Each needs a serverless host.
- **Before launch:** set the real domain (replace cartwise.example in index.html, robots.txt, sitemap.xml, and llms.txt), or use the github.io URL.
