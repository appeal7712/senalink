# -*- coding: utf-8 -*-
import os, sys, re, shutil
sys.stdout.reconfigure(encoding='utf-8')

BASE_ASSET = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\asset\영웅 목록'
PUBLIC_DIR = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\public\images'

def get_hero_name(folder_name):
    name = re.sub(r'\((공격형|방어형|마법형|지원형|만능형)\)', '', folder_name).strip()
    name = name.replace('(각성)', '').strip()
    return name

portrait_count = 0
skill_count = 0

for cat_folder in sorted(os.listdir(BASE_ASSET)):
    cat_path = os.path.join(BASE_ASSET, cat_folder)
    if os.path.isfile(cat_path) or cat_folder in ('공용 아이콘', '기타'): continue
    for sub_folder in sorted(os.listdir(cat_path)):
        sub_path = os.path.join(cat_path, sub_folder)
        if os.path.isfile(sub_path): continue
        for hero_folder in os.listdir(sub_path):
            hero_path = os.path.join(sub_path, hero_folder)
            if not os.path.isdir(hero_path): continue
            hero_name = get_hero_name(hero_folder)
            dest_dir = os.path.join(PUBLIC_DIR, hero_name)
            os.makedirs(dest_dir, exist_ok=True)
            
            # 모든 이미지 확장자 지원 (.png, .webp, .jpg, .jpeg)
            root_imgs = [f for f in os.listdir(hero_path) if f.lower().endswith(('.png', '.webp', '.jpg', '.jpeg')) and not os.path.isdir(os.path.join(hero_path, f))]
            portrait_src = None
            
            for f in root_imgs:
                if '초상화' in f:
                    portrait_src = os.path.join(hero_path, f)
                    break
            if not portrait_src and root_imgs:
                portrait_src = os.path.join(hero_path, root_imgs[0])
            
            if portrait_src:
                # 확장자 유지 복사
                ext = os.path.splitext(portrait_src)[1]
                dst = os.path.join(dest_dir, f'portrait{ext}')
                shutil.copy2(portrait_src, dst)
                portrait_count += 1
            
            # Skills 복사 (.png, .webp 모두)
            skills_src = None
            for sname in ('skills', '스킬'):
                cand = os.path.join(hero_path, sname)
                if os.path.exists(cand):
                    skills_src = cand
                    break
            if skills_src:
                skills_dst = os.path.join(dest_dir, 'skills')
                os.makedirs(skills_dst, exist_ok=True)
                for f in os.listdir(skills_src):
                    if f.lower().endswith(('.png', '.webp', '.jpg', '.jpeg')):
                        shutil.copy2(os.path.join(skills_src, f), os.path.join(skills_dst, f))
                        skill_count += 1

print(f"이미지 확장자 통합 초상화 복사: {portrait_count}명")
print(f"스킬 복사: {skill_count}개")
