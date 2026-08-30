# -*- coding: utf-8 -*-
"""asset 초상화 → public/images (영웅·펫). 스킬·JSON 스키마는 건드리지 않음."""
from __future__ import annotations

import json
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_HERO = os.path.join(ROOT, "asset", "영웅 목록")
BASE_PET = os.path.join(ROOT, "asset", "펫 목록")
PUB = os.path.join(ROOT, "public", "images")
META_PATH = os.path.join(ROOT, "src", "data", "heroCardMeta.json")
PETS_JS = os.path.join(ROOT, "src", "data", "pets.js")

HERO_TARGETS = {"동영", "윤건"}


def hero_name(folder: str) -> str:
    n = re.sub(r"\((공격형|방어형|마법형|지원형|만능형)\)", "", folder).strip()
    return n.replace("(각성)", "").strip()


def find_portrait(hero_path: str) -> str | None:
    for f in os.listdir(hero_path):
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")) and "초상화" in f:
            return os.path.join(hero_path, f)
    return None


def save_png(src: str, dest: str) -> None:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    Image.open(src).convert("RGBA").save(dest, format="PNG", optimize=True)


def save_webp(src: str, dest: str) -> None:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    Image.open(src).convert("RGBA").save(dest, format="WEBP", quality=92, method=6)


def save_pet(src: str, dest: str) -> None:
    """펫 초상화는 PNG(RGBA)로만 저장 — JPG는 투명→검정이라 노란 슬롯 배경이 가려짐."""
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    dest_png = os.path.splitext(dest)[0] + ".png"
    Image.open(src).convert("RGBA").save(dest_png, format="PNG", optimize=True)


def pet_stem(filename: str) -> str | None:
    base = os.path.splitext(filename)[0]
    for suffix in ("_초상화", " 초상화"):
        if suffix in base:
            return base.replace(suffix, "").strip()
    if base.endswith("초상화"):
        return base[:-3].strip()
    return None


def load_pet_dest_by_stem() -> dict[str, str]:
    text = open(PETS_JS, encoding="utf-8").read()
    pairs = re.findall(r'"name":\s*"([^"]+)"[\s\S]*?"portraitUrl":\s*"([^"]+)"', text)
    by_stem: dict[str, str] = {}
    for _name, url in pairs:
        stem = os.path.splitext(os.path.basename(url))[0]
        by_stem[stem] = url
    return by_stem


def sync_heroes(meta: dict) -> list[str]:
    done: list[str] = []
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
                hn = hero_name(hf)
                if hn not in HERO_TARGETS:
                    continue
                src = find_portrait(hp)
                if not src:
                    print(f"[hero] 초상화 없음: {hn}", file=sys.stderr)
                    continue
                dest_png = os.path.join(PUB, hn, "portrait.png")
                save_png(src, dest_png)
                card_url = (meta.get(hn) or {}).get("cardUrl")
                if card_url:
                    card_path = os.path.join(ROOT, "public", card_url.lstrip("/"))
                    save_webp(src, card_path)
                    print(f"[hero] {hn}: portrait.png + {card_url}")
                else:
                    print(f"[hero] {hn}: portrait.png (덱은 portraitUrl 사용)")
                done.append(hn)
    return done


def sync_pets(pet_by_stem: dict[str, str]) -> tuple[list[str], list[str]]:
    done: list[str] = []
    missing: list[str] = []
    for f in os.listdir(BASE_PET):
        if not f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            continue
        stem = pet_stem(f)
        if not stem:
            continue
        url = pet_by_stem.get(stem)
        if not url:
            missing.append(f)
            continue
        src = os.path.join(BASE_PET, f)
        dest = os.path.join(ROOT, "public", url.lstrip("/"))
        save_pet(src, dest)
        done.append(stem)
    return done, missing


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    meta = json.load(open(META_PATH, encoding="utf-8"))
    pet_by_stem = load_pet_dest_by_stem()

    heroes = sync_heroes(meta)
    pets, missing = sync_pets(pet_by_stem)

    print("---")
    print(f"영웅 {len(heroes)}: {', '.join(sorted(heroes)) or '-'}")
    print(f"펫 {len(pets)}: {', '.join(sorted(pets))}")
    if missing:
        print(f"펫 매핑 없음: {missing}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
