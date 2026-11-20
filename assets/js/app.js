// HTA Europe Hub — single-page app with hash routes:
//   #/                 home: search (therapy area -> disease -> country -> drug) + country tiles + result cards
//   #/country/IT       one country: its HTA bodies + the same search, limited to that country
//   #/drug/alecensa    one drug: status by country, EPAR summary -> opinions -> reimbursement -> pricing
//   #/drugs[/query]    all drugs A–Z with their status in every country
(function () {
  "use strict";

  const COUNTRY_ORDER = ["DE", "FR", "IT"];
  // Therapy areas shown in the search. Only those with data are selectable for now.
  const THERAPY_AREAS = ["Oncology", "Haematology", "Immunology", "Neurology", "Rare diseases"];
  const DISEASES = {
    Oncology: ["Lung cancer", "Breast cancer", "Gastric cancer", "Prostate cancer", "Colorectal cancer", "Melanoma", "Haematological cancers", "Other cancers"],
  };

  const state = {
    countries: {}, drugs: [], news: { items: [] }, showPrices: true,
    search: { therapy: "Oncology", disease: "", country: "", q: "", chip: "all" },
  };

  // ---------- data ----------
  async function getJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error("Could not load " + path);
    return res.json();
  }
  async function load() {
    if (window.HTA_DATA) { Object.assign(state, window.HTA_DATA); return; } // preview build
    const [countries, ids, news] = await Promise.all([
      getJSON("data/countries.json"),
      getJSON("data/drugs/index.json"),
      getJSON("data/news.json").catch(() => ({ items: [] })),
    ]);
    state.countries = countries;
    state.news = news;
    state.drugs = await Promise.all(ids.map((id) => getJSON("data/drugs/" + id + ".json")));
  }

  // ---------- helpers ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  const ext = (url, label) => '<a target="_blank" rel="noopener" href="' + esc(url) + '">' + esc(label) + "</a>";

  // Price states: public (true), not public (false), not added yet (null/missing); status_label overrides the wording
  function priceLabel(p) {
    if (p && p.public === true) return p.value;
    if (p && p.status_label) return p.status_label;
    if (p && p.public === false) return "Not public";
    return "Price to be added";
  }

  // One row per drug x country decision
  function decisions() {
    const rows = [];
    state.drugs.forEach((d) => COUNTRY_ORDER.forEach((code) => {
      const c = d.countries[code];
      if (!c) return;
      rows.push({
        id: d.id, drug: d.brand, inn: d.inn, therapy: d.therapy_area, disease: d.disease_area, indication: d.indication_tracked,
        country: code, countryName: state.countries[code].name, body: c.hta_body, date: c.decision_date,
        outcome: c.outcome_short || c.opinion, opinion: c.opinion, reimbursement: c.reimbursement,
        pricePublic: !!(c.price && c.price.public === true), priceShort: c.price && c.price.public === true ? (c.price.value_short || c.price.value) : "",
        price: priceLabel(c.price), 
        priceSource: c.price ? c.price.source : "",
      });
    }));
    return rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }

  function filtered(fixedCountry) {
    const s = state.search, q = norm(s.q), country = fixedCountry || s.country;
    return decisions().filter((r) =>
      (!s.therapy || r.therapy === s.therapy) &&
      (!s.disease || r.disease === s.disease) &&
      (!country || r.country === country) &&
      (!q || norm(r.drug).includes(q) || norm(r.inn).includes(q)) &&
      (s.chip === "all" || (s.chip === "price" ? r.pricePublic : (r.date || "").startsWith(s.chip))));
  }

  function downloadCSV(rows) {
    const cols = ["drug", "inn", "therapy", "disease", "indication", "countryName", "body", "date", "opinion", "reimbursement", "price", "priceSource"];
    const head = ["Drug", "INN", "Therapy area", "Disease", "Indication", "Country", "HTA body", "Decision date", "Opinion", "Reimbursement", "List price", "Price source"];
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const csv = [head.map(q).join(",")].concat(rows.map((r) => cols.map((c) => q(r[c])).join(","))).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "hta-europe-hub.csv";
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- shared pieces ----------
  const ICON = {
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    body: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V10m14 11V10M9 21v-6h6v6M2 10l10-6 10 6"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
  };

  // Where a drug stands in one country: decided / pending / no decision found
  function status(d, code) {
    const c = d.countries[code];
    if (c) return { k: "decided", label: "Decided " + fmtDate(c.decision_date), outcome: c.outcome_short || c.opinion };
    if (d.pending && d.pending[code]) return { k: "pending", label: "Pending", outcome: d.pending[code] };
    return { k: "none", label: "No decision found", outcome: "" };
  }
  function statusChip(d, code, withName) {
    const s = status(d, code), cls = s.k === "decided" ? "pill" : s.k === "pending" ? "pill warn" : "pill grey";
    return '<span class="' + cls + '" title="' + esc(s.outcome) + '">' + (withName ? state.countries[code].flag + " " + esc(state.countries[code].name) + ": " : "") + esc(s.label) + "</span>";
  }

  // Search across all countries (home page): goes to the drug page or to the All drugs list
  function globalSearch() {
    const names = [...new Set(state.drugs.flatMap((d) => [d.brand, d.inn]))].sort();
    return '<form class="search two" id="gsearch" autocomplete="off" style="grid-template-columns:minmax(0,1fr) auto">' +
      '<label class="field q">' + ICON.search + '<input id="g-q" list="all-drug-names" placeholder="Search a drug across all countries (brand or INN)"></label>' +
      '<datalist id="all-drug-names">' + names.map((n) => '<option value="' + esc(n) + '">').join("") + "</datalist>" +
      '<button type="submit">Search</button></form>' +
      '<div class="popular"><span>Or:</span><a class="btn" style="min-height:32px;padding:5px 12px;background:transparent;color:#fff;border-color:rgba(255,255,255,.35)" href="#/drugs">Browse all drugs A–Z</a></div>';
  }
  function bindGlobalSearch() {
    const f = document.getElementById("gsearch");
    if (!f) return;
    f.onsubmit = (e) => {
      e.preventDefault();
      const q = norm(document.getElementById("g-q").value);
      const exact = state.drugs.find((d) => norm(d.brand) === q || norm(d.inn) === q);
      location.hash = exact ? "#/drug/" + exact.id : "#/drugs/" + encodeURIComponent(q);
    };
  }

  // ---------- all European HTA bodies ----------
  const SOURCE_LABEL = { EC: "EU HTA Coordination Group", INAHTA: "INAHTA member" };
  const GROUP_LABEL = { EU: "EU member states", EEA: "EEA countries (EU HTA Regulation applies)", Other: "Other European countries" };
  const europeCodes = () => Object.keys(state.countries).filter((k) => k !== "EU").sort((a, b) => state.countries[a].name.localeCompare(state.countries[b].name));
  const nDecisions = (code) => state.drugs.filter((d) => d.countries[code]).length;
  function sourceTags(body) {
    return (body.sources || []).map((s) => '<span class="pill grey" style="font-size:.68rem;padding:1px 7px">' + esc(SOURCE_LABEL[s] || s) + "</span>").join(" ");
  }
  function bodyCard(body, code) {
    const isInahta = /inahta\.org\/members\//.test(body.url || "");
    const inner = '<div class="ic t-' + code + '">' + ICON.body + "</div><h3>" + esc(body.name) + "</h3>" + (body.role ? "<p>" + esc(body.role) + "</p>" : "") +
      '<p style="display:flex;flex-wrap:wrap;gap:4px">' + sourceTags(body) + "</p>" + (body.url ? "<span>" + (isInahta ? "INAHTA profile" : "Official website") + " →</span>" : '<span class="muted">No website listed</span>');
    return body.url ? '<a target="_blank" rel="noopener" href="' + esc(body.url) + '">' + inner + "</a>" : '<a role="article">' + inner + "</a>";
  }
  function countryTile(code) {
    const c = state.countries[code], n = nDecisions(code);
    return '<a class="box" href="#/country/' + code + '" style="display:flex;gap:12px;align-items:center"><span style="font-size:1.6rem">' + c.flag + "</span><span><b>" + esc(c.name) + '</b><br><span class="small muted">' +
      c.bodies.length + " HTA bod" + (c.bodies.length === 1 ? "y" : "ies") + " · " + (c.tracked ? n + " decisions" : "decisions coming soon") + "</span></span></a>";
  }
  function viewCountries(app) {
    const groups = ["EU", "EEA", "Other"].map((g) => {
      const codes = europeCodes().filter((k) => state.countries[k].group === g);
      return '<h2 class="step"><span>' + esc(GROUP_LABEL[g]) + " (" + codes.length + ")</span></h2><table><thead><tr><th>Country</th><th>HTA bodies</th><th>Decisions</th></tr></thead><tbody>" +
        codes.map((k) => { const c = state.countries[k]; return '<tr><td><a href="#/country/' + k + '"><b>' + c.flag + " " + esc(c.name) + "</b></a></td><td>" +
          c.bodies.map((bd) => (bd.url ? ext(bd.url, bd.name) : esc(bd.name)) + ' <span class="small">' + sourceTags(bd) + "</span>").join("<br>") + "</td><td>" +
          (c.tracked ? '<span class="pill">' + nDecisions(k) + " tracked</span>" : '<span class="pill grey">Coming soon</span>') + "</td></tr>"; }).join("") + "</tbody></table>";
    }).join("");
    app.innerHTML = '<div class="wrap page"><div class="crumbs"><a href="#/">Home</a> › All countries</div><h1 class="title">HTA bodies across Europe</h1>' +
      '<p class="muted">' + europeCodes().length + " countries, " + europeCodes().reduce((s, k) => s + state.countries[k].bodies.length, 0) + " HTA bodies. Main source: the European Commission's list of members of the HTA Coordination Group (medicinal products), cross-checked with the INAHTA members list. Each body shows the sources that name it.</p>" +
      groups + '<p class="small muted">Sources: ' + ext("https://health.ec.europa.eu/health-technology-assessment/implementation-regulation-health-technology-assessment/member-state-coordination-group-hta-htacg_en", "European Commission – HTACG members") + " · " + ext("https://www.inahta.org/members/members_list/", "INAHTA members list") + "</p></div>";
  }

  // Search inside one country: disease + drug name
  function searchBox(code) {
    const s = state.search;
    const areaOpts = THERAPY_AREAS.map((t) => {
      const has = state.drugs.some((d) => d.therapy_area === t);
      if (!has) return '<option disabled>' + esc(t) + " (coming soon)</option>";
      const ds = [...new Set((DISEASES[t] || []).concat(state.drugs.filter((d) => d.therapy_area === t).map((d) => d.disease_area)))];
      return '<optgroup label="' + esc(t) + '"><option value="' + esc(t) + '|"' + (s.therapy === t && !s.disease ? " selected" : "") + ">All " + esc(t.toLowerCase()) + "</option>" +
        ds.map((d) => '<option value="' + esc(t + "|" + d) + '"' + (s.therapy === t && s.disease === d ? " selected" : "") + ">" + esc(d) + "</option>").join("") + "</optgroup>";
    }).join("");
    const names = [...new Set(state.drugs.filter((d) => d.countries[code]).flatMap((d) => [d.brand, d.inn]))];
    return '<form class="search two" id="search" autocomplete="off">' +
      '<label class="field q">' + ICON.search + '<input id="s-q" list="drug-names" placeholder="Search a drug in ' + esc(state.countries[code].name) + '" value="' + esc(s.q) + '"></label>' +
      '<datalist id="drug-names">' + names.map((n) => '<option value="' + esc(n) + '">').join("") + "</datalist>" +
      '<label class="field"><small>Therapy area · disease</small><select id="s-area">' + areaOpts + "</select></label>" +
      '<button type="submit">Search</button></form>' +
      '<div class="popular"><span>Popular:</span><button type="button" data-pop="disease:Lung cancer">Lung cancer</button><button type="button" data-pop="disease:Breast cancer">Breast cancer</button>' +
      '<button type="button" data-pop="disease:Gastric cancer">Gastric cancer</button><button type="button" data-pop="chip:2025">Decided in 2025</button></div>';
  }

  // Decision card: the HTA outcome leads, the drug sits as a tag in the corner
  function card(r) {
    const d = new Date(r.date + "T00:00:00");
    return '<article class="rc"><div class="top c-' + r.country + '">' +
      '<div class="date"><small>' + d.toLocaleDateString("en-GB", { month: "short" }) + "</small><b>" + String(d.getDate()).padStart(2, "0") + "</b><i>" + d.getFullYear() + "</i></div>" +
      '<span class="tag">' + esc(r.drug) + '</span><div class="verdict">' + esc(r.outcome) + "</div></div>" +
      '<div class="body"><div class="ln"><span>' + ICON.body + "</span><span><b>" + esc(r.body) + "</b></span></div>" +
      '<div class="ln"><span>' + ICON.check + "</span><span>" + esc(r.disease) + " · " + esc(r.inn) + "</span></div>" +
      '<div class="foot">' + (r.pricePublic ? '<span title="' + esc(r.price) + '">' + esc(r.priceShort) + "</span>" : '<span class="np">' + esc(r.price) + "</span>") +
      '<a href="#/drug/' + r.id + '">Details →</a></div></div></article>';
  }

  function results(code) {
    const s = state.search, rows = filtered(code);
    const searching = !!(s.q || s.disease);
    const pills = [["all", "All"], ["2026", "2026"], ["2025", "2025"], ["price", "Price public"]]
      .map(([k, l]) => '<button class="' + (s.chip === k ? "on" : "") + '" data-chip="' + k + '">' + l + "</button>").join("") +
      (rows.length ? '<button class="dl" id="dl">Download CSV</button>' : "");
    let body;
    if (rows.length) body = '<div class="cards">' + rows.map(card).join("") + "</div>";
    else if (s.q) body = '<div class="empty"><b>' + esc(s.q) + "</b> has no decision tracked in " + esc(state.countries[code].name) + " yet" + (s.disease ? " for " + esc(s.disease) : "") + ".</div>";
    else body = '<div class="empty">No decisions match this search yet.</div>';
    return '<section class="sec" id="results"><div class="sec-head"><div><div class="kicker">' + (searching ? "Search results" : "Decisions") + "</div><h2>" +
      (searching ? rows.length + " decision" + (rows.length === 1 ? "" : "s") + " found" : esc(state.countries[code].name) + "'s HTA decisions") +
      '</h2></div><div class="pills">' + pills + "</div></div>" + body + "</section>";
  }

  function bindSearch(code, rerender) {
    const $ = (id) => document.getElementById(id);
    const go = () => { rerender(); const r = $("results"); if (r) r.scrollIntoView({ behavior: "smooth", block: "start" }); };
    const readForm = () => {
      const [t, d] = $("s-area").value.split("|");
      state.search.therapy = t || "Oncology"; state.search.disease = d || ""; state.search.q = $("s-q").value;
    };
    $("search").onsubmit = (e) => { e.preventDefault(); readForm(); go(); };
    document.querySelectorAll("[data-pop]").forEach((b) => (b.onclick = () => {
      readForm();
      const [k, v] = b.dataset.pop.split(":");
      if (k === "disease") { state.search.therapy = "Oncology"; state.search.disease = v; }
      if (k === "chip") state.search.chip = v;
      go();
    }));
    document.querySelectorAll("[data-chip]").forEach((b) => (b.onclick = () => { state.search.chip = b.dataset.chip; rerender(); }));
    if ($("dl")) $("dl").onclick = () => downloadCSV(filtered(code));
  }

  function newsBlock(code) {
    const items = (state.news.items || []).filter((i) => !code || i.country === code).slice(0, 8);
    return '<section class="sec"><div class="kicker">Live</div><h2 style="margin:2px 0 14px;font-size:1.5rem">Updates from ' + (code ? esc(state.countries[code].bodies[0].name.split(" ")[0]) : "HTA bodies") + "</h2>" + (items.length
      ? '<div class="box"><ul class="docs">' + items.map((i) => "<li>" + fmtDate(i.date) + " · " + (state.countries[i.country] ? state.countries[i.country].flag + " " : "") + ext(i.url, i.title) + "</li>").join("") + "</ul></div>"
      : '<p class="muted small">Updates appear here after the first daily check runs.</p>') + "</section>";
  }

  function processSteps(code) {
    const c = state.countries[code];
    return '<ol class="process">' + (c.process || []).map((p, i) => '<li><span class="n">' + (i + 1) + "</span><span>" + esc(p) + "</span></li>").join("") + "</ol>";
  }

  // ---------- views ----------
  function viewHome(app) {
    const all = decisions();
    const order = ["IT", "FR", "DE"];
    const mosaic = order.map((code) => {
      const c = state.countries[code], n = all.filter((r) => r.country === code).length;
      return '<a class="c-' + code + '" href="#/country/' + code + '"><span class="big">' + c.flag + '</span><div class="lbl"><b>' + esc(c.name) + "</b>" +
        esc(c.bodies[0].name.split(" ")[0]) + " · " + n + " decisions</div></a>";
    }).join("");
    const pick = COUNTRY_ORDER.map((code) => '<a class="pickbtn" href="#/country/' + code + '"><span>' + state.countries[code].flag + "</span>" + esc(state.countries[code].name) + "</a>").join("");
    const cats = COUNTRY_ORDER.map((code) => {
      const c = state.countries[code];
      return '<a href="#/country/' + code + '"><div class="ic t-' + code + '">' + c.flag + "</div><h3>" + esc(c.name) + '</h3><p class="sys">' + esc(c.system) + "</p><p>" +
        esc(c.bodies.map((b) => b.name).join(" · ")) + "</p><span>Open " + esc(c.name) + " →</span></a>";
    }).join("");
    const columns = COUNTRY_ORDER.map((code) => {
      const c = state.countries[code], rows = all.filter((r) => r.country === code).slice(0, 5);
      return '<div class="col"><a class="col-head c-' + code + '" href="#/country/' + code + '"><span class="flag">' + c.flag + "</span><div><b>" + esc(c.name) + "</b><small>" + esc(c.bodies[0].name) + "</small></div></a>" +
        '<ul class="dlist">' + rows.map((r) => '<li><a href="#/drug/' + r.id + '"><span class="when">' + fmtDate(r.date) + '</span><span class="what">' + esc(r.outcome) + '</span><span class="drug">' + esc(r.drug) + "</span></a></li>").join("") +
        '</ul><a class="more" href="#/country/' + code + '">All ' + esc(c.name) + " decisions →</a></div>";
    }).join("");
    app.innerHTML =
      '<section class="hero"><div class="wrap"><div><span class="eyebrow-pill">All of Europe\'s HTA bodies in one place · starting with Germany, France, Italy</span>' +
      "<h1>HTA decisions, <em>country by country</em>.</h1>" +
      '<p class="lead">See how each country\'s HTA body judged new medicines — the opinion, the reimbursement decision and the list price — straight from official sources.</p>' +
      '<div class="pick"><span>Choose a country</span><div>' + pick + "</div></div>" +
      '<div class="pick" style="margin-top:22px"><span>Or find a drug</span>' + globalSearch() + "</div>" +
      '</div><div class="mosaic">' + mosaic + "</div></div></section>" +
      '<div class="wrap overlap"><div class="cat">' + cats + "</div>" +
      '<section class="sec"><div class="sec-head"><div><div class="kicker">What\'s new</div><h2>Latest decisions by country</h2></div></div><div class="cols">' + columns + "</div></section>" +
      '<section class="sec"><div class="sec-head"><div><div class="kicker">Across Europe</div><h2>All HTA bodies, country by country</h2></div><div class="pills"><a class="btn" href="#/countries">Full list with sources →</a></div></div>' +
      '<div class="grid">' + europeCodes().map(countryTile).join("") + "</div></section>" +
      newsBlock(null) + "</div>";
    bindGlobalSearch();
  }

  // All drugs A–Z, with the status in every country (a first comparison view)
  function viewDrugs(app, q0) {
    const f = state.drugsFilter || (state.drugsFilter = { q: "", disease: "" });
    if (q0 !== undefined) f.q = decodeURIComponent(q0);
    const diseases = [...new Set(state.drugs.map((d) => d.disease_area))].sort();
    const q = norm(f.q);
    const list = state.drugs
      .filter((d) => (!q || norm(d.brand).includes(q) || norm(d.inn).includes(q)) && (!f.disease || d.disease_area === f.disease))
      .sort((a, b) => a.brand.localeCompare(b.brand));
    const head = "<tr><th>Drug</th><th>Disease</th><th>EU authorised</th>" + COUNTRY_ORDER.map((c) => "<th>" + state.countries[c].flag + " " + esc(state.countries[c].name) + "</th>").join("") + "</tr>";
    const rows = list.map((d) => '<tr><td><a href="#/drug/' + d.id + '"><b>' + esc(d.brand) + '</b></a><br><span class="muted small">' + esc(d.inn) + " · " + esc(d.company) + "</span></td><td>" +
      esc(d.disease_area) + "</td><td>" + fmtDate(d.eu.indication_authorisation || d.eu.initial_authorisation) + "</td>" +
      COUNTRY_ORDER.map((c) => { const s = status(d, c); return "<td>" + statusChip(d, c) + (s.k === "decided" ? '<br><span class="small">' + esc(s.outcome) + "</span>" : "") + "</td>"; }).join("") + "</tr>").join("");
    app.innerHTML = '<div class="wrap page"><div class="crumbs"><a href="#/">Home</a> › All drugs</div>' +
      '<h1 class="title">All drugs</h1><p class="muted">' + state.drugs.length + " drugs tracked. Status of each drug in every country; open a drug for the full path from EMA to price.</p>" +
      '<form class="search two" id="dsearch" autocomplete="off" style="background:var(--soft);box-shadow:none;margin:14px 0 18px">' +
      '<label class="field q" style="background:#fff">' + ICON.search + '<input id="d-q" placeholder="Brand or INN" value="' + esc(f.q) + '"></label>' +
      '<label class="field" style="background:#fff"><small>Disease</small><select id="d-dis"><option value="">All diseases</option>' +
      diseases.map((x) => '<option' + (x === f.disease ? " selected" : "") + ">" + esc(x) + "</option>").join("") + "</select></label>" +
      '<button type="submit">Filter</button></form>' +
      (list.length ? "<table><thead>" + head + "</thead><tbody>" + rows + "</tbody></table>"
        : '<div class="empty">No drug matches <b>' + esc(f.q) + "</b> yet. Missing a drug? Suggest it on GitHub.</div>") + "</div>";
    document.getElementById("dsearch").onsubmit = (e) => {
      e.preventDefault();
      f.q = document.getElementById("d-q").value; f.disease = document.getElementById("d-dis").value;
      if (location.hash !== "#/drugs") { lastRoute = "#/drugs"; location.hash = "#/drugs"; } else viewDrugs(app);
    };
    document.getElementById("d-dis").onchange = () => document.getElementById("dsearch").requestSubmit();
  }

  function viewCountry(app, code) {
    const c = state.countries[code];
    if (!c) return viewNotFound(app);
    const n = decisions().filter((r) => r.country === code).length;
    const bodies = c.bodies.map((bd) => bodyCard(bd, code)).join("");
    const crumb = '<div class="crumb-light"><a href="#/">Home</a> › <a href="#/countries">All countries</a> › ' + esc(c.name) + "</div>";
    if (!c.tracked) {
      app.innerHTML =
        '<section class="hero" style="padding-bottom:90px"><div class="wrap" style="display:block">' + crumb + "<h1>" + c.flag + " <em>" + esc(c.name) + "</em></h1>" +
        '<p class="lead">' + c.bodies.length + " HTA bod" + (c.bodies.length === 1 ? "y" : "ies") + " listed below. Decisions, prices and news for " + esc(c.name) + " are coming soon.</p></div></section>" +
        '<div class="wrap overlap"><div class="cat">' + bodies + "</div>" + (c.news_feeds ? newsBlock(code) : "") +
        '<p class="small muted" style="margin-top:20px">Want to help add ' + esc(c.name) + "? Suggest official sources on GitHub.</p></div>";
      return;
    }
    app.innerHTML =
      '<section class="hero"><div class="wrap"><div>' + crumb +
      "<h1>" + c.flag + " <em>" + esc(c.name) + "</em></h1>" +
      '<p class="lead">' + (c.system ? "<b>" + esc(c.system) + ".</b> " : "") + n + " decision" + (n === 1 ? "" : "s") + " tracked so far. Search by disease or drug name.</p>" +
      searchBox(code) + '</div><div class="howbox"><b>How it works</b>' + processSteps(code) + '<p class="small">' + esc(c.rating || "") + "</p></div></div></section>" +
      '<div class="wrap overlap"><div class="cat">' + bodies + "</div>" + results(code) + newsBlock(code) + "</div>";
    bindSearch(code, () => viewCountry(app, code));
  }

  function viewAbout(app) {
    app.innerHTML = '<div class="wrap page"><div class="crumbs"><a href="#/">Home</a> › About</div><h1 class="title">About HTA Europe Hub</h1>' +
      '<p>A free, open-source hub of HTA and reimbursement decisions across Europe: every country\'s HTA body, its decisions, prices and latest news, for all therapy areas. An open alternative to paid HTA trackers. Version 1 starts with oncology in Germany, France and Italy, from 2025, and grows country by country. Every entry links to the official document.</p>' +
      '<h2 class="step"><span class="num">1</span>Official sources</h2><div class="grid">' +
      ["EU", "DE", "FR", "IT"].flatMap((code) => state.countries[code].bodies.map((b) =>
        '<a class="box" target="_blank" rel="noopener" href="' + esc(b.url) + '"><h3>' + state.countries[code].flag + " " + esc(b.name) + '</h3><p class="muted small">' + esc(b.role) + "</p></a>")).join("") + "</div>" +
      '<h2 class="step"><span class="num">2</span>Suggest a decision or a correction</h2><p>Open an issue on the project\'s GitHub page with the drug, the country and the link to the official document. Prices are only added when they are officially published.</p>' +
      '<h2 class="step"><span class="num">3</span>How prices are shown</h2><p>List prices from official publications only. Confidential discounts are never public, so a price marked "not public" was not disclosed by the authority.</p></div>';
  }

  function docsList(docs) {
    return docs && docs.length ? '<ul class="docs">' + docs.map((d) => "<li>" + ext(d.url, d.label) + "</li>").join("") + "</ul>" : "";
  }
  function step(n, title, body) {
    return '<h2 class="step"><span class="num">' + n + "</span><span>" + esc(title) + "</span></h2>" + body;
  }

  function viewDrug(app, id) {
    const d = state.drugs.find((x) => x.id === id);
    if (!d) return viewNotFound(app);
    const eu = d.eu, codes = COUNTRY_ORDER.filter((c) => d.countries[c]);
    const flagName = (code) => state.countries[code].flag + " " + esc(state.countries[code].name);

    const summary = eu.epar_summary
      ? '<div class="quote">' + esc(eu.epar_summary) + '</div><p class="small muted">Source: European Medicines Agency · ' + ext(eu.epar_summary_url, "Official EPAR summary") + " · " + ext(eu.epar_url, "Full EPAR") + "</p>"
      : '<div class="note">The official EMA summary will appear here, copied word for word from EMA.</div><p class="small">' + ext(eu.epar_summary_url, "Read the official EMA summary") + " · " + ext(eu.epar_url, "Full EPAR") + "</p>";

    const opinions = codes.map((code) => {
      const c = d.countries[code];
      return "<tr><td>" + flagName(code) + '<br><span class="muted small">' + esc(c.hta_body) + "</span></td><td>" + fmtDate(c.decision_date) + "</td><td>" + esc(c.opinion) +
        (c.comparator ? '<br><span class="muted small">Comparator: ' + esc(c.comparator) + "</span>" : "") + docsList(c.documents) + "</td></tr>";
    }).join("");
    const pendingRows = COUNTRY_ORDER.filter((c) => !d.countries[c]).map((code) =>
      "<tr><td>" + flagName(code) + '</td><td>—</td><td><span class="pill warn">No decision found yet</span><br><span class="muted small">' +
      esc((d.pending && d.pending[code]) || "Not tracked yet.") + "</span>" + docsList(d.pending_docs && d.pending_docs[code]) + "</td></tr>").join("");
    const reimb = codes.map((code) => "<tr><td>" + flagName(code) + "</td><td>" + esc(d.countries[code].reimbursement) + "</td></tr>").join("");
    const prices = codes.map((code) => {
      const p = d.countries[code].price || {};
      return "<tr><td>" + flagName(code) + "</td><td>" + (p.public === true ? "<strong>" + esc(p.value) + '</strong><br><span class="muted small">' + esc(p.type) + "</span>" : '<span class="pill warn">' + esc(priceLabel(p)) + "</span>") +
        "</td><td>" + fmtDate(p.date) + "</td><td>" + (p.source_url ? ext(p.source_url, p.source) : "—") + (p.note ? '<br><span class="muted small">' + esc(p.note) + "</span>" : "") + "</td></tr>";
    }).join("");

    app.innerHTML = '<div class="wrap page">' +
      '<div class="crumbs"><a href="#/">Home</a> › ' + esc(d.therapy_area) + " › " + esc(d.disease_area) + " › " + esc(d.brand) + "</div>" +
      "<h1 class=\"title\">" + esc(d.brand) + ' <span class="muted" style="font-weight:400">(' + esc(d.inn) + ")</span></h1>" +
      '<p class="muted">' + esc(d.condition) + " · " + esc(d.company) + "</p>" +
      '<div class="facts"><span class="pill">' + esc(d.therapy_area) + '</span><span class="pill">' + esc(d.disease_area) + '</span><span class="pill good">EU authorised ' + fmtDate(eu.initial_authorisation) + "</span>" +
      (eu.jca ? '<span class="pill">JCA: ' + esc(eu.jca) + "</span>" : '<span class="pill warn">No EU JCA</span>') + "</div>" +
      '<p class="small"><strong>Indication tracked:</strong> ' + esc(d.indication_tracked) + " (EU authorised " + fmtDate(eu.indication_authorisation) + ")</p>" +
      '<div class="facts"><strong class="small" style="align-self:center">Status by country:</strong>' + COUNTRY_ORDER.map((c) => '<a href="#/country/' + c + '" style="text-decoration:none">' + statusChip(d, c, true) + "</a>").join("") + "</div>" +
      step(1, "EPAR summary (EMA)", summary + '<p class="small muted">' + esc(eu.jca_note) + "</p>") +
      step(2, "HTA opinions by country", '<table><thead><tr><th>Country</th><th>Date</th><th>Opinion and documents</th></tr></thead><tbody>' + opinions + pendingRows + "</tbody></table>") +
      step(3, "Reimbursement decisions", '<table><thead><tr><th>Country</th><th>Decision</th></tr></thead><tbody>' + reimb + "</tbody></table>") +
      step(4, "Pricing", '<label class="switch"><input type="checkbox" id="price-toggle"' + (state.showPrices ? " checked" : "") + "> Show pricing</label>" +
        '<div id="price-box"' + (state.showPrices ? "" : ' style="display:none"') + '><table><thead><tr><th>Country</th><th>List price</th><th>Date</th><th>Official source</th></tr></thead><tbody>' + prices +
        '</tbody></table><p class="small muted">List prices from official publications. Net prices after confidential discounts are not public.</p></div>') +
      '<p class="small muted">Last checked ' + fmtDate(d.last_checked) + ". Spotted a mistake? Open an issue on GitHub.</p></div>";

    document.getElementById("price-toggle").onchange = (e) => {
      state.showPrices = e.target.checked;
      document.getElementById("price-box").style.display = state.showPrices ? "" : "none";
    };
  }

  function viewNotFound(app) {
    app.innerHTML = '<div class="wrap page"><p>Page not found. <a href="#/">Back to home</a></p></div>';
  }

  // Copy column headers into cells so tables stack as cards on phones
  function labelTables(root) {
    root.querySelectorAll("table").forEach((t) => {
      const heads = [...t.querySelectorAll("thead th")].map((th) => th.textContent);
      t.classList.add("stack");
      t.querySelectorAll("tbody tr").forEach((tr) => [...tr.children].forEach((td, i) => { if (heads[i]) td.setAttribute("data-label", heads[i]); }));
    });
  }

  let lastRoute = "";
  function route() {
    const app = document.getElementById("app");
    const parts = (location.hash.replace(/^#\/?/, "") || "").split("/");
    if (location.hash !== lastRoute) { window.scrollTo(0, 0); lastRoute = location.hash; }
    if (parts[0] === "country") viewCountry(app, parts[1]);
    else if (parts[0] === "drug") viewDrug(app, parts[1]);
    else if (parts[0] === "drugs") viewDrugs(app, parts[1]);
    else if (parts[0] === "countries") viewCountries(app);
    else if (parts[0] === "about") viewAbout(app);
    else viewHome(app);
  }
  const appEl = document.getElementById("app");
  const tableObserver = new MutationObserver(() => labelTables(appEl));
  tableObserver.observe(appEl, { childList: true, subtree: true });

  load()
    .then(() => { window.addEventListener("hashchange", route); route(); })
    .catch((err) => {
      appEl.innerHTML = '<div class="wrap"><p class="note">Could not load the data (' + esc(err.message) + "). If you opened index.html directly, run a local server: <code>python -m http.server</code></p></div>";
    });
})();
