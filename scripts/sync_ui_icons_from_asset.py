# -*- coding: utf-8 -*-
"""asset/공용 아이콘 → public/images/ui (소형 UI 글리프만; community/arena 배너는 별도 유지)."""
from __future__ import annotations

import json
import os
import shutil
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "asset", "공용 아이콘")
DEST = os.path.join(ROOT, "public", "images", "ui")

# asset 파일명 → public slug (확장자 .png)
COPY_MAP: dict[str, str] = {
    "NEW 아이콘.png": "new-badge.png",
    "PVE아이콘.png": "pve.png",
    "PVP아이콘.png": "pvp.png",
    "각성 아이콘.png": "awaken.png",
    "강림원정대 아이콘.png": "expedition.png",
    "강림 원정대 아이콘.png": "expedition.png",
    "결투장 아이콘.png": "arena.png",
    "상급 결투장 아이콘.png": "arena-advanced.png",
    "공격진형 아이콘.png": "formation-attack.png",
    "공성전 아이콘.png": "siege.png",
    "공유 아이콘.png": "share.png",
    "공지 아이콘.png": "hub-notice.png",
    "글 작성, 공지 작성 아이콘.png": "hub-write.png",
    "관리자 아이콘.png": "hub-admin.png",
    "기본진형 아이콘.png": "formation-basic.png",
    "기용률1위 아이콘.png": "pick-rate-1.png",
    "기용률2위 아이콘.png": "pick-rate-2.png",
    "기용률3위 아이콘.png": "pick-rate-3.png",
    "길드마스터 아이콘.png": "hub-master.png",
    "길드허브 길드원, 길드원관리 아이콘.png": "hub-members.png",
    "길드허브 아이콘.png": "hub.png",
    "다운로드 아이콘.png": "download.png",
    "닫기 버튼.png": "close.png",
    "도감 아이콘.png": "encyclopedia.png",
    "도구 아이콘.png": "tools.png",
    "마이너리그 아이콘.png": "league-minor.png",
    "마이너스 아이콘.png": "minus.png",
    "메이저리그 아이콘.png": "league-major.png",
    "메인페이지 아이콘.png": "main.png",
    "밸런스진형 아이콘.png": "formation-balance.png",
    "보스아이콘.png": "boss.png",
    "보호진형 아이콘.png": "formation-protect.png",
    "설정 아이콘.png": "settings.png",
    "세팅공유 아이콘.png": "setting-share.png",
    "속공 아이콘.png": "speed-attack.png",
    "순위 아이콘.png": "rank.png",
    "스킬예약,진형 선택 레이어.png": "skill-formation-layer.png",
    "스킬예약0.png": "skill-reserve-0.png",
    "스킬예약1.png": "skill-reserve-1.png",
    "스킬예약2.png": "skill-reserve-2.png",
    "스킬예약3.png": "skill-reserve-3.png",
    "시스템 아이콘.png": "system.png",
    "시간 아이콘.png": "time.png",
    "아군 덱 아이콘.png": "deck-ally.png",
    "영웅 아이콘.png": "hero.png",
    "적군 덱 아이콘.png": "deck-enemy.png",
    "장비 세팅 아이콘.png": "gear-setting.png",
    "펫 아이콘.png": "pet.png",
    "플러스 아이콘.png": "plus.png",
    "허브 나가기 아이콘.png": "hub-exit.png",
    "전용장비 백그라운드 레이어.png": "exclusive-gear-card-bg.png",
    "전용장비 백그라운드 레이어 테두리.png": "exclusive-gear-card-border.png",
}

SKIP_PREFIX = ("Atl_", "Tex_")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    os.makedirs(DEST, exist_ok=True)
    sizes: dict[str, list[int]] = {}
    copied: list[str] = []

    for fname, slug in COPY_MAP.items():
        src = os.path.join(SRC, fname)
        if not os.path.isfile(src):
            print(f"[skip] 없음: {fname}", file=sys.stderr)
            continue
        dest = os.path.join(DEST, slug)
        shutil.copy2(src, dest)
        im = Image.open(dest)
        sizes[slug] = [im.size[0], im.size[1]]
        copied.append(slug)

    # 레거시 경로 호환 (기존 import 경로)
    legacy = {
        "hero.png": "hero-icon.png",
        "pet.png": "pet-icon.png",
        "close.png": None,
        "speed-attack.png": "speed.png",
    }
    for slug, legacy_name in legacy.items():
        src = os.path.join(DEST, slug)
        if not os.path.isfile(src):
            continue
        if legacy_name:
            shutil.copy2(src, os.path.join(DEST, legacy_name))

    meta_path = os.path.join(ROOT, "src", "data", "uiIcons.meta.json")
    json.dump(sizes, open(meta_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"복사 {len(copied)}개 → {DEST}")
    print(f"메타 → {meta_path}")


if __name__ == "__main__":
    main()
