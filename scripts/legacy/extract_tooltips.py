# -*- coding: utf-8 -*-
import json, os, sys, glob
sys.stdout.reconfigure(encoding='utf-8')

BASE_ASSET = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\asset\영웅 목록'

json_files = glob.glob(os.path.join(BASE_ASSET, '**', '*.json'), recursive=True)
print(f"찾은 JSON 파일 총 {len(json_files)}개")

tooltips_found = {}

for jf in json_files:
    try:
        with open(jf, encoding='utf-8') as f:
            data = json.load(f)
            # data root or skills[].tooltips
            if isinstance(data, dict):
                if 'tooltips' in data:
                    for k, v in data['tooltips'].items():
                        tooltips_found[k] = v
                if 'skills' in data:
                    for sk in data['skills']:
                        if 'tooltips' in sk:
                            for k, v in sk['tooltips'].items():
                                tooltips_found[k] = v
    except Exception as e:
        pass

print(f"실제 asset JSON에서 발견된 tooltips 용어 수: {len(tooltips_found)}개")
for k in list(tooltips_found.keys())[:30]:
    print(f" - {k}: {tooltips_found[k][:60]}")

with open(r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\src\data\extracted_tooltips.json', 'w', encoding='utf-8') as f:
    json.dump(tooltips_found, f, ensure_ascii=False, indent=2)
