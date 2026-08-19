# -*- coding: utf-8 -*-
"""
rebuild_heroes_json.py — 112개 영웅 파싱 및 scraped_heroes.json 구조화

오타 수정을 포함하여 description과 skillEnhance, transcendenceEffects를 온전히 정돈합니다.
"""
import os, json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

BASE_ASSET = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\asset\영웅 목록'
OUTPUT_JSON = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\src\data\scraped_heroes.json'

existing_metadata = {}
if os.path.exists(OUTPUT_JSON):
    try:
        with open(OUTPUT_JSON, encoding='utf-8') as f:
            old_data = json.load(f)
            for h in old_data:
                name = h.get('name', '')
                if name:
                    existing_metadata[name] = {
                        'title': h.get('title', ''),
                        'baseSpeed': h.get('baseSpeed', 0),
                        'baseStats': h.get('baseStats', {}),
                    }
    except Exception as e:
        print(f"기존 메타데이터 로드 실패: {e}")

ROLE_MAP = {'공격형': 'offensive', '방어형': 'defensive', '마법형': 'magic', '지원형': 'support', '만능형': 'universal'}
CATEGORY_MAP = {'스페셜 영웅': 'special', '일반영웅': 'normal', '아스드 대륙': 'asgard', '아이사 대륙': 'aisha'}
SKILL_TYPE_MAP = {'Normal': 'basic_attack', 'Active1': 'active', 'Active2': 'active', 'Passive': 'passive', 'Awakening': 'awaken_skill'}
SKILL_DIRECTION_MAP = {'Active1': 'upper', 'Active2': 'down', 'Awakening': 'awaken'}
AISHA_GROUP_MAP = {'달빛의 섬': '달빛의 섬', '삼국호걸': '삼국호걸', '신지': '신지', '어둠의 안식처': '어둠의 안식처', '천자의 땅 동쪽': '천자의 땅', '천자의 땅 서쪽': '천자의 땅'}
ASGARD_GROUP_MAP = {'복주자의 지옥': '복주자의 지옥', '신비의 숲': '신비의 숲', '암흑의 무덤': '암흑의 무덤', '용의 유적지': '용의 유적지', '침묵의 광산': '침묵의 광산', '화염의 사막': '화염의 사막'}
NORMAL_GROUP_MAP = {'그림자단': '그림자단', '모험가': '모험가', '성십자단': '성십자단', '에반원정대': '에반 원정대', '테라영지': '테라영지'}

def get_skills_path(hero_path):
    for name in ('skills', '스킬'):
        p = os.path.join(hero_path, name)
        if os.path.exists(p):
            return p
    return None

def infer_attack_type(role_str, skill_data):
    all_text = ""
    for s in skill_data:
        for eff in s.get('effects', []):
            all_text += " ".join(eff.get('details', []))
    if '마법 공격력' in all_text or role_str == '마법형':
        return 'magic'
    return 'physical'

def parse_hero_folder(cat_folder, sub_folder, hero_folder_name, hero_path):
    folder_raw = hero_folder_name
    is_awakened = '(각성)' in folder_raw
    
    role_match = re.search(r'\((공격형|방어형|마법형|지원형|만능형)\)', folder_raw)
    role_str = role_match.group(1) if role_match else '만능형'
    role = ROLE_MAP.get(role_str, 'universal')
    
    hero_name = re.sub(r'\([^)]+\)', '', folder_raw).strip()
    
    skills_path = get_skills_path(hero_path)
    skill_data = []
    root_tooltips = {}
    
    if skills_path:
        json_files = [f for f in os.listdir(skills_path) if f.endswith('.json')]
        if json_files:
            with open(os.path.join(skills_path, json_files[0]), encoding='utf-8') as f:
                raw = json.load(f)
            skill_data = raw.get('skills', [])
            root_tooltips = raw.get('tooltips', {})
    
    category = CATEGORY_MAP.get(cat_folder, 'normal')
    if cat_folder == '아이사 대륙': group = AISHA_GROUP_MAP.get(sub_folder, sub_folder)
    elif cat_folder == '아스드 대륙': group = ASGARD_GROUP_MAP.get(sub_folder, sub_folder)
    elif cat_folder == '일반영웅': group = NORMAL_GROUP_MAP.get(sub_folder, sub_folder)
    elif cat_folder == '스페셜 영웅': group = sub_folder
    else: group = sub_folder
    
    attack_type = infer_attack_type(role_str, skill_data)
    hero_id = hero_name.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('각성', '_awakened')
    
    skills = []
    for s in skill_data:
        s_type_raw = s.get('type', 'Normal')
        s_type = SKILL_TYPE_MAP.get(s_type_raw, 'active')
        s_direction = SKILL_DIRECTION_MAP.get(s_type_raw, '')
        
        # 1) pure effects
        raw_effects = s.get('effects', [])
        desc_lines = []
        for eff in raw_effects:
            target = eff.get('target', '')
            details = eff.get('details', [])
            detail_str = "\n".join(details) if isinstance(details, list) else str(details)
            if target:
                desc_lines.append(f"[{target}]\n{detail_str}")
            else:
                desc_lines.append(detail_str)
        
        description = "\n\n".join(desc_lines)
        
        # 2) skillEnhance
        raw_enhance = s.get('skill_enhance', [])
        enhance_list = []
        if isinstance(raw_enhance, list):
            enhance_list = [str(x) for x in raw_enhance]
        elif isinstance(raw_enhance, str) and raw_enhance.strip():
            enhance_list = [raw_enhance.strip()]
            
        # 3) transcendenceEffects
        raw_trans = s.get('transcendence_effects', {})
        trans_dict = {}
        if isinstance(raw_trans, dict):
            for k, v in raw_trans.items():
                trans_dict[str(k)] = str(v)
                
        # 4) tooltips
        sk_tooltips = s.get('tooltips', {})
        merged_tooltips = {**root_tooltips, **sk_tooltips}
        
        skill_name = s.get('name', '')
        
        skills.append({
            'id': f"{hero_id}_{s_type_raw.lower()}",
            'name': skill_name,
            'type': s_type,
            'direction': s_direction,
            'cooldown': s.get('cooldown', 0),
            'description': description,
            'effects': raw_effects,
            'skillEnhance': enhance_list,
            'transcendenceEffects': trans_dict,
            'tooltips': merged_tooltips,
            'iconUrl': '',
        })
    
    meta = existing_metadata.get(hero_name, {})
    
    return {
        'id': hero_id,
        'name': hero_name,
        'title': meta.get('title', ''),
        'group': group,
        'category': category,
        'role': role,
        'attackType': attack_type,
        'rarity': 'legend' if category == 'special' else 'rare',
        'isAwakened': is_awakened,
        'baseStats': meta.get('baseStats', {
            'hp': 0, 'speed': meta.get('baseSpeed', 0), 'def': 0,
            'critRate': 0, 'critDmg': 0, 'weakRate': 0,
        }),
        'portraitUrl': '',
        'skills': skills,
    }

def main():
    heroes = []
    total = 0
    for cat_folder in sorted(os.listdir(BASE_ASSET)):
        cat_path = os.path.join(BASE_ASSET, cat_folder)
        if os.path.isfile(cat_path) or cat_folder in ('공용 아이콘', '기타'): continue
        for sub_folder in sorted(os.listdir(cat_path)):
            sub_path = os.path.join(cat_path, sub_folder)
            if os.path.isfile(sub_path): continue
            hero_dirs = [d for d in os.listdir(sub_path) if os.path.isdir(os.path.join(sub_path, d))]
            if hero_dirs:
                for hero_folder in sorted(hero_dirs):
                    hero_path = os.path.join(sub_path, hero_folder)
                    hero = parse_hero_folder(cat_folder, sub_folder, hero_folder, hero_path)
                    heroes.append(hero)
                    total += 1

    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(heroes, f, ensure_ascii=False, indent=2)

    print(f"총 {total}명 파싱 완료")

if __name__ == '__main__':
    main()
