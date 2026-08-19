from collections import Counter
from pathlib import Path
import json
import re
import shutil

from PIL import Image

root = Path(r"D:\안티그래비티 프로젝트 폴더\sevennight_guild_web_formal")
acc_dir = root / "asset" / "장비, 장신구" / "장신구"
eq_dir = root / "asset" / "장비, 장신구" / "장비"
pub_eq = root / "public" / "images" / "equipment"
pub_piece = pub_eq / "pieces"
pub_acc = root / "public" / "images" / "accessories"
pub_piece.mkdir(parents=True, exist_ok=True)
pub_acc.mkdir(parents=True, exist_ok=True)

SETS = ["복수자", "선봉장", "성기사", "수문장", "수호자", "암살자", "조율자", "주술사", "추적자"]
SLOT_MAP = {"물리공격": "physical", "마법공격": "magic", "방어구": "armor"}

pieces = []
for f in sorted(eq_dir.glob("*.png")):
    name = f.stem
    if name in SETS:
        shutil.copy2(f, pub_eq / f.name)
        continue
    parts = name.split("_")
    if len(parts) < 3:
        print("UNPARSED", name)
        continue
    item_name = parts[0]
    slot = parts[1]
    sets_raw = "_".join(parts[2:])
    sets = [s.strip().lstrip(",") for s in re.split(r"[,]", sets_raw) if s.strip().lstrip(",")]
    slot_id = SLOT_MAP.get(slot, slot)
    shutil.copy2(f, pub_piece / f.name)
    pieces.append({
        "id": f"piece_{item_name}_{slot_id}",
        "name": item_name,
        "slot": slot_id,
        "slotLabel": slot,
        "sets": sets,
        "iconUrl": f"/images/equipment/pieces/{f.name}",
    })

print("PIECES", len(pieces))


def classify(rgb):
    r, g, b = rgb
    mx, mn = max(r, g, b), min(r, g, b)
    if mx - mn < 28 and 70 < mx < 210:
        return "normal"
    if g >= r + 8 and g >= b:
        return "advanced"
    if b >= r + 15 and b >= g - 5:
        return "rare"
    if r >= 150 and g >= 70 and b < 110:
        return "legendary"
    if r >= 140 and g >= 100 and b < 140 and r >= b:
        return "legendary"
    return "advanced"


ref = Image.open(next(acc_dir.glob("등급 참고용*.png"))).convert("RGB")
w, h = ref.size
cols, rows = 9, 4
cw, ch = w / cols, h / rows

cells = []
for row in range(rows):
    for col in range(cols):
        x0, y0 = int(col * cw), int(row * ch)
        x1, y1 = int((col + 1) * cw), int((row + 1) * ch)
        cell = ref.crop((x0, y0, x1, y1))
        cx, cy = cell.width // 2, cell.height // 2
        center = cell.getpixel((cx, cy))
        if center[0] > 220 and center[1] > 220 and center[2] > 220:
            continue
        samples = []
        for dy in range(int(cell.height * 0.28), int(cell.height * 0.72)):
            for dx in range(int(cell.width * 0.08), int(cell.width * 0.22)):
                samples.append(cell.getpixel((dx, dy)))
        samples = [s for s in samples if 25 < sum(s) / 3 < 245]
        if len(samples) < 20:
            continue
        avg = tuple(sum(v[i] for v in samples) // len(samples) for i in range(3))
        fp = list(cell.resize((24, 24), Image.Resampling.BILINEAR).convert("L").getdata())
        cells.append({"r": row, "c": col, "avg": avg, "rarity": classify(avg), "fp": fp})

print("CELLS", len(cells), Counter(c["rarity"] for c in cells))
for c in cells:
    print(f"  {c['r']},{c['c']} {c['rarity']} avg={c['avg']}")


def ring_fp(im, size=48):
    im = im.convert("RGB").resize((size, size), Image.Resampling.BILINEAR)
    vals = []
    for y in range(size):
        for x in range(size):
            r, g, b = im.getpixel((x, y))
            if r + g + b < 45:
                continue
            vals.extend((r, g, b))
    return vals


def mae(a, b):
    n = min(len(a), len(b))
    if n < 30:
        return 10 ** 9
    return sum(abs(a[i] - b[i]) for i in range(n)) / n



dex = json.loads((acc_dir / "장신구 도감.json").read_text(encoding="utf-8"))
effects = {d["이름"]: d["효과"] for d in dex}

acc_files = [
    f for f in sorted(acc_dir.glob("*.png"))
    if f.stem != "반지" and "등급 참고용" not in f.stem
]

used = set()
accessories = []
for f in acc_files:
    shutil.copy2(f, pub_acc / f.name)
    fp = fp_of(Image.open(f))
    best = None
    best_d = 10 ** 18
    for i, cell in enumerate(cells):
        if i in used:
            continue
        d = dist(fp, cell["fp"])
        if d < best_d:
            best_d = d
            best = i
    rarity = "advanced"
    if best is not None:
        used.add(best)
        rarity = cells[best]["rarity"]
        print(f"MATCH {f.stem} -> {cells[best]['r']},{cells[best]['c']} {rarity} d={best_d}")
    else:
        print("NO MATCH", f.stem)

    effect = effects.get(f.stem)
    if not effect:
        key = f.stem.replace("샐리", "샐러")
        effect = effects.get(key, "")

    short = re.sub(r"^(일반|고급|희귀|전설)\s*", "", f.stem)
    accessories.append({
        "id": f"acc_{short}",
        "name": f.stem,
        "shortLabel": short.replace("의 반지", "").replace(" 반지", ""),
        "type": "장신구",
        "rarity": rarity,
        "iconUrl": f"/images/accessories/{f.name}",
        "effect": effect,
        "description": "",
    })

out_path = root / "src" / "data" / "gearDex.generated.json"
out_path.write_text(json.dumps({"pieces": pieces, "accessories": accessories}, ensure_ascii=False, indent=2), encoding="utf-8")
print("WROTE", out_path, "acc", len(accessories), "pieces", len(pieces))
