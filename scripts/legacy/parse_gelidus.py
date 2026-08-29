import json
import re
from bs4 import BeautifulSoup

def clean_text(text):
    if not text:
        return ""
    # Remove wiki annotations like [편집] or [펼치기·접기]
    text = re.sub(r'\[편집\]|\[펼치기\s*·\s*접기\]', '', text)
    return text.strip()

def main():
    with open("gelidus.html", "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    # In namuwiki, content is inside tables or paragraphs.
    # Let's search for tables containing known skills
    tables = soup.find_all("table")
    print(f"총 {len(tables)}개의 테이블 발견.")
    
    gelidus_data = {
        "id": "gelidus",
        "name": "겔리두스",
        "title": "혹한의 강자",
        "group": "(구)세븐나이츠",
        "type": "offensive", # Default to offensive or universal
        "baseSpeed": 32,      # Gelidus standard speed is high, let's set 32
        "portraitUrl": "",
        "skills": []
      }

    # Standard Seven Knights Re:birth wiki format for skill is usually a table with a title
    # Let's search for cells containing "패왕의 기억", "창공의 패왕", "얼음 여왕의 가호"
    skills_found = {}
    
    for t_idx, table in enumerate(tables):
        table_text = table.text
        # Look for headers containing the skill names
        if "패왕의 기억" in table_text and len(table_text) < 2000:
            skills_found["s1"] = table
        if "창공의 패왕" in table_text and len(table_text) < 2000:
            skills_found["s2"] = table
        if "얼음 여왕의 가호" in table_text and len(table_text) < 2000:
            skills_found["passive"] = table

    # 1. Parse Skill 1 (패왕의 기억)
    if "s1" in skills_found:
        s1_table = skills_found["s1"]
        # Find cooldown
        cd_match = re.search(r'\[쿨타임\]\s*:\s*(\d+)', s1_table.text)
        cooldown = int(cd_match.group(1)) if cd_match else 75
        
        # Skill text representation - extract rows
        rows = [r.text.strip() for r in s1_table.find_all("tr")]
        desc = "\n".join(rows[2:6]) if len(rows) > 5 else s1_table.text
        
        gelidus_data["skills"].append({
            "id": "gelidus_s1",
            "name": "패왕의 기억",
            "type": "active",
            "direction": "upper",
            "cooldown": cooldown,
            "description": clean_text(desc)
        })

    # 2. Parse Skill 2 (창공의 패왕)
    if "s2" in skills_found:
        s2_table = skills_found["s2"]
        cd_match = re.search(r'\[쿨타임\]\s*:\s*(\d+)', s2_table.text)
        cooldown = int(cd_match.group(1)) if cd_match else 85
        
        rows = [r.text.strip() for r in s2_table.find_all("tr")]
        desc = "\n".join(rows[2:6]) if len(rows) > 5 else s2_table.text
        
        gelidus_data["skills"].append({
            "id": "gelidus_s2",
            "name": "창공의 패왕",
            "type": "active",
            "direction": "down",
            "cooldown": cooldown,
            "description": clean_text(desc)
        })

    # 3. Parse Passive (얼음 여왕의 가호)
    if "passive" in skills_found:
        p_table = skills_found["passive"]
        rows = [r.text.strip() for r in p_table.find_all("tr")]
        desc = "\n".join(rows[2:5]) if len(rows) > 4 else p_table.text
        
        gelidus_data["skills"].append({
            "id": "gelidus_p",
            "name": "얼음 여왕의 가호",
            "type": "passive",
            "cooldown": 0,
            "description": clean_text(desc)
        })
        
    print(json.dumps(gelidus_data, ensure_ascii=False, indent=2))
    
    # Save the parsed data to a json file
    with open("gelidus_parsed.json", "w", encoding="utf-8") as out:
        json.dump(gelidus_data, out, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
