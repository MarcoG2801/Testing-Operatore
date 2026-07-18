const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Playwright è in esecuzione!");
});

app.get("/title", async (req, res) => {
    let browser;

    try {
        browser = await chromium.launch({
            headless: true
        });

        while (true) {
            const page = await browser.newPage();

            await page.goto("https://example.com");

            const title = await page.title();

            console.log(title);
        }

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});