const express = require("express");
const { chromium } = require("playwright");
const chalk = require("chalk");

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


username = "Luca_Endy89";
password = "Gemelli@2001";
controlFirstLogin = true;
var edificiLink = [];
var edificiUrl = [];

// Main
(async () => {
    console.log("Loop Playwright avviato.");

    console.log("---------------------------------------");
    console.log(new Date().toISOString());
    console.log("Avvio browser...");

    browser = await chromium.launch({
        headless: false
    });
    const page = await browser.newPage();

    
    while (true) {
        // Renderizzo la pagina per evitare che il server si spenga
        await renderWakeUp();

        if (controlFirstLogin) {
            await login(page);
            controlFirstLogin = false;
            await assunzione(page);
        }



        console.log("Attendo 5 secondi...");
        await sleep(5000);
    }
})();


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// Funzione che serve per non far spegnere il server (richiaamo il sito così non si spegne)
async function renderWakeUp() {
    let browser;

    browser = await chromium.launch({
        headless: true
    });
    const page_render = await browser.newPage();

    console.log("Reindirizzamento a https://testing-operatore.onrender.com...");
    await page_render.goto("https://testing-operatore.onrender.com", {
        waitUntil: "networkidle",
        timeout: 30000
    });
}


//Login 
async function login(page) {
    console.log('Eseguo login...');

    try {
        await page.goto("https://www.operatore112.it/users/sign_in");
        await page.waitForSelector("form#new_user");

        await page.fill('input[name="user[email]"]', username);
        await page.fill('input[name="user[password]"]', password);

        await page.click('input[type="submit"]');
        await page.waitForLoadState("networkidle");

        const errorMessage = page.locator("text=Invalid email or password");

        try {
            await errorMessage.waitFor({
                state: "visible",
                timeout: 5000
            });

            return {
                status: "Failure",
                message: 'Invalid email or password',
                browser
            };

        } catch {
            // Il messaggio non è comparso: login riuscito
            console.log('Login riuscito.');
        }

    } catch (e) {
        console.error('Thread ${threadId} encountered an error:', e);
    }
}


async function assunzione(page) {

    await page.goto("https://www.operatore112.it/leitstellenansicht");

    // Trova tutti i link degli edifici
    edificiLink = await page.locator("//a[contains(@href,'buildings')]").all();

    edificiUrl = [];

    for (const link of edificiLink) {
        const href = await link.getAttribute("href");
        if (href) {
            edificiUrl.push(href);
        }
    }

    console.log(`${edificiUrl.length} edifici trovati`);

    for (const buildingUrl of edificiUrl) {
        const buildingId = buildingUrl.split("/")[2];

        await page.goto(`https://www.operatore112.it/buildings/${buildingId}/hire`);

        const hireButton = await page.$(
            `a[href="/buildings/${buildingId}/hire_do/3"]`
        );

        if (hireButton) {
            console.log(`Assunzione avviata per l'edificio ${buildingId}.`);
            await hireButton.click();
        } else {
            console.log(`Assunzione NON avviata per l'edificio ${buildingId}.`);
        }
    }
}
