import os
import re
import json
import urllib.request
import urllib.parse
import ssl
from pathlib import Path
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

# SSL bypass for urllib image downloads
ssl_context = ssl._create_unverified_context()

def download_image(url, save_path):
    try:
        if url.startswith("//"):
            url = "https:" + url
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        os.makedirs(save_path.parent, exist_ok=True)
        with urllib.request.urlopen(req, context=ssl_context) as response:
            img_data = response.read()
        with open(save_path, 'wb') as out_file:
            out_file.write(img_data)
        print(f"  [다운로드 완료] {save_path.name} ({len(img_data)} bytes)")
        return True
    except Exception as e:
        print(f"  [이미지 다운로드 실패] {url} -> {e}")
        return False

# Static mapping dictionary for all 84 heroes to bypass infobox text-replacement image styling
HERO_MAPPING = {
    # 세븐나이츠
    "루디": ("special", "세븐나이츠", "defensive", 18),
    "루디(각성)": ("special", "세븐나이츠", "defensive", 18),
    "아일린": ("special", "세븐나이츠", "universal", 22),
    "아일린(각성)": ("special", "세븐나이츠", "universal", 22),
    "레이첼": ("special", "세븐나이츠", "offensive", 22),
    "레이첼(각성)": ("special", "세븐나이츠", "offensive", 22),
    "델론즈": ("special", "세븐나이츠", "offensive", 22),
    "델론즈(각성)": ("special", "세븐나이츠", "offensive", 22),
    "제이브": ("special", "세븐나이츠", "universal", 22),
    "제이브(각성)": ("special", "세븐나이츠", "universal", 22),
    "스파이크": ("special", "세븐나이츠", "universal", 22),
    "스파이크(각성)": ("special", "세븐나이츠", "universal", 22),
    "크리스": ("special", "세븐나이츠", "universal", 22),
    "크리스(각성)": ("special", "세븐나이츠", "universal", 22),
    "바네사": ("special", "세븐나이츠", "universal", 22),
    
    # (구)세븐나이츠
    "겔리두스": ("special", "(구)세븐나이츠", "universal", 32),
    "밀리아": ("special", "(구)세븐나이츠", "offensive", 31),
    
    # 사황
    "에이스": ("special", "사황", "universal", 20),
    "여포": ("special", "사황", "universal", 20),
    "카르마": ("special", "사황", "universal", 20),
    "린": ("special", "사황", "magic", 20),
    
    # (구)사황
    "태오": ("special", "(구)사황", "universal", 30),
    "카일": ("special", "(구)사황", "offensive", 30),
    "연희": ("special", "(구)사황", "magic", 30),
    
    # 다크나이츠
    "멜키르": ("special", "다크나이츠", "magic", 30),
    "멜키르(각성)": ("special", "다크나이츠", "magic", 30),
    "콜트": ("special", "다크나이츠", "offensive", 30),
    "플라톤": ("special", "다크나이츠", "universal", 30),
    "브란즈·브란셀": ("special", "다크나이츠", "offensive", 30),
    "실베스타": ("special", "다크나이츠", "universal", 30),
    "실베스타(각성)": ("special", "다크나이츠", "universal", 30),
    
    # 나이트크로우
    "오르카": ("special", "나이트크로우", "universal", 30),
    "오르카(각성)": ("special", "나이트크로우", "universal", 30),
    "타카": ("special", "나이트크로우", "offensive", 30),
    "아킬라": ("special", "나이트크로우", "defensive", 30),
    
    # 루미너스 혁명단
    "엘리시아": ("special", "루미너스 혁명단", "universal", 20),
    "키리엘": ("special", "루미너스 혁명단", "magic", 20),
    "라이언": ("special", "루미너스 혁명단", "offensive", 20),
    
    # 천상의 수호자
    "라드그리드": ("special", "천상의 수호자", "universal", 31),
    "란드그리드": ("special", "천상의 수호자", "offensive", 31),
    "레긴레이프": ("special", "천상의 수호자", "magic", 31),
    "스쿨드": ("special", "천상의 수호자", "magic", 31),
    "스쿨드(각성)": ("special", "천상의 수호자", "magic", 31),
    
    # 펜타곤
    "클레미스": ("special", "펜타곤", "support", 30),
    "클레미스(각성)": ("special", "펜타곤", "support", 30),
    "아리스": ("special", "펜타곤", "universal", 30),
    "아리스(각성)": ("special", "펜타곤", "universal", 30),
    
    # 에반 원정대
    "에반": ("normal", "에반 원정대", "defensive", 17),
    "카린": ("normal", "에반 원정대", "support", 16),
    "스니퍼": ("normal", "에반 원정대", "offensive", 17),
    "아리엘": ("normal", "에반 원정대", "magic", 17),
    "쥬피": ("normal", "에반 원정대", "offensive", 18),
    "소이": ("normal", "에반 원정대", "universal", 18),
    "풍연": ("normal", "에반 원정대", "magic", 19),
    
    # 아스드 대륙
    "유리": ("asgard", "신비의 숲", "magic", 16),
    "리": ("asgard", "신비의 숲", "universal", 16),
    "헤븐니아": ("asgard", "신비의 숲", "offensive", 17),
    "헬레니아": ("asgard", "신비의 숲", "defensive", 17),
    "라니아": ("asgard", "신비의 숲", "magic", 16),
    "레오": ("asgard", "신비의 숲", "universal", 16),
    
    "녹스": ("asgard", "침묵의 광산", "universal", 18),
    "녹스(각성)": ("asgard", "침묵의 광산", "universal", 18),
    "룩": ("asgard", "침묵의 광산", "defensive", 18),
    "챈슬러": ("asgard", "침묵의 광산", "universal", 18),
    
    "레이": ("asgard", "화염의 사막", "offensive", 18),
    "클로에": ("asgard", "화염의 사막", "support", 18),
    "라쿤": ("asgard", "화염의 사막", "universal", 16),
    
    "세인": ("asgard", "암흑의 무덤", "offensive", 19),
    "사라": ("asgard", "암흑의 무덤", "support", 16),
    
    "벨리카": ("asgard", "용의 유적지", "magic", 19),
    "조커": ("asgard", "용의 유적지", "universal", 17),
    "루리": ("asgard", "용의 유적지", "offensive", 19),
    
    # 아이사 대륙
    "데이지": ("aisha", "달빛의 섬", "magic", 18),
    "백각": ("aisha", "달빛의 섬", "universal", 18),
    "루시": ("aisha", "달빛의 섬", "support", 18),
    "링링": ("aisha", "달빛의 섬", "universal", 18),
    "메이": ("aisha", "달빛의 섬", "universal", 18),
    
    "리나": ("aisha", "천자의 땅", "support", 19),
    "소교": ("aisha", "천자의 땅", "magic", 18),
    "제갈량": ("aisha", "천자의 땅", "magic", 18),
    "조운": ("aisha", "천자의 땅", "universal", 18),
    "관우": ("aisha", "천자의 땅", "defensive", 18),
    "나타": ("aisha", "천자의 땅", "universal", 18),
    "노호": ("aisha", "천자의 땅", "magic", 18),
    
    # 기타 영웅
    "동영": ("normal", "일반 영웅", "universal", 18),
    "동영(각성)": ("normal", "일반 영웅", "universal", 18),
    "선란": ("normal", "일반 영웅", "universal", 18),
    "선란(각성)": ("normal", "일반 영웅", "universal", 18),
}

