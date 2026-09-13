#!/usr/bin/env python3
"""Add missing courseBrowser track keys (networking, devops, data, english)
to all 10 locale message files. These are looked up via t(course.definition.track)
in the course detail page when the `track` value is used directly (without the
`track` prefix)."""
import json
import sys
from pathlib import Path

LOCALES = {
    "es": {"networking": "Redes", "devops": "DevOps", "data": "Datos", "english": "Inglés"},
    # Other locales: fall back to English; native translation is a follow-up.
}

EN_FALLBACK = {"networking": "Networking", "devops": "DevOps", "data": "Data", "english": "English"}

MESSAGES_DIR = Path(__file__).resolve().parent.parent / "packages" / "i18n" / "src" / "messages"

def main() -> int:
    for path in sorted(MESSAGES_DIR.glob("*.json")):
        locale = path.stem
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        cb = data.setdefault("courseBrowser", {})
        # Insert before trackDevops so the JSON key order is logical.
        existing = list(cb.keys())
        if all(k in cb for k in ("networking", "devops", "data", "english")):
            print(f"[skip] {locale}.json: all track keys already present")
            continue
        translations = LOCALES.get(locale, EN_FALLBACK)
        new_keys = translations  # all four
        # Rebuild dict: existing order, but ensure new keys come before trackDevops if present.
        new_cb = {}
        inserted = False
        for k in existing:
            if not inserted and k == "trackDevops":
                for nk, nv in new_keys.items():
                    new_cb[nk] = nv
                inserted = True
            new_cb[k] = cb[k]
        if not inserted:
            # trackDevops missing; append at end
            for nk, nv in new_keys.items():
                new_cb[nk] = nv
        data["courseBrowser"] = new_cb
        with path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"[ok] {locale}.json: added {list(new_keys)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
