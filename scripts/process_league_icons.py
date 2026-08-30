# -*- coding: utf-8 -*-
"""메이저/마이너 리그 — 색 엠블럼 제거, 흰 글리프(MAJOR/MINOR)만 투명 PNG."""
from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "asset", "공용 아이콘")
DEST_DIR = os.path.join(ROOT, "public", "images", "ui")

# (y0, y1) — 원본 높이 대비 글자 띠 (마이너는 가로 바 장식 제외해 더 타이트)
SRC_FILES = {
    "메이저리그 아이콘.png": ("league-major.png", 0.41, 0.64),
    "마이너리그 아이콘.png": ("league-minor.png", 0.45, 0.59),
}

# 동일 캔버스 (가로형 워드마크)
OUT_W = 128
OUT_H = 48
PAD = 4


def extract_wordmark_glyph(src_path: str, band_y0: float, band_y1: float) -> Image.Image:
    im = Image.open(src_path).convert("RGBA")
    arr = np.asarray(im, dtype=np.float32)
    h, w = arr.shape[:2]
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]

    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = np.where(mx > 1, (mx - mn) / np.maximum(mx, 1), 0)

    # 붉은/푸른 엠블럼 배경 제외 → 워드마크(밝은 글자)만
    is_red_emblem = (r > 90) & (g < 70) & (b < 70) & (sat > 0.25)
    is_blue_emblem = (b > 90) & (r < 70) & (g < 100) & (sat > 0.20)
    glyph_full = (lum >= 175) & (a >= 40) & ~is_red_emblem & ~is_blue_emblem

    y0, y1 = int(h * band_y0), int(h * band_y1)
    x0, x1 = int(w * 0.10), int(w * 0.90)
    glyph = glyph_full[y0:y1, x0:x1]

    ys, xs = np.where(glyph)
    if ys.size == 0:
        raise RuntimeError(f"글리프 추출 실패: {src_path}")

    by0, by1 = int(ys.min()), int(ys.max()) + 1
    bx0, bx1 = int(xs.min()), int(xs.max()) + 1

    crop = np.zeros((by1 - by0, bx1 - bx0, 4), dtype=np.uint8)
    crop[..., 0] = 255
    crop[..., 1] = 255
    crop[..., 2] = 255
    crop[..., 3] = np.where(glyph[by0:by1, bx0:bx1], 255, 0)

    word = Image.fromarray(crop, "RGBA")
    scale = min((OUT_W - PAD * 2) / word.width, (OUT_H - PAD * 2) / word.height)
    nw = max(1, int(round(word.width * scale)))
    nh = max(1, int(round(word.height * scale)))
    word = word.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    ox = (OUT_W - nw) // 2
    oy = (OUT_H - nh) // 2
    canvas.paste(word, (ox, oy), word)
    return canvas


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    os.makedirs(DEST_DIR, exist_ok=True)

    for src_name, (slug, y0, y1) in SRC_FILES.items():
        src = os.path.join(SRC_DIR, src_name)
        if not os.path.isfile(src):
            print(f"[skip] 없음: {src_name}", file=sys.stderr)
            continue
        out = extract_wordmark_glyph(src, y0, y1)
        dest = os.path.join(DEST_DIR, slug)
        out.save(dest)
        print(f"{src_name} → {slug} ({out.size[0]}×{out.size[1]})")


if __name__ == "__main__":
    main()
