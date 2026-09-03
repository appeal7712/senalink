# -*- coding: utf-8 -*-
"""asset/영웅 목록 전용장비 PNG → 영웅이름_전용장비.png 정리 + public 복사 + 메타 JSON 생성."""
from __future__ import annotations

import json
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_HERO = os.path.join(ROOT, "asset", "영웅 목록")
HEROES_JSON = os.path.join(ROOT, "src", "data", "scraped_heroes.json")
OUT_META = os.path.join(ROOT, "src", "data", "exclusiveGearMeta.generated.json")

ROLE_RE = re.compile(r"\((공격형|방어형|마법형|지원형|만능형)\)")


def folder_to_name(folder: str) -> str:
    n = ROLE_RE.sub("", folder).strip()
    return n.replace("(각성)", "").strip()


def load_hero_id_by_name() -> dict[str, str]:
    heroes = json.load(open(HEROES_JSON, encoding="utf-8"))
    by_name: dict[str, str] = {}
    for h in heroes:
        name = str(h.get("name", "")).replace("(각성)", "").strip()
        hid = str(h.get("id", "")).strip()
        if name and hid:
            by_name[name] = hid
    return by_name


def find_gear_src(hero_path: str) -> str | None:
    exclusive = None
    tex = None
    for f in os.listdir(hero_path):
        if not f.lower().endswith(".png"):
            continue
        if f.endswith("_전용장비.png"):
            exclusive = os.path.join(hero_path, f)
        elif f.startswith("Tex_ItemIcon_") and tex is None:
            tex = os.path.join(hero_path, f)
    return exclusive or tex


def ensure_standard_name(hero_path: str, hero_name: str, src: str) -> str:
    dest_name = f"{hero_name}_전용장비.png"
    dest = os.path.join(hero_path, dest_name)
    if os.path.normcase(src) == os.path.normcase(dest):
        return dest
    if os.path.exists(dest):
        os.remove(src)
        return dest
    os.rename(src, dest)
    return dest


def save_png(src: str, dest: str) -> None:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    Image.open(src).convert("RGBA").save(dest, format="PNG", optimize=True)


def sync() -> dict:
    id_by_name = load_hero_id_by_name()
    meta: dict[str, dict] = {}
    renamed = 0
    copied = 0
    missing_hero: list[str] = []
    no_gear: list[str] = []

    for cat in os.listdir(BASE_HERO):
        cp = os.path.join(BASE_HERO, cat)
        if not os.path.isdir(cp) or cat == "공용 아이콘":
            continue
        for sub in os.listdir(cp):
            sp = os.path.join(cp, sub)
            if not os.path.isdir(sp):
                continue
            for hf in os.listdir(sp):
                hp = os.path.join(sp, hf)
                if not os.path.isdir(hp):
                    continue
                hero_name = folder_to_name(hf)
                src = find_gear_src(hp)
                if not src:
                    no_gear.append(hero_name)
                    continue
                if not os.path.basename(src).endswith("_전용장비.png"):
                    src = ensure_standard_name(hp, hero_name, src)
                    renamed += 1
                hero_id = id_by_name.get(hero_name)
                if not hero_id:
                    missing_hero.append(hero_name)
                    continue
                dest = os.path.join(ROOT, "public", "images", hero_id, "exclusive-gear.png")
                save_png(src, dest)
                copied += 1
                meta[hero_id] = {
                    "heroName": hero_name,
                    "iconUrl": f"/images/{hero_id}/exclusive-gear.png",
                }

    with open(OUT_META, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
        f.write("\n")

    return {
        "meta_count": len(meta),
        "renamed": renamed,
        "copied": copied,
        "missing_hero": missing_hero,
        "no_gear": no_gear,
    }


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    result = sync()
    print(f"전용장비 메타 {result['meta_count']}명")
    print(f"Tex → *_전용장비.png 이름 변경: {result['renamed']}개")
    print(f"public 복사: {result['copied']}개")
    if result["missing_hero"]:
        print(f"[경고] scraped_heroes 매칭 없음: {', '.join(sorted(set(result['missing_hero'])))}")
    if result["no_gear"]:
        print(f"[정보] 전용장비 PNG 없음: {', '.join(sorted(set(result['no_gear'])))}")


if __name__ == "__main__":
    main()