# Faction Mapping
def get_faction_and_category(faction_text, hero_name):
    # Special Heroes
    if "세븐나이츠" in faction_text:
        if "구 세븐나이츠" in faction_text or "(구)세븐나이츠" in faction_text or "구세븐나이츠" in faction_text:
            return "special", "(구)세븐나이츠"
        return "special", "세븐나이츠"
    elif "다크나이츠" in faction_text:
        return "special", "다크나이츠"
    elif "사황" in faction_text:
        if "구 사황" in faction_text or "(구)사황" in faction_text or "구사황" in faction_text:
            return "special", "(구)사황"
        return "special", "사황"
    elif "나이트 크로우" in faction_text or "나이트크로우" in faction_text:
        return "special", "나이트크로우"
    elif "루미너스 혁명단" in faction_text or "혁명단" in faction_text:
        return "special", "루미너스 혁명단"
    elif "천상의 수호자" in faction_text:
        return "special", "천상의 수호자"
    elif "펜타곤" in faction_text:
        return "special", "펜타곤"
        
    # Asgard Continent
    if "신비의 숲" in faction_text:
        return "asgard", "신비의 숲"
    elif "침묵의 광산" in faction_text:
        return "asgard", "침묵의 광산"
    elif "화염의 사막" in faction_text:
        return "asgard", "화염의 사막"
    elif "암흑의 무덤" in faction_text:
        return "asgard", "암흑의 무덤"
    elif "용의 유적지" in faction_text:
        return "asgard", "용의 유적지"
        
    # Aisha Continent
    if "달빛의 섬" in faction_text:
        return "aisha", "달빛의 섬"
    elif "천자의 땅" in faction_text:
        return "aisha", "천자의 땅"
        
    # Others
    if "성진우" in hero_name or "콜라보" in faction_text:
        return "other", "콜라보레이션"
        
    if "에반 원정대" in faction_text:
        return "normal", "에반 원정대"
        
    return "normal", "일반 영웅"

