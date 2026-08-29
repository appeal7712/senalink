# -*- coding: utf-8 -*-
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\src\data\scraped_heroes.json', encoding='utf-8') as f:
    heroes = json.load(f)

# 카일 찾기
for h in heroes:
    if h['name'] == '카일':
        print(f"카일 portraitUrl: {repr(h.get('portraitUrl',''))}")
        for sk in h['skills']:
            print(f"\n--- 스킬: {sk['name']} (type={sk.get('type')}) ---")
            print(f"  description: {repr(sk.get('description','')[:80])}")
            print(f"  iconUrl: {repr(sk.get('iconUrl',''))}")
            print(f"  skill_enhance keys: {list(sk.get('skill_enhance',{}).keys()) if isinstance(sk.get('skill_enhance'), dict) else repr(sk.get('skill_enhance',''))[:80]}")
            print(f"  effects sample: {repr(str(sk.get('effects',''))[:120])}")
        break

# 초월 효과 확인
print("\n\n=== 초월 효과 필드 확인 (첫 3명) ===")
for h in heroes[:5]:
    if h.get('breakthrough') or h.get('transcend') or any(k for k in h.keys() if '초월' in k or 'break' in k.lower()):
        print(f"[{h['name']}] 초월 관련 필드: {[k for k in h.keys() if '초월' in k or 'break' in k.lower() or 'transcend' in k.lower()]}")

# 전체 영웅 키 목록
print(f"\n영웅 JSON 키 목록: {list(heroes[0].keys())}")

# 스킬 강화 구조 샘플
print("\n=== skill_enhance 구조 샘플 (카르마) ===")
for h in heroes:
    if h['name'] == '카르마':
        for sk in h['skills']:
            enh = sk.get('skill_enhance')
            if enh:
                print(f"  스킬: {sk['name']}")
                print(f"  skill_enhance: {repr(str(enh)[:300])}")
        break
