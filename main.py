import os
from fastapi import FastAPI
from playwright.async_api import async_playwright

app = FastAPI()

@app.get("/")
async def run_scraper():
    async with async_playwright() as p:
        # Avvia il browser in modalità headless
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Sostituisci con il sito che vuoi testare
        await page.goto("https://example.com")
        title = await page.title()
        
        await browser.close()
        
        return {
            "status": "success",
            "extracted_title": title
        }

if __name__ == "__main__":
    import uvicorn
    # Render assegna automaticamente una porta tramite la variabile d'ambiente PORT
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)