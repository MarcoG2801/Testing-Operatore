from flask import Flask
import threading
import os
from playwright.sync_api import sync_playwright

app = Flask(__name__)

@app.route("/")
def home():
    return "Bot attivo"

def bot():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        while True:
            page = browser.new_page()
            page.goto("https://example.com")
            print(page.title())
            page.close()

threading.Thread(target=bot, daemon=True).start()

app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))