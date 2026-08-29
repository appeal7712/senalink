# -*- coding: utf-8 -*-
import os, json, sys
sys.stdout.reconfigure(encoding='utf-8')

collab_dir = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\asset\영웅 목록\기타\콜라보레이션(나혼자만 레벨업)'
json_path  = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\src\data\scraped_heroes.json'

with open(json_path, encoding='utf-8') as f:
    heroes = json.load(f)

for hero_folder in os.listdir(collab_dir):
    hero_path = os.path.join(collab_dir, hero_folder)
    if not os.path.isdir(hero_path): continue
    
    skills_dir = os.path.join(hero_path, 'skills')
    if not os.path.exists(skills_dir): continue
    
    for f in os.listdir(skills_dir):
        if f.endswith('.json'):
            fpath = os.path.join(skills_dir, f)
            with open(fpath, encoding='utf-8') as jf:
                data = json.load(jf)
                h_name = data.get('hero_name', '').strip()
                parsed_skills = []
                for sk in data.get('skills', []):
                    desc_lines = []
                    for eff in sk.get('effects', []):
                        if 'target' in eff:
                            target_str = eff['target']
                            desc_lines.append(f'[{target_str}]')
                        for d in eff.get('details', []):
                            desc_lines.append(d)
                    
                    sk_type = 'active'
                    if sk.get('type') == 'Normal': sk_type = 'basic_attack'
                    elif sk.get('type') == 'Passive': sk_type = 'passive'
                    elif sk.get('type') == 'Awaken': sk_type = 'awaken_skill'
                    
                    s_name = sk.get('name')
                    icon_name = f'{s_name}_아이콘.png'
                    icon_url = f'/images/{h_name}/skills/{icon_name}'
                    
                    parsed_skills.append({
                        'name': s_name,
                        'type': sk_type,
                        'cooldown': sk.get('cooldown', 0),
                        'description': '\n'.join(desc_lines),
                        'skillEnhance': sk.get('skill_enhance', []),
                        'transcendenceEffects': sk.get('transcendence_effects', {}),
                        'iconUrl': icon_url
                    })
                
                for h in heroes:
                    if h['name'].replace('(각성)', '').strip() == h_name:
                        h['skills'] = parsed_skills
                        if h_name == '성진우':
                            h['category'] = 'other'
                            h['group']    = '콜라보레이션'
                            h['cardTier'] = 'special'
                            h['rarity']   = 'legend_special'
                        elif h_name == '차해인':
                            h['category'] = 'other'
                            h['group']    = '콜라보레이션'
                            h['cardTier'] = 'semi_special'
                            h['rarity']   = 'legend'
                        elif h_name in ('유진호', '이주희'):
                            h['category'] = 'other'
                            h['group']    = '콜라보레이션'
                            h['cardTier'] = 'normal'
                            h['rarity']   = 'rare'
                        print(f'Successfully updated full skills for {h_name}! Count: {len(parsed_skills)}')

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(heroes, f, ensure_ascii=False, indent=2)

print('Full JSON sync completed!')
