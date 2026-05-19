"""Search leon.rs for Excel broj/naziv and scrape product pages."""
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "scripts" / "leon-import-missing-report.json"

UNMATCHED = json.loads((ROOT / "scripts" / "excel-price-report.json").read_text(encoding="utf-8"))
UNMATCHED = [r for r in UNMATCHED if r["status"] == "unmatched"]
# dedupe by broj+naziv
seen = set()
rows = []
for r in UNMATCHED:
    k = (r["broj"], r["naziv"])
    if k in seen:
        continue
    seen.add(k)
    rows.append(r)


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "TrendSwissShopBot/0.1 (catalog import)"},
    )
    with urllib.request.urlopen(req, timeout=35) as res:
        return res.read().decode("utf-8", "replace")


def search_leon(query: str) -> list[str]:
    url = "https://leon.rs/?s=" + urllib.parse.quote(query) + "&post_type=product"
    html = fetch(url)
    links = re.findall(r'href="(https://leon\.rs/p/[^"]+)"', html)
    return list(dict.fromkeys(links))


def page_has_broj(html: str, broj: str) -> bool:
    b = broj.lower()
    if re.search(rf"\b{re.escape(b)}\b", html, re.I):
        return True
    if b in html.lower():
        return True
    return False


def extract_product_info(html: str, url: str) -> dict:
    title = None
    m = re.search(r'<meta[^>]+property="og:title"[^>]+content="([^"]+)"', html, re.I)
    if m:
        title = m.group(1).strip()
    if not title:
        m = re.search(r"<title>([^<]+)</title>", html, re.I)
        if m:
            title = re.sub(r"\s*\|.*$", "", m.group(1)).strip()

    images = re.findall(
        r"https://cdn\.leon\.rs/wp-content/uploads/[^\"'\s>]+\.(?:jpg|jpeg|png|webp)",
        html,
        re.I,
    )
    images = list(dict.fromkeys(images))

    ld_prices = re.findall(r'"price"\s*:\s*"?([\d.]+)"?', html)
    price_rsd = float(ld_prices[0]) if ld_prices else None

    crumbs = re.findall(r"leon\.rs/c/[^\"']+", html)
    gender = "women"
    cl = " ".join(crumbs).lower()
    if "muske" in cl or "muska" in cl:
        gender = "men"
    elif "decije" in cl or "decija" in cl:
        gender = "children"

    sifra = None
    sm = re.search(r"Šifra\s+artikla\s*:\s*([A-Z0-9-]+)", html, re.I)
    if sm:
        sifra = sm.group(1)

    return {
        "url": url,
        "title": title,
        "images": images[:8],
        "priceRsd": price_rsd,
        "gender": gender,
        "sifra": sifra,
    }


def main():
    out = []
    for i, row in enumerate(rows):
        broj = row["broj"]
        naziv = row["naziv"].replace("*", "").strip()
        print(f"[{i+1}/{len(rows)}] {naziv} ({broj})")
        entry = {
            "excel": row,
            "searchByBroj": [],
            "searchByNaziv": [],
            "verified": None,
            "error": None,
        }
        try:
            by_broj = search_leon(broj)
            entry["searchByBroj"] = by_broj[:5]
            time.sleep(0.4)
            by_naziv = search_leon(naziv.split()[0]) if naziv else []
            entry["searchByNaziv"] = by_naziv[:5]
            time.sleep(0.4)

            candidates = list(dict.fromkeys(by_broj + by_naziv))
            verified = None
            for url in candidates[:8]:
                try:
                    html = fetch(url)
                    time.sleep(0.3)
                    if page_has_broj(html, broj) or (
                        naziv and naziv.split()[0].lower() in html.lower()
                    ):
                        info = extract_product_info(html, url)
                        if page_has_broj(html, broj) or (
                            naziv.lower() in (info.get("title") or "").lower()
                        ):
                            verified = info
                            break
                except Exception as e:
                    entry.setdefault("candidateErrors", []).append(
                        {"url": url, "error": str(e)}
                    )
            entry["verified"] = verified
        except Exception as e:
            entry["error"] = str(e)
        out.append(entry)

    REPORT.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    found = sum(1 for x in out if x.get("verified"))
    print(f"Done. Found on leon.rs: {found}/{len(rows)}")
    print(f"Report: {REPORT}")


if __name__ == "__main__":
    main()
