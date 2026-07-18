import asyncio
from playwright.async_api import async_playwright

async def get_page_title(url: str) -> str:
    # Usiamo async per gestirlo al meglio all'interno di un server bot
    async with async_playwright() as p:
        # Avviamo il browser in background (headless=True)
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            # Naviga all'URL desiderato
            await page.goto(url, timeout=30000)
            
            # Estrae il titolo della pagina (il tag <title>)
            title = await page.title()
            return title
            
        except Exception as e:
            return f"Errore durante l'estrazione: {e}"
            
        finally:
            # Chiudiamo sempre il browser per non sprecare RAM sul server
            await browser.close()

# Esempio di utilizzo (come lo chiameresti nel codice del tuo bot)
async def main():
    target_url = "https://www.example.com"
    nome_pagina = await get_page_title(target_url)
    
    print(f"Nome estratto da inviare al bot: {nome_pagina}")

# Esegui lo script
if __name__ == "__main__":
    asyncio.run(main())