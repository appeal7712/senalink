# -*- coding: utf-8 -*-
import os, json, sys
sys.stdout.reconfigure(encoding='utf-8')

base = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\asset\영웅 목록'
p = os.path.join(base, '아스드 대륙', '복주자의 지옥', '녹스(방어형)(각성)', 'skills')
files = os.listdir(p)
print('녹스(각성) skills 폴더:', files)
for f in files:
    if f.endswith('.json'):
        with open(os.path.join(p, f), encoding='utf-8') as fp:
            data = json.load(fp)
        for s in data.get('skills', []):
            print(f"  타입: {s['type']} / 이름: {s['name']}")
