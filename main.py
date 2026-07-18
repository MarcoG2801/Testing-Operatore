from playwright.sync_api import sync_playwright
import time
import traceback


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        while True:
            try:
                page = browser.new_page()

                page.goto("https://example.com")

                print(page.title())

                page.close()

                time.sleep(60)

            except Exception:
                traceback.print_exc()
                time.sleep(10)


if __name__ == "__main__":
    while True:
        try:
            run()
        except Exception:
            traceback.print_exc()
            time.sleep(30)