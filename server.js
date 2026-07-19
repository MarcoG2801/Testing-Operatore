const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint principale
app.get("/", (req, res) => {
    res.send("Playwright Service Online");
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        time: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    let browser;

    try {
        console.log("---------------------------------------");
        console.log(new Date().toISOString());
        console.log("Avvio browser...");

        browser = await chromium.launch({
            headless: true
        });

        const page = await browser.newPage();

        await page.goto("https://example.com", {
            waitUntil: "networkidle",
            timeout: 30000
        });

        const title = await page.title();

        console.log("Titolo:", title);

        console.log("Test completato.");

        console.log("Reindirizzamento a https://testing-operatore.onrender.com...");
        await page.goto("https://testing-operatore.onrender.com", {
            waitUntil: "networkidle",
            timeout: 30000
        });
    } catch (err) {
        console.error("Errore:", err);
    } finally {
        if (browser) {
            await browser.close();
            console.log("Browser chiuso.");
        }
    }
}

(async () => {

    console.log("Loop Playwright avviato.");

    while (true) {

        await runTest();

        console.log("Attendo 10 secondi...");
        await sleep(10000);

    }

})();