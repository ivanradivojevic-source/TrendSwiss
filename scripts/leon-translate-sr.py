#!/usr/bin/env python3
"""Translate Serbian leon.rs copy to de/fr/en/it. Stdin/stdout JSON; caches by text hash."""
import hashlib
import json
import sys
import time
from pathlib import Path

from deep_translator import GoogleTranslator

CACHE_PATH = Path(__file__).resolve().parent / "leon-sr-translation-cache.json"
LOCALES = ("de", "fr", "en", "it")


def load_cache() -> dict:
    if CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    return {}


def save_cache(cache: dict) -> None:
    CACHE_PATH.write_text(
        json.dumps(cache, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def translate_one(text: str, target: str) -> str:
    if not text or not text.strip():
        return ""
    return GoogleTranslator(source="sr", target=target).translate(text.strip())


def main() -> None:
    payload = json.loads(sys.stdin.read() or "{}")
    texts: list[str] = payload.get("texts") or []
    cache = load_cache()
    out: dict[str, dict[str, str]] = {}

    for text in texts:
        if not text or not str(text).strip():
            continue
        text = str(text).strip().encode("utf-8", "surrogatepass").decode(
            "utf-8", "ignore"
        )
        key = hashlib.sha256(text.encode("utf-8")).hexdigest()[:20]
        if key in cache:
            out[text] = {lang: cache[key][lang] for lang in LOCALES}
            continue

        loc: dict[str, str] = {}
        for lang in LOCALES:
            for attempt in range(3):
                try:
                    loc[lang] = translate_one(text, lang)
                    break
                except Exception:
                    if attempt == 2:
                        loc[lang] = text
                    else:
                        time.sleep(1.5 * (attempt + 1))
            time.sleep(0.15)

        cache[key] = {"sr": text, **loc}
        out[text] = loc
        save_cache(cache)

    save_cache(cache)
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
