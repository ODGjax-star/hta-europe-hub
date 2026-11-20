"""Collect the latest updates from each HTA body into data/news.json.

Reads the RSS/Atom feeds listed under "news_feeds" in data/countries.json,
adds new items (matched by link) to data/news.json and keeps the newest
MAX_PER_COUNTRY per country. Only titles, dates and links are stored.

Standard library only. Respects robots.txt and waits between requests.
Meant to run once a day (see .github/workflows/fetch-news.yml).

  python scripts/fetch_news.py
"""
import datetime
import email.utils
import json
import time
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COUNTRIES = ROOT / "data" / "countries.json"
NEWS = ROOT / "data" / "news.json"
AGENT = "HTA-Europe-Hub/1.0 (open-source research site)"
MAX_PER_COUNTRY = 40
PAUSE = 5  # seconds between requests
ATOM = "{http://www.w3.org/2005/Atom}"

_robots = {}


def allowed(url):
    parts = urllib.parse.urlsplit(url)
    base = f"{parts.scheme}://{parts.netloc}"
    if base not in _robots:
        # Read robots.txt with our own User-Agent: some sites refuse Python's
        # default one, which RobotFileParser.read() would treat as "block all".
        rp = urllib.robotparser.RobotFileParser()
        try:
            req = urllib.request.Request(base + "/robots.txt", headers={"User-Agent": AGENT})
            with urllib.request.urlopen(req, timeout=30) as res:
                rp.parse(res.read().decode("utf-8", errors="replace").splitlines())
        except Exception:
            rp = None  # no readable robots.txt: treat as allowed
        _robots[base] = rp
    rp = _robots[base]
    return rp is None or rp.can_fetch(AGENT, url)


def fetch(url):
    if not allowed(url):
        raise RuntimeError("blocked by robots.txt")
    req = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read()


def to_iso(text):
    """RSS (RFC 822) or Atom (ISO 8601) date -> YYYY-MM-DD, or '' if unreadable."""
    text = (text or "").strip()
    if not text:
        return ""
    try:
        return email.utils.parsedate_to_datetime(text).date().isoformat()
    except (TypeError, ValueError):
        pass
    try:
        return datetime.datetime.fromisoformat(text.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return ""


def clean(text):
    """Drop invisible break hints (zero-width space, soft hyphen) and extra spaces."""
    return " ".join((text or "").replace("​", "").replace("­", "").split())


def parse(xml_bytes):
    """Yield (title, link, date) from an RSS 2.0 or Atom feed."""
    root = ET.fromstring(xml_bytes)
    for item in root.iter("item"):  # RSS
        yield clean(item.findtext("title")), (item.findtext("link") or "").strip(), to_iso(item.findtext("pubDate") or item.findtext("{http://purl.org/dc/elements/1.1/}date"))
    for entry in root.iter(ATOM + "entry"):  # Atom
        link = entry.find(ATOM + "link")
        href = link.get("href", "") if link is not None else ""
        yield clean(entry.findtext(ATOM + "title")), href.strip(), to_iso(entry.findtext(ATOM + "updated") or entry.findtext(ATOM + "published"))


def main():
    countries = json.loads(COUNTRIES.read_text(encoding="utf-8"))
    news = json.loads(NEWS.read_text(encoding="utf-8")) if NEWS.exists() else {"items": []}
    items = {i["url"]: i for i in news.get("items", [])}
    today = datetime.date.today().isoformat()
    added = 0

    for code, country in countries.items():
        for feed in country.get("news_feeds", []):
            exclude = [w.lower() for w in feed.get("exclude", [])]
            try:
                entries = list(parse(fetch(feed["url"])))
            except Exception as e:  # one broken feed must not stop the others
                print(f"{code} {feed['name']}: FAILED ({e})")
                continue
            new = 0
            for title, link, date in entries:
                if not title or not link or link in items:
                    continue
                if any(w in title.lower() for w in exclude):
                    continue
                items[link] = {"country": code, "source": feed["name"], "date": date or today, "title": title, "url": link}
                new += 1
            added += new
            print(f"{code} {feed['name']}: {len(entries)} in feed, {new} new")
            time.sleep(PAUSE)

    # newest first, capped per country
    kept, per_country = [], {}
    for item in sorted(items.values(), key=lambda i: i["date"], reverse=True):
        n = per_country.get(item["country"], 0)
        if n < MAX_PER_COUNTRY:
            kept.append(item)
            per_country[item["country"]] = n + 1

    NEWS.write_text(json.dumps({"updated": today, "items": kept}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Done: {added} new, {len(kept)} kept.")


if __name__ == "__main__":
    main()
