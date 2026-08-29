import time
from playwright.sync_api import sync_playwright

def main():
    print("겔리두스 나무위키 페이지 다운로드 중...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        # URL encode "겔리두스(세븐나이츠 리버스)"
        url = "https://namu.wiki/w/%EA%B2%90%EB%A6%AC%EB%91%90%EC%8A%A4(%EC%84%B8%EB%B8%90%EB%82%98%EC%9D%B4%EC%B8%A0%20%EB%A6%AC%EB%B2%84%EC%8A%A4)"
        page.goto(url)
        
        try:
            page.wait_for_selector('.wiki-article', timeout=15000)
            time.sleep(3)
        except Exception as e:
            print("대기 시간 만료 (Timeout) - 계속 진행합니다.")
            
        with open("gelidus.html", "w", encoding="utf-8") as f:
            f.write(page.content())
            
        print("gelidus.html 저장 완료!")
        browser.close()

if __name__ == "__main__":
    main()
