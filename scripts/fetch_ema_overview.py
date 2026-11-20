"""Fill in the EMA EPAR summary for each drug, copied word for word.

Reads the "Overview" text from each drug's EMA page (eu.epar_url) and writes it
to eu.epar_summary in data/drugs/<id>.json. Nothing is rewritten: only paragraph
breaks and bullet marks are added.

Standard library only. Respects robots.txt and waits between requests.

  python scripts/fetch_ema_overview.py              # only drugs with an empty summary
  python scripts/fetch_ema_overview.py --all        # refresh every drug
  python scripts/fetch_ema_overview.py alecensa     # one or more drug ids
"""
import datetime
import json
import sys
import time
import urllib.request
import urllib.robotparser
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRUGS = ROOT / "data" / "drugs"
AGENT = "HTA-Europe-Hub/1.0 (open-source research site)"
FIELD = "ema-medicine__field-ema-introduction"
PAUSE = 10  # seconds between requests (EMA answers 429 if faster)


class OverviewParser(HTMLParser):
    """Collects visible text inside the EMA Overview block."""

    def __init__(self):
        super().__init__()
        self.depth = 0      # div nesting inside the overview block (0 = outside)
        self.parts = []     # finished blocks (paragraphs / list items)
        self.buf = ""

    def flush(self, prefix=""):
        text = " ".join(self.buf.split())
        if text:
            self.parts.append(prefix + text)
        self.buf = ""

    def handle_starttag(self, tag, attrs):
        if self.depth == 0:
            if tag == "div" and FIELD in (dict(attrs).get("class") or ""):
                self.depth = 1
            return
        if tag == "div":
            self.depth += 1
        elif tag in ("p", "li"):
            self.flush()
        elif tag == "br":
            self.buf += " "

    def handle_endtag(self, tag):
        if self.depth == 0:
            return
        if tag == "li":
            self.flush("• ")
        elif tag == "p":
            self.flush()
        elif tag == "div":
            self.depth -= 1
            if self.depth == 0:
                self.flush()

    def handle_data(self, data):
        if self.depth:
            self.buf += data


def join_blocks(parts):
    """Paragraphs separated by a blank line; list items kept together."""
    out = ""
    for i, p in enumerate(parts):
        if i:
            both_bullets = p.startswith("• ") and parts[i - 1].startswith("• ")
            intro_to_list = p.startswith("• ") and parts[i - 1].endswith(":")
            out += "\n" if both_bullets or intro_to_list else "\n\n"
        out += p
    return out


def fetch(url, robots):
    if not robots.can_fetch(AGENT, url):
        raise RuntimeError("blocked by robots.txt")
    req = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read().decode("utf-8", errors="replace")


def main(args):
    robots = urllib.robotparser.RobotFileParser("https://www.ema.europa.eu/robots.txt")
    robots.read()

    refresh_all = "--all" in args
    ids = [a for a in args if not a.startswith("--")]
    files = [DRUGS / f"{i}.json" for i in ids] if ids else sorted(DRUGS.glob("*.json"))

    for path in files:
        if path.name == "index.json":
            continue
        drug = json.loads(path.read_text(encoding="utf-8"))
        eu = drug.get("eu") or {}
        if eu.get("epar_summary") and not (refresh_all or ids):
            continue
        url = eu.get("epar_url")
        if not url:
            print(f"{path.stem}: no epar_url, skipped")
            continue
        try:
            parser = OverviewParser()
            parser.feed(fetch(url, robots))
            text = join_blocks(parser.parts)
        except Exception as e:  # keep going with the other drugs
            print(f"{path.stem}: FAILED ({e})")
            continue
        if not text:
            print(f"{path.stem}: Overview block not found, skipped")
            continue
        eu["epar_summary"] = text
        eu["epar_summary_note"] = "Copied word for word from the Overview section of the EMA medicine page. Only paragraph breaks and bullet marks were added."
        eu["epar_summary_copied"] = datetime.date.today().isoformat()
        path.write_text(json.dumps(drug, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{path.stem}: updated ({len(text)} characters)")
        time.sleep(PAUSE)


if __name__ == "__main__":
    main(sys.argv[1:])
