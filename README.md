# HTA Europe Hub

A free, open-source hub of HTA (health technology assessment) and reimbursement decisions across Europe: every country's HTA body, its decisions, prices and latest news, for all therapy areas. An open alternative to paid HTA trackers such as the IQVIA HTA Accelerator.

**Countries first:** pick a country, see its HTA body, how its process works, its latest decisions and news, then search by drug. Each drug page shows the full path from EU approval to national reimbursement and price.

- **Goal:** all European countries and all therapy areas, added step by step
- **Starting point (version 1):** Germany, France, Italy · oncology · decisions from 2025 (the EU HTA Regulation applies from 12 January 2025)
- **Audience:** industry and HTA professionals, students. Not built for patients.
- **Sources:** official sources only (EMA, G-BA/IQWiG, HAS, BDPM, AIFA, Gazzetta Ufficiale). Every step links to the official document.

> Always check the linked official document. Prices shown are public list prices; confidential discounts and managed entry agreements are not public and are never estimated.

## What you can do

- See every HTA body in Europe (32 countries, 70 bodies), each with its official link and the sources that list it
- Search any drug from the home page, or browse all drugs A–Z with their status in every country
- Filter decisions by country, disease area and drug, and download the results as CSV
- Open a drug page, in this order:
  1. **EPAR summary**, copied word for word from the EMA (not rewritten), with a link to the full EPAR, and the EU Joint Clinical Assessment if there is one
  2. **HTA opinions** per country (G-BA, HAS, AIFA)
  3. **Reimbursement decisions** per country
  4. **Pricing**: one row per country with list price, date and official source; can be hidden, and filtered by "price public / not public"
- Read the latest updates from each HTA body on its country page (refreshed daily)

## Run it on your computer

It is a static site: plain HTML, CSS and JavaScript, no build step. Because it loads JSON files, open it through a small local server rather than by double-clicking `index.html`:

```
python -m http.server 8000
```

Then open http://localhost:8000.

## Folder structure

```
index.html                 the page (hash routes: #/country/IT, #/drug/alecensa)
assets/css/style.css
assets/js/app.js
data/
  countries.json           HTA bodies, process steps, news feeds per country
  news.json                latest updates (written by scripts/fetch_news.py)
  drugs/
    index.json             list of drug ids shown on the site
    <id>.json              one file per drug
scripts/
  fetch_ema_overview.py    copies the EMA EPAR summary into each drug file
  fetch_news.py            collects news from the HTA bodies' RSS feeds
.github/workflows/
  fetch-news.yml           runs fetch_news.py once a day
```

Both scripts use only Python's standard library (Python 3.9+), respect each site's robots.txt and pause between requests.

## Add a drug

1. Copy an existing file in `data/drugs/` (for example `alecensa.json`) to `data/drugs/<new-id>.json` and edit it by hand:
   - `brand`, `inn`, `company`, `therapy_area`, `disease_area`, `condition`, `indication_tracked`
   - `eu`: authorisation dates, `epar_url` (the EMA medicine page), `epar_summary_url`, `jca` / `jca_note`
   - `countries.DE` / `FR` / `IT`: `hta_body`, `decision_date` (YYYY-MM-DD), `outcome_short`, `opinion`, `comparator`, `reimbursement`, `documents` (label + link to the official document)
   - `price` per country: set `public` to `true` with `value`, `type`, `date`, `source`, `source_url`; `false` when the price is confidential; `null` when not added yet. Never guess a price.
   - No decision yet in a country? Leave it out of `countries` and add a line under `pending`, for example `"pending": {"FR": "No HAS opinion yet."}`
2. Add the id to `data/drugs/index.json`.
3. Fill in the EPAR summary from the EMA, word for word:
   ```
   python scripts/fetch_ema_overview.py <new-id>
   ```
4. Check the page at `http://localhost:8000/#/drug/<new-id>`.

## HTA bodies across Europe

`scripts/build_hta_bodies.py` holds the list of HTA bodies for every European country and writes it into `data/countries.json`. Sources, cross-checked (each body shows which ones name it):

- **European Commission** – members of the HTA Coordination Group, medicinal products (EU 27 + Iceland, Liechtenstein, Norway)
- **INAHTA** – members list (some national bodies, such as AIFA or AEMPS, are not INAHTA members)

Edit the lists in the script, then run `python scripts/build_hta_bodies.py`.

## Add a country (decisions)

The country's HTA bodies are already listed. To start tracking its decisions:

1. In `data/countries.json`, set `"tracked": true` for that country (for example `ES`) and add `system`, `process` steps, `rating`, and `news_feeds` (official RSS feeds; an optional `exclude` word list removes off-topic items).
2. Add the code to `COUNTRY_ORDER` at the top of `assets/js/app.js` and to the country links in `index.html`.
3. Add that country's decisions to the drug files under `countries.<code>`.

## News updates

`scripts/fetch_news.py` reads the feeds in `countries.json` and adds new titles, dates and links to `data/news.json` (newest 40 per country). On GitHub, the workflow in `.github/workflows/fetch-news.yml` runs it once a day and commits the changes. Run it by hand with:

```
python scripts/fetch_news.py
```

## Publish on GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository: **Settings → Pages → Build and deployment → Deploy from a branch**, choose `main` and `/ (root)`.
3. In **Settings → Actions → General → Workflow permissions**, allow **Read and write permissions** so the daily news job can commit.

## Reuse of source content

The EMA allows reuse of its content with acknowledgement; EPAR summaries are shown word for word with "Source: European Medicines Agency". For G-BA, HAS and AIFA the site shows only the decision, date, a short outcome and a link to the official document, until each site's reuse terms have been checked.

## Contributing

Corrections and new drugs are welcome: open an issue or a pull request, and include the link to the official source for every fact.

## License

[MIT](LICENSE)
