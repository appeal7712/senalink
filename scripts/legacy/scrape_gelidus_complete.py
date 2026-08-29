import os
import re
import json
import urllib.request
import ssl
from pathlib import Path
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

def download_image(url, save_path):
    try:
        if url.startswith("//"):
            url = "https:" + url
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        ssl_context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, context=ssl_context) as response, open(save_path, 'wb') as out_file:
            out_file.write(response.read())
        print(f"[다운로드 완료] {save_path.name} (크기: {os.path.getsize(save_path)} bytes)")
    except Exception as e:
        print(f"[오류] 이미지 다운로드 실패 ({url}): {e}")

def main():
    print("크롬 창을 띄워 겔리두스 페이지를 로드하고 스크롤을 내립니다...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        
        url = "https://namu.wiki/w/%EA%B2%94%EB%A6%AC%EB%91%90%EC%8A%A4(%EC%84%B8%EB%B8%90%EB%82%98%EC%9D%B4%EC%B8%A0%20%EB%A6%AC%EB%B2%84%EC%8A%A4)"
        page.goto(url)
        
        page.wait_for_timeout(3000)
        
        print("이미지 활성화 스크롤 진행 중...")
        for i in range(8):
            page.evaluate(f"window.scrollTo(0, {i * 800})")
            page.wait_for_timeout(600)
            
        html = page.content()
        soup = BeautifulSoup(html, 'html.parser')
        
        images_dir = Path("public/images/(구)세븐나이츠/겔리두스")
        skills_dir = images_dir / "skills"
        os.makedirs(skills_dir, exist_ok=True)
        
        # 1. 영웅 초상화 다운로드
        portrait_url = ""
        infobox = soup.select_one('table')
        if infobox:
            for img in infobox.select('img'):
                src = img.get('src', '')
                if src and ('namu.wiki' in src or 'namu.la' in src or 'attachment' in src):
                    if not src.startswith('data:') and not 'espejo' in src:
                        portrait_url = src
                        break
            
            if portrait_url:
                download_image(portrait_url, images_dir / "겔리두스_초상화.png")
        
        # 2. 텍스트 매칭 기반 스킬 파싱 (기본 공격/평타 포함)
        skill_names = ["기본 공격", "패왕의 기억", "창공의 패왕", "얼음 여왕의 가호"]
        tables = soup.find_all('table')
        skills_data = []
        
        for name in skill_names:
            matched_table = None
            for table in tables:
                text = table.text
                if name in text and len(text) < 2500:
                    matched_table = table
                    break
            
            if not matched_table:
                print(f"[경고] {name} 테이블을 찾지 못했습니다.")
                continue
            
            rows = matched_table.find_all('tr')
            if not rows:
                continue
            
            # 쿨타임 추출 (평타는 쿨타임 없음)
            cooldown = 0
            cd_match = re.search(r'쿨타임\s*\]?\s*:\s*(\d+)', matched_table.text)
            if cd_match:
                cooldown = int(cd_match.group(1))
            
            # 타입 매핑
            skill_type = "active"
            direction = ""
            if name == "기본 공격":
                skill_type = "basic_attack"
                direction = ""
            elif name == "얼음 여왕의 가호":
                skill_type = "passive"
                direction = ""
            elif name == "패왕의 기억":
                skill_type = "active"
                direction = "upper"
            elif name == "창공의 패왕":
                skill_type = "active"
                direction = "down"
            
            # 스킬 아이콘 다운로드
            icon_url = ""
            for img in matched_table.find_all('img'):
                src = img.get('src', '')
                if src and not src.startswith('data:') and not 'espejo' in src:
                    if 'namu.wiki' in src or 'namu.la' in src or 'attachment' in src:
                        if not src.endswith('.gif'):
                            icon_url = src
                            break
            
            # 설명 데이터 조립
            desc_lines = []
            for row in rows[1:]:
                row_text = row.text.strip()
                if not row_text or "버텨봐라" in row_text or "떠오르는군" in row_text or "펼치기" in row_text:
                    continue
                row_text = re.sub(r'\[편집\]|\[펼치기\s*·\s*접기\]', '', row_text).strip()
                desc_lines.append(row_text)
            
            description = "\n".join(desc_lines)
            
            # 다운로드 및 최종 경로 저장
            safe_name = re.sub(r'[\\/*?:"<>|]', "", name).strip()
            icon_path = ""
            if icon_url:
                img_name = f"{safe_name}_아이콘.png"
                download_image(icon_url, skills_dir / img_name)
                icon_path = f"/images/(구)세븐나이츠/겔리두스/skills/{img_name}"
            
            skills_data.append({
                "id": f"gelidus_{'basic' if skill_type == 'basic_attack' else ('p' if skill_type == 'passive' else ('s1' if direction == 'upper' else 's2'))}",
                "name": name,
                "type": skill_type,
                "direction": direction,
                "cooldown": cooldown,
                "description": description,
                "iconUrl": icon_path
            })
            print(f"[추출 완료] {name} | CD: {cooldown} | 아이콘 획득: {icon_path != ''}")
            
        result = {
            "id": "gelidus",
            "name": "겔리두스",
            "title": "혹한의 강자",
            "group": "(구)세븐나이츠",
            "type": "offensive",
            "baseSpeed": 32,
            "portraitUrl": "/images/(구)세븐나이츠/겔리두스/겔리두스_초상화.png" if portrait_url else "",
            "skills": skills_data
        }
        
        with open("gelidus_scraped.json", "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
            
        print("\n[완료] 겔리두스 데이터 크롤링 성공!")
        browser.close()

if __name__ == "__main__":
    main()
