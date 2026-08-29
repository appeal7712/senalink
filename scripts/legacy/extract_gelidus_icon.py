from bs4 import BeautifulSoup
import re

with open("gelidus_success.html", "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f, "html.parser")

# Find navigation table
nav_table = None
for table in soup.find_all("table"):
    if "파이" in table.text and "로지" in table.text and "겔리두스" in table.text:
        nav_table = table
        break

if nav_table:
    # Let's inspect the children of nav_table
    # Namuwiki cards are often built as nested tables or list items.
    # Let's find all 'a' tags or elements that have a text containing '겔리두스'
    # And look for the image inside their siblings or ancestors
    for idx, a in enumerate(nav_table.find_all("a")):
        if "겔리두스" in a.text:
            print(f"Found <a> with '겔리두스': text='{a.text.strip()}'")
            print(f"a tag HTML: {str(a)[:500]}")
            
            # Let's traverse up the DOM tree and find if there is a container holding both this <a> and an <img>
            p = a.parent
            for depth in range(1, 6):
                if p:
                    # Look for img inside this parent
                    imgs = p.find_all("img")
                    real_imgs = [img.get('src') or img.get('data-src') for img in imgs if (img.get('src') or img.get('data-src')) and not (img.get('src') or img.get('data-src')).startswith('data:')]
                    print(f"  Parent Depth {depth} ({p.name}, class={p.get('class')}): has {len(real_imgs)} images: {real_imgs}")
                    p = p.parent
