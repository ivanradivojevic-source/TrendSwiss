import json
import re
import sys
import urllib.parse
import urllib.request

queries = sys.argv[1:]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")


for q in queries:
    url = "https://leon.rs/?s=" + urllib.parse.quote(q) + "&post_type=product"
    html = fetch(url)
    links = list(dict.fromkeys(re.findall(r'href="(https://leon\.rs/p/[^"]+)"', html)))[:6]
    print(q, "->", links)
