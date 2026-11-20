# HTA Europe Hub

Claude Code reads this file automatically. It holds the project brief and the build instructions.

## The idea
A free, open-source hub of HTA and reimbursement decisions across Europe, for all countries and all therapy areas (an open-source version of what the IQVIA HTA Accelerator offers). Oncology in Italy, France and Germany is only the starting point for version 1. You click on a country and get direct access to its HTA body (e.g. G-BA/IQWiG in Germany, HAS in France, AIFA in Italy) and its latest news and updates, shown automatically. A free alternative to paid tools like the IQVIA HTA Accelerator.

Principle: countries / HTA bodies come first, not drugs. Home page starts with countries; inside a country you can search by drug name and see prices.

## Who it is for
- Industry and HTA professionals (main audience)
- Students
- Not for patients – no patient engagement on the site

## Scope for version 1
- Countries: Italy, France, Germany (I know Italy best and will check it)
- Therapy area: oncology only
- Decisions from 2025 onward (EU HTA Regulation applies from 12 January 2025)
- Use only official sources

## What the user can do
- Filter by country, disease area (e.g. lung cancer, breast cancer) and drug
- Open a drug page that shows the full path for that drug:
  1. EU: EMA approval (EPAR) and the EU Joint Clinical Assessment (JCA) if there is one
  2. Germany: G-BA benefit assessment decision and the negotiated price (Erstattungsbetrag) if public
  3. France: HAS Transparency Committee opinion (SMR/ASMR) and the price
  4. Italy: AIFA reimbursement decision and price from the Gazzetta Ufficiale
- Each step shows the date, the outcome, and a link to the official document
- Order on the drug page: (1) the EMA's own official EPAR summary, copied word for word (do not rewrite or summarize it with AI), with the line "Source: European Medicines Agency" and a link to the full EPAR, (2) opinions per country (G-BA, HAS, AIFA), (3) reimbursement decision per country, (4) pricing at the end
- Pricing section: one row per country with list price, date, and the official source (Gazzetta Ufficiale, Journal Officiel/BDPM, Lauer-Taxe). A switch to show or hide pricing, and a filter for "price public / not public"
- Download the filtered results as CSV
- A news section per country with the latest updates from each HTA body

## Data sources
- EU: EMA EPARs; JCA reports on the HTA Europa page
- All countries (titles and links only): INAHTA International HTA Database – https://database.inahta.org/
- Germany: G-BA benefit assessment decisions; Erstattungsbetrag (since the Medizinforschungsgesetz companies can keep it confidential)
- France: Base de données publique des médicaments – https://base-donnees-publique.medicaments.gouv.fr/ (price and reimbursement rate); liste en sus via UCD files on data.gouv.fr
- Italy: AIFA determinations in Gazzetta Ufficiale (list prices; confidential discounts are not public)
- Not public: EURIPID and all confidential discounts / managed entry agreements
- Only list prices are public. Mark price as "not public" when confidential. Never guess a price.
- Before copying text from G-BA, HAS or AIFA, check each site's reuse terms. Until then show only decision, date and link.

## Start with one test drug
Build the drug page with Alecensa (alectinib) first, filled in by hand from the official sources, so I can check it. (Alecensa has no JCA – it predates 2025.) Then add more drugs.

## Tech setup (no paid server)
- Static site: plain HTML, CSS and JavaScript, no heavy framework
- All data in simple JSON files I can edit by hand (one file per drug)
- Hosted for free on GitHub Pages
- A daily GitHub Actions job runs a small Python script that checks each HTA body's news page or RSS feed and saves new items to JSON. Scrape politely (once a day, respect robots.txt).

## Design
Clean and professional. Home page with country cards and filters. If my AfriSwiss project is available, reuse its style (country cards instead of event cards).

## Open source
Add a README (what it is, how to run it, how to add a drug or a country) and an MIT license.

## Working style
- Keep the build simple and token-efficient: plan briefly first, then build in small steps, don't over-engineer
- Show me the plan and the folder structure first, then wait for my OK
- Build one piece at a time and tell me what you did in 2-3 lines
- Ask me before installing anything big

## Later (not for version 1)
- Add Spain and the Netherlands
- How to make money from it while keeping it free
- Link to the AI PICO / country HTA framework idea
- Work with my friend (web designer) on the design