def clean_description(desc):
    desc = re.sub(r'\[편집\]|\[펼치기\s*·\s*접기\]', '', desc).strip()
    return desc

def find_small_portrait(soup, hero_name):
    # Search all tables for navigation table containing the character grid
    for table in soup.find_all("table"):
        table_text = table.text
        if hero_name in table_text:
            links = table.find_all("a")
            if len(links) > 3:
                for a in links:
                    a_text = a.text.strip().replace(" 각성", "").replace("(각성)", "")
                    if a_text == hero_name:
                        imgs = a.find_all("img")
                        for img in imgs:
                            src = img.get('src') or img.get('data-src') or ''
                            if src and not src.startswith('data:') and not 'espejo' in src:
                                return src
    return None

def parse_hero_page(page, url, hero_id, is_awakened_target=False):
    try:
        page.goto(url)
        page.wait_for_timeout(3000)
        
        # Scroll to load lazy images
        for i in range(5):
            page.evaluate(f"window.scrollTo(0, {i * 600})")
            page.wait_for_timeout(300)
            
        html = page.content()
        soup = BeautifulSoup(html, 'html.parser')
        
        # 1. Base Info from first Infobox table
        infobox = soup.select_one('table')
        if not infobox:
            print(f"  [오류] 테이블을 찾을 수 없음: {url}")
            return None
            
        text_all = infobox.text
        
        # Check if it's a valid hero table (should contain '클래스' or '소속' or '기본 속공')
        if not any(k in text_all for k in ["소속", "클래스", "속공"]):
            # Try next table if the first is just navigation
            tables = soup.find_all('table')
            for t in tables[1:4]:
                if any(k in t.text for k in ["소속", "클래스", "속공"]):
                    infobox = t
                    text_all = t.text
                    break
            else:
                print(f"  [패스] 영웅 정보 테이블 없음: {url}")
                return None
        

        # Find values inside infobox
        hero_name = "미정"
        title_val = ""
        faction_val = ""
        class_val = ""
        speed_val = None
        
        # Parse fields by matching strings in cells
        rows = infobox.find_all('tr')
        
        # Extract title and name from infobox rows with space separators
        full_title_text = ""
        for r in rows:
            r_text = r.get_text(separator=' ').strip()
            if "상세정보" in r_text or "상세 정보" in r_text:
                full_title_text = r_text.replace("[ 상세정보 ]", "").replace("[상세 정보]", "").replace("[상세정보]", "").strip()
                break
        else:
            full_title_text = rows[0].get_text(separator=' ').strip()
            if "리버스" in full_title_text:
                full_title_text = full_title_text.split("리버스")[-1].strip()
                
        # Clean double spaces
        full_title_text = re.sub(r'\s+', ' ', full_title_text)
        parts = [p.strip() for p in full_title_text.split() if p.strip()]
        
        if len(parts) >= 2:
            hero_name = parts[-1]
            title_val = " ".join(parts[:-1])
        elif len(parts) == 1:
            hero_name = parts[0]
            title_val = "신규 영웅"
        else:
            hero_name = "미정"
            title_val = "신규 영웅"
            
        # Clean title_val and hero_name
        hero_name = hero_name.replace(" 각성", "").replace("(각성)", "").replace(" 각성스킬", "").split("[")[0].strip()
        
        # Parse fields inside table rows
        for row in rows:
            row_text = row.text
            if "소속" in row_text:
                tds = row.find_all('td')
                if len(tds) > 1:
                    faction_val = tds[1].text.strip()
            elif "클래스" in row_text or "형" in row_text:
                # Find which class (만능형, 공격형, 방어형, 마법형, 지원형)
                if "만능형" in row_text: class_val = "universal"
                elif "공격형" in row_text: class_val = "offensive"
                elif "방어형" in row_text: class_val = "defensive"
                elif "마법형" in row_text: class_val = "magic"
                elif "지원형" in row_text: class_val = "support"
            elif "속공" in row_text:
                speed_match = re.search(r'속공\s*:\s*(\d+)|(\d+)\s*$', row_text)
                if speed_match:
                    speed_val = int(speed_match.group(1) or speed_match.group(2))
                    
        # If missing, fetch from base infobox!
        if (not faction_val or not class_val or speed_val is None) and ("/각성" in url or is_awakened_target):
            base_url = url.split("/각성")[0]
            print(f"  [정보 보완] 각성 페이지 속성 결여 -> 기본 페이지 파싱 시도: {base_url}")
            try:
                base_page = page.context.new_page()
                base_page.goto(base_url)
                base_page.wait_for_timeout(2500)
                base_html = base_page.content()
                base_soup = BeautifulSoup(base_html, 'html.parser')
                base_infobox = None
                for t in base_soup.find_all('table')[:5]:
                    if any(k in t.text for k in ["소속", "클래스", "속공"]):
                        base_infobox = t
                        break
                if base_infobox:
                    for r in base_infobox.find_all('tr'):
                        r_text = r.text
                        if not faction_val and "소속" in r_text:
                            tds = r.find_all('td')
                            if len(tds) > 1:
                                faction_val = tds[1].text.strip()
                        if not class_val and ("클래스" in r_text or "형" in r_text):
                            if "만능형" in r_text: class_val = "universal"
                            elif "공격형" in r_text: class_val = "offensive"
                            elif "방어형" in r_text: class_val = "defensive"
                            elif "마법형" in r_text: class_val = "magic"
                            elif "지원형" in r_text: class_val = "support"
                        if speed_val is None and "속공" in r_text:
                            speed_match = re.search(r'속공\s*:\s*(\d+)|(\d+)\s*$', r_text)
                            if speed_match:
                                speed_val = int(speed_match.group(1) or speed_match.group(2))
                base_page.close()
            except Exception as ex:
                print(f"  [정보 보완 실패] {base_url} 로드 실패: {ex}")
                
        # Is Awakened?
        is_awakened = is_awakened_target or "각성" in url or "각성" in hero_name
        if is_awakened and not hero_name.endswith("(각성)"):
            hero_name = f"{hero_name}(각성)"
            
        # Check static mapping dictionary first to bypass scraping issues
        clean_name_key = hero_name.strip()
        # Fallback to key without (각성) if not found with (각성)
        if clean_name_key not in HERO_MAPPING and is_awakened:
            clean_name_key_base = hero_name.replace("(각성)", "").strip()
            if clean_name_key_base in HERO_MAPPING:
                static_cat, static_fac, static_cls, static_spd = HERO_MAPPING[clean_name_key_base]
                category_val, faction_normalized, class_val, speed_val = static_cat, static_fac, static_cls, static_spd
            else:
                category_val, faction_normalized, class_val, speed_val = None, None, None, None
        elif clean_name_key in HERO_MAPPING:
            category_val, faction_normalized, class_val, speed_val = HERO_MAPPING[clean_name_key]
        else:
            category_val, faction_normalized, class_val, speed_val = None, None, None, None
            
        # Fallback to parsed values if not in static mapping
        if not category_val or not faction_normalized:
            if not faction_val: faction_val = "일반 영웅"
            category_val, faction_normalized = get_faction_and_category(faction_val, hero_name)
            
        if not class_val:
            class_val = "universal"
        if speed_val is None:
            speed_val = 30
            
        print(f"  [파싱] 영웅: {hero_name} | 분류: {category_val}/{faction_normalized} | 속공: {speed_val} | 클래스: {class_val} | 각성: {is_awakened}")
        
        # Parse portrait (first try to find the small face portrait in navigation tables)
        base_name_only = hero_name.replace("(각성)", "").strip()
        portrait_url = find_small_portrait(soup, base_name_only)
        
        # Fallback to infobox main illustration if not found
        if not portrait_url:
            for img in infobox.select('img'):
                src = img.get('src', '') or img.get('data-src', '')
                if src and not src.startswith('data:') and not 'espejo' in src:
                    if 'namu.wiki' in src or 'namu.la' in src or 'attachment' in src:
                        portrait_url = src
                        break
                        
        # Save images paths (Korean structured paths)
        safe_faction = faction_normalized.replace("/", "_")
        safe_hero_name = hero_name.replace("/", "_")
        
        portrait_filename = f"{safe_hero_name}_초상화.png"
        portrait_save_path = Path("public/images") / safe_faction / safe_hero_name / portrait_filename
        if portrait_url:
            download_image(portrait_url, portrait_save_path)
            portrait_path = f"/images/{safe_faction}/{safe_hero_name}/{portrait_filename}"
        else:
            portrait_path = ""
            
        # 2. Extract Skills using STRUCTURAL SECTION DETECTION
        # Namuwiki uses actual skill names as headings (e.g. "4.1.2. 패왕의 기억")
        # NOT generic labels like "스킬 1". So we find the parent "스킬" section,
        # collect all sub-headings, and classify by content or position.
        elements = soup.find_all(['h2', 'h3', 'h4', 'h5', 'table'])
        skills_list = []
        
        # Phase 1: Find parent "스킬" section heading
        skill_section_idx = None
        skill_section_level = None
        for idx, elem in enumerate(elements):
            if elem.name in ['h2', 'h3']:
                h_text = elem.text.strip()
                if '스킬' in h_text and '각성' not in h_text and '강화' not in h_text and '초월' not in h_text:
                    skill_section_idx = idx
                    skill_section_level = elem.name
                    break
        
        if skill_section_idx is not None:
            # Phase 2: Collect all sub-headings (h4/h5) under the skill section
            skill_sub_headings = []
            for idx in range(skill_section_idx + 1, len(elements)):
                elem = elements[idx]
                # Stop at next same-level or higher heading (end of skill section)
                if elem.name in ['h2', 'h3']:
                    break
                if elem.name in ['h4', 'h5']:
                    skill_sub_headings.append((idx, elem))
            
            # Phase 3: Classify each sub-heading and extract skill data
            active_skill_counter = 0
            for sh_pos, (elem_idx, heading) in enumerate(skill_sub_headings):
                h_text = heading.text.strip()
                
                # Remove section numbering prefix (e.g. "4.1.1. " or "4.1.4. ")
                clean_h_text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', h_text)
                clean_h_text = clean_h_text.replace('[편집]', '').strip()
                
                # Classify by content keywords
                if '기본 공격' in h_text:
                    skill_type = 'basic_attack'
                    direction = ''
                    skill_name_from_heading = '기본 공격'
                elif '고유 지속 효과' in h_text or '지속 효과' in h_text:
                    skill_type = 'passive'
                    direction = ''
                    # Extract passive name: "고유 지속 효과 - 얼음 여왕의 가호" → "얼음 여왕의 가호"
                    if ' - ' in clean_h_text:
                        skill_name_from_heading = clean_h_text.split(' - ', 1)[1].strip()
                    else:
                        skill_name_from_heading = clean_h_text
                elif '패시브' in h_text:
                    skill_type = 'passive'
                    direction = ''
                    if ' - ' in clean_h_text:
                        skill_name_from_heading = clean_h_text.split(' - ', 1)[1].strip()
                    else:
                        skill_name_from_heading = clean_h_text
                elif '각성' in h_text:
                    skill_type = 'awaken_skill'
                    direction = ''
                    if ' - ' in clean_h_text:
                        skill_name_from_heading = clean_h_text.split(' - ', 1)[1].strip()
                    else:
                        skill_name_from_heading = clean_h_text
                else:
                    # Active skill - determine direction by order (1st = upper, 2nd = down)
                    active_skill_counter += 1
                    skill_type = 'active'
                    direction = 'upper' if active_skill_counter == 1 else 'down'
                    skill_name_from_heading = clean_h_text
                
                # Find following tables until next heading
                following_tables = []
                for next_idx in range(elem_idx + 1, len(elements)):
                    next_elem = elements[next_idx]
                    if next_elem.name in ['h2', 'h3', 'h4', 'h5']:
                        break
                    if next_elem.name == 'table':
                        following_tables.append(next_elem)
                
                # Find the real skill details table (has a skill icon image, not a voice/animation table)
                details_table = None
                for t in following_tables:
                    has_skill_icon = False
                    for img in t.find_all('img'):
                        src = img.get('src', '')
                        if src and not src.startswith('data:') and not src.endswith('.gif') and not src.endswith('.mp4'):
                            if 'namu.wiki' in src or 'namu.la' in src:
                                has_skill_icon = True
                                break
                    t_text = t.text.strip()
                    if has_skill_icon and len(t_text) > 30:
                        details_table = t
                        break
                
                # Fallback: any table with skill keywords
                if not details_table:
                    for t in following_tables:
                        t_text = t.text.strip()
                        if len(t_text) > 50 and any(k in t_text for k in ["쿨타임", "지속", "피해", "확률", "아군", "적군", "자신", "공격력", "방어력", "생명력"]):
                            details_table = t
                            break
                
                if not details_table:
                    # Still add the skill with heading name but no details
                    skills_list.append({
                        "id": f"{hero_id}_{skill_type}" + (f"_{direction}" if direction else ""),
                        "name": skill_name_from_heading,
                        "type": skill_type,
                        "direction": direction,
                        "cooldown": 0,
                        "description": "",
                        "iconUrl": ""
                    })
                    continue
                
                rows = details_table.find_all('tr')
                if not rows:
                    continue
                
                # Extract skill name from table first row (official name with icon)
                skill_name = skill_name_from_heading  # Default from heading
                first_row_tds = rows[0].find_all('td')
                if len(first_row_tds) >= 2:
                    # The second td usually has the skill name in <strong> or plain text
                    name_td = first_row_tds[1]
                    strong = name_td.find('strong')
                    if strong:
                        table_skill_name = strong.text.strip().split('\n')[0].strip()
                    else:
                        table_skill_name = name_td.text.strip().split('\n')[0].strip()
                    table_skill_name = re.sub(r'\[쿨타임\].*', '', table_skill_name).strip()
                    table_skill_name = re.sub(r'\[편집\].*', '', table_skill_name).strip()
                    if table_skill_name and table_skill_name != "스킬":
                        skill_name = table_skill_name
                elif len(first_row_tds) == 1:
                    raw = first_row_tds[0].text.strip().split('\n')[0]
                    raw = re.sub(r'\[쿨타임\].*', '', raw).strip()
                    raw = re.sub(r'\[편집\].*', '', raw).strip()
                    if raw and raw != "스킬":
                        skill_name = raw
                
                # Override display name for basic attack
                if skill_type == 'basic_attack':
                    skill_name = '기본 공격'
                
                # Extract cooldown
                cooldown = 0
                cd_match = re.search(r'쿨타임\s*\]?\s*:?\s*(\d+)', details_table.text)
                if cd_match:
                    cooldown = int(cd_match.group(1))
                
                # Extract skill icon
                icon_url = ""
                for img in details_table.find_all('img'):
                    src = img.get('src', '')
                    if src and not src.startswith('data:') and not src.endswith('.gif') and not src.endswith('.mp4'):
                        if 'namu.wiki' in src or 'namu.la' in src or 'attachment' in src:
                            icon_url = src
                            break
                
                # Extract description from rows after the first
                desc_lines = []
                for row in rows[1:]:
                    row_text = row.text.strip()
                    if not row_text:
                        continue
                    # Skip voice line rows
                    if any(skip in row_text for skip in ["버텨봐라", "떠오르는군", "펼치기", "접기", "「", "」"]):
                        continue
                    row_text = clean_description(row_text)
                    if row_text:
                        desc_lines.append(row_text)
                
                description = "\n".join(desc_lines)
                
                # Download skill icon
                skill_safe_name = re.sub(r'[\\/*?:"<>|]', "", skill_name).strip()
                icon_filename = f"{skill_safe_name}_아이콘.png"
                icon_save_path = Path("public/images") / safe_faction / safe_hero_name / "skills" / icon_filename
                
                icon_path = ""
                if icon_url:
                    if download_image(icon_url, icon_save_path):
                        icon_path = f"/images/{safe_faction}/{safe_hero_name}/skills/{icon_filename}"
                
                # Generate unique skill ID
                skill_id = f"{hero_id}_{skill_type}"
                if direction:
                    skill_id += f"_{direction}"
                
                skills_list.append({
                    "id": skill_id,
                    "name": skill_name,
                    "type": skill_type,
                    "direction": direction,
                    "cooldown": cooldown,
                    "description": description,
                    "iconUrl": icon_path
                })
                
        return {
            "id": hero_id,
            "name": hero_name,
            "title": title_val or "신규 영웅",
            "group": faction_normalized,
            "category": category_val,
            "type": class_val,
            "baseSpeed": speed_val,
            "portraitUrl": portrait_path,
            "isAwakened": is_awakened,
            "skills": skills_list
        }
    except Exception as e:
        print(f"  [오류] 영웅 페이지 파싱 실패 ({url}): {e}")
        return None

