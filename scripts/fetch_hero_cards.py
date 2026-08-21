# -*- coding: utf-8 -*-
"""Match scraped heroes to negi-lab IDs and download Card webp icons."""
import json
import os
import shutil
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def clean(n):
    return (n or "").replace("(각성)", "").replace(" ", "").strip()


def main():
    heroes = json.load(open(os.path.join(ROOT, "src", "data", "scraped_heroes.json"), encoding="utf-8"))
    ko = json.load(open(os.path.join(ROOT, "tmp_negi_chars_ko.json"), encoding="utf-8"))

    by_name = {}
    for c in ko:
        by_name[clean(c["name"])] = c
        by_name[c["name"]] = c

    matched, unmatched = [], []
    for h in heroes:
        cn = clean(h["name"])
        c = by_name.get(cn) or by_name.get(h["name"])
        if c:
            matched.append((h, c))
        else:
            unmatched.append(h["name"])

    print("matched", len(matched), "unmatched", len(unmatched))
    if unmatched:
        print("unmatched:", unmatched)

    src_common = os.path.join(ROOT, "public", "images", "hero-card")
    asset_common = os.path.join(ROOT, "asset", "영웅 목록", "공용 아이콘", "hero-card")
    if os.path.isdir(src_common):
        for dirpath, _, files in os.walk(src_common):
            for f in files:
                rel = os.path.relpath(os.path.join(dirpath, f), src_common)
                dest = os.path.join(asset_common, rel)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                shutil.copy2(os.path.join(dirpath, f), dest)
        print("copied common UI into asset/영웅 목록/공용 아이콘/hero-card")

    base = "https://negi-lab.com/gamewiki/SevenKnightsReBirth/images/icon/Card/"
    ok = fail = 0
    meta = {}
    for h, c in matched:
        hid = c["id"]
        purl = h.get("portraitUrl") or ""
        parts = purl.strip("/").split("/")
        hero_dir_name = parts[1] if len(parts) >= 2 and parts[0] == "images" else clean(h["name"])
        pub_dir = os.path.join(ROOT, "public", "images", hero_dir_name)
        os.makedirs(pub_dir, exist_ok=True)
        dest = os.path.join(pub_dir, "card.webp")
        url = f"{base}Tex_HeroIcon_{hid}Card.webp"
        try:
            if not os.path.isfile(dest) or os.path.getsize(dest) < 500:
                urllib.request.urlretrieve(url, dest)
            meta[h["id"]] = {
                "negiId": hid,
                "negiRarity": c.get("rarity"),
                "negiStar": str(c.get("star") or "6"),
                "negiRole": str(c.get("role") or ""),
                "cardUrl": f"/images/{hero_dir_name}/card.webp",
            }
            ok += 1
        except Exception as e:
            fail += 1
            meta[h["id"]] = {"negiId": hid, "error": str(e)}
        time.sleep(0.015)

    out_meta = os.path.join(ROOT, "src", "data", "heroCardMeta.json")
    json.dump(meta, open(out_meta, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("cards ok", ok, "fail", fail)
    print("wrote", out_meta)


if __name__ == "__main__":
    main()
