# -*- coding: utf-8 -*-
"""
fix_hero_paths.py — 이미지 확장자 통합 (.png, .webp, .jpg) & 경로 업데이트
"""
import json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')

JSON_PATH     = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\src\data\scraped_heroes.json'
PUBLIC_IMAGES = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\public\images'

def normalize(s):
    s = s.replace('_아이콘', '')
    s = re.sub(r'[!?!?、。・…\[\]\(\)\:\-\.]', '', s)
    s = re.sub(r'\s+', '', s)
    s = s.replace('느낌표', '').replace('물음표', '').replace('콜론', '')
    return s.lower()

def find_best_file(skill_name, available_files):
    target = normalize(skill_name)
    for f in available_files:
        fname = os.path.splitext(f)[0]
        if normalize(fname) == target:
            return f
    candidates = []
    for f in available_files:
        fname = os.path.splitext(f)[0]
        fnorm = normalize(fname)
        if target and (target in fnorm or fnorm in target) and len(target) >= 2:
            candidates.append((abs(len(target) - len(fnorm)), f))
    if candidates:
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]
    return None

OLD_SEVEN_GROUPS    = {'(구)세븐나이츠'}
SPECIAL_GROUPS      = {'세븐나이츠', '다크나이츠', '사황', '(구)사황', '루미너스 혁명단', '천상의 수호자', '펜타곤', '경계의 수호자', '????'}
SPECIAL_HEROES      = {'오를리', '아킬라', '오목', '칼헤론', '클라한', '카구라', '동영'}
SEMI_SPECIAL_HEROES = {
    '타카', '미호', '아멜리아',
    '룩', '챈슬러', '엘리스', '아라곤', '비스킷', '돼오',
    '루리', '니아', '에스파다', '세인', '지크',
    '발리스타', '녹스', '리나', '백룡',
    '유신', '비담', '백각', '소교', '나타',
    '파스칼', '초선', '관우',
}

def get_card_tier(hero):
    name  = hero.get('name', '')
    group = hero.get('group', '')
    if group in OLD_SEVEN_GROUPS:           return 'old_seven'
    if group in SPECIAL_GROUPS:            return 'special'
    if name  in SPECIAL_HEROES:            return 'special'
    if name  in SEMI_SPECIAL_HEROES:       return 'semi_special'
    return 'normal'

with open(JSON_PATH, encoding='utf-8') as f:
    heroes = json.load(f)

portrait_ok = 0
skill_ok = 0

for h in heroes:
    name = h['name']

    # 초상화 확장자 탐색 (portrait.png, portrait.webp, portrait.jpg 등)
    hero_img_dir = os.path.join(PUBLIC_IMAGES, name)
    portrait_url = ''
    if os.path.exists(hero_img_dir):
        for f in os.listdir(hero_img_dir):
            if f.startswith('portrait.'):
                portrait_url = f'/images/{name}/{f}'
                portrait_ok += 1
                break
    h['portraitUrl'] = portrait_url

    # 스킬 파일 탐색
    skills_dir = os.path.join(PUBLIC_IMAGES, name, 'skills')
    if os.path.exists(skills_dir):
        available_files = [f for f in os.listdir(skills_dir) if f.lower().endswith(('.png', '.webp', '.jpg'))]
    else:
        available_files = []

    for skill in h.get('skills', []):
        skill_name = skill.get('name', '')
        if not skill_name:
            skill['iconUrl'] = ''
            continue

        matched = find_best_file(skill_name, available_files)
        if matched:
            skill['iconUrl'] = f'/images/{name}/skills/{matched}'
            skill_ok += 1
        else:
            skill['iconUrl'] = ''

    h['cardTier'] = get_card_tier(h)

with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(heroes, f, ensure_ascii=False, indent=2)

print(f'초상화 URL 업데이트: {portrait_ok}명 / {len(heroes)}명')
print(f'스킬 매칭: {skill_ok}개')