def main():
    print("=== 세븐나이츠 리버스 영웅 도감 벌크 스크래퍼 기동 ===")
    
    # Heroes requested for Awakening state
    awakened_targets = {
        "루디": "rudi", 
        "스쿨드": "sculd", 
        "아리스": "aris", 
        "오르카": "orca", 
        "클레미스": "clemiss", 
        "델론즈": "dellons", 
        "녹스": "knox", 
        "동영": "dongyeong", 
        "선란": "seonran", 
        "실베스타": "silvester"
    }
    
    with sync_playwright() as p:
        # headless=False to bypass cloudflare easily
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        
        category_url = "https://namu.wiki/w/%EB%B6%84%EB%A5%98:%EC%84%B8%EB%B8%90%EB%82%98%EC%9D%B4%EC%B8%A0%20%EB%A6%AC%EB%B2%84%EC%8A%A4/%EC%98%81%EC%9B%85"
        print(f"카테고리 목록 페이지 접속: {category_url}")
        page.goto(category_url)
        page.wait_for_timeout(5000)
        
        html = page.content()
        soup = BeautifulSoup(html, 'html.parser')
        
        # Find all hero page links
        hero_links = []
        for a in soup.find_all('a'):
            href = a.get('href', '')
            text = a.text.strip()
            
            # URL 디코딩을 먼저 진행하여 한글 비교가 가능하도록 수정
            decoded_href = urllib.parse.unquote(href)
            
            # Filter links in the category list
            # Usually links look like /w/이름(세븐나이츠%20리버스)
            if decoded_href.startswith('/w/') and ('세븐나이츠' in decoded_href or '리버스' in decoded_href) and len(text) > 1:
                # Exclude categories or non-hero pages
                if any(x in decoded_href for x in ['분류:', '틀:', '파일:', '나무위키:', '도감', '등장인물', '콘텐츠']):
                    continue
                
                hero_links.append((text, "https://namu.wiki" + href, decoded_href))
                
        # Filter duplicates and select awakened states if requested
        crawled_list = []
        seen_base_names = set()
        
        # Sort links to prioritize awakened versions
        # Let's map target pages first
        target_urls = []
        
        # Build exact crawling list
        for text, url, decoded in hero_links:
            # Clean base name (remove (세븐나이츠 리버스), /각성 등)
            base_name = re.sub(r'\(세븐나이츠\s*리버스\)|/각성', '', text).strip()
            
            # If the base name is in the user's requested awakened list
            if base_name in awakened_targets:
                hero_id = awakened_targets[base_name]
                # We only want to crawl the Awakened version
                if "각성" in text:
                    target_urls.append((hero_id, url, True))
                    seen_base_names.add(base_name)
            else:
                # For other heroes, normalize name and add
                # Convert Korean name to a clean alphabet id
                # Simple translation or mapping, or we just use phonetic IDs or index-based IDs
                # To make it clean, we can generate a safe ASCII id
                ascii_id = re.sub(r'[^a-zA-Z0-9]', '', urllib.parse.quote(base_name)).lower()[:15]
                # If it's a zone/continent page, filter it
                if base_name in ["달빛의 섬", "신비의 숲", "용의 유적지", "눈보라의 대지", "침묵의 광산", "화염의 사막", "암흑의 무덤", "천자의 땅"]:
                    continue
                
                # We skip base_name if we already have it to avoid duplicates
                if base_name not in seen_base_names:
                    target_urls.append((ascii_id, url, False))
                    seen_base_names.add(base_name)
                    
        # Add baseline ones that weren't captured if they didn't have /각성 in links
        # (e.g. if the category list only had "루디" but we want "루디/각성", we manually adjust the URL)
        for base_k, hero_id in awakened_targets.items():
            if base_k not in seen_base_names:
                # Add it manually
                enc_name = urllib.parse.quote(f"{base_k}(세븐나이츠 리버스)/각성")
                url = f"https://namu.wiki/w/{enc_name}"
                target_urls.append((hero_id, url, True))
                seen_base_names.add(base_k)
        
        # Let's add 겔리두스 manually to ensure it's updated as well
        if "겔리두스" not in seen_base_names:
            target_urls.append(("gelidus", "https://namu.wiki/w/%EA%B2%94%EB%A6%AC%EB%91%90%EC%8A%A4(%EC%84%B8%EB%B8%90%EB%82%98%EC%9D%B4%EC%B8%A0%20%EB%A6%AC%EB%B2%84%EC%8A%A4)", False))
            
        print(f"\n총 {len(target_urls)}개의 영웅 수집 대상 도출 완료.")
        print("순차 크롤링을 시작합니다. (배치 크롤러 시작)")
        
        final_heroes = []
        for idx, (hero_id, url, is_awakened) in enumerate(target_urls):
            print(f"\n[{idx+1}/{len(target_urls)}] 영웅 ID: {hero_id} 크롤링...")
            data = parse_hero_page(page, url, hero_id, is_awakened)
            if data:
                final_heroes.append(data)
                
        # Write to JSON file
        save_file = Path("src/data/scraped_heroes.json")
        os.makedirs(save_file.parent, exist_ok=True)
        with open(save_file, "w", encoding="utf-8") as f:
            json.dump(final_heroes, f, ensure_ascii=False, indent=2)
            
        # Generate the main heroes.js importing this json
        # (We will merge the scraped data with the main static list)
        print(f"\n[성공] 크롤러 완료! 총 {len(final_heroes)}명 데이터가 {save_file} 에 저장되었습니다.")
        browser.close()

if __name__ == "__main__":
    main()
