# -*- coding: utf-8 -*-
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

JSON_PATH = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\src\data\scraped_heroes.json'
with open(JSON_PATH, encoding='utf-8') as f:
    heroes = json.load(f)

for h in heroes:
    if h['name'] in ('리', '헤브니아'):
        print(f"\n=== [{h['name']}] ===")
        for sk in h['skills']:
            print(f"  - 스킬: {sk['name']} (type={sk.get('type')})")
            print(f"    description: {repr(sk.get('description'))}")
            print(f"    tooltips: {list(sk.get('tooltips',{}).keys())}")
