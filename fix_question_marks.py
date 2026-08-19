# -*- coding: utf-8 -*-
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

JSON_PATH = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\src\data\scraped_heroes.json'

with open(JSON_PATH, encoding='utf-8') as f:
    text = f.read()

# 텍스트 치환
text = text.replace('(물음표네개)', '????')
text = text.replace('(물음표 네개)', '????')
text = text.replace('(물음표)', '?')
text = text.replace('(느낌표)', '!')
text = text.replace('(콜론)', ':')

with open(JSON_PATH, 'w', encoding='utf-8') as f:
    f.write(text)

print("scraped_heroes.json 물음표/느낌표/콜론 텍스트 전수 치환 완료!")
