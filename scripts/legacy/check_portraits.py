# -*- coding: utf-8 -*-
import os, sys, re

sys.stdout.reconfigure(encoding='utf-8')
BASE_ASSET = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\asset\영웅 목록'

def get_hero_name(folder_name):
    name = re.sub(r'\((공격형|방어형|마법형|지원형|만능형)\)', '', folder_name).strip()
    name = name.replace('(각성)', '').strip()
    return name

missing_portraits = []
all_heroes_count = 0

for cat_folder in sorted(os.listdir(BASE_ASSET)):
    cat_path = os.path.join(BASE_ASSET, cat_folder)
    if os.path.isfile(cat_path) or cat_folder in ('공용 아이콘', '기타'): continue
    for sub in sorted(os.listdir(cat_path)):
        sub_path = os.path.join(cat_path, sub)
        if os.path.isfile(sub_path): continue
        for h in os.listdir(sub_path):
            hero_path = os.path.join(sub_path, h)
            if not os.path.isdir(hero_path): continue
            all_heroes_count += 1
            hero_name = get_hero_name(h)
            pngs = [f for f in os.listdir(hero_path) if f.endswith('.png')]
            portrait = [f for f in pngs if '초상화' in f]
            if not portrait:
                missing_portraits.append((hero_name, h, pngs))

print(f"총 영웅 수: {all_heroes_count}")
print(f"초상화 파일명에 '초상화' 단어가 없는 영웅 ({len(missing_portraits)}명):")
for m in missing_portraits:
    print(m)
