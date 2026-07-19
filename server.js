const express = require("express");
const { chromium } = require("playwright");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");


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
var idVeicoli = [];
var urlVeicolo = [];

const cartellaData = path.join(__dirname, "data");
const fileVeicoli = path.join(cartellaData, "vehicle_data.json");

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

        await raccogliDatiVeicoli(page);


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
            console.log(chalk.green("✔ Login riuscito"));
        }

    } catch (e) {
        console.error(chalk.red('Thread ${threadId} encountered an error:'), e);
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

async function raccogliDatiVeicoli(page) {
    try {

        await page.goto("https://www.operatore112.it/leitstellenansicht");
        await page.waitForSelector(".list-group");

        // Recupera tutti i link che puntano ai veicoli
        const collegamentiVeicoli = await page
            .locator('.list-group a[href^="/vehicles/"]')
            .all();


        // Estrae l'ID da ogni collegamento trovato
        for (const collegamento of collegamentiVeicoli) {
            urlVeicolo = await collegamento.getAttribute("href");

            // Se l'attributo href esiste, ricava l'ID del veicolo
            if (urlVeicolo) {
                idVeicolo = urlVeicolo.split("/").pop();

                // Salva l'ID nell'array
                idVeicoli.push(idVeicolo);

                console.log(`Trovato ID veicolo: ${idVeicolo}`);
            }
        }

        // Mostra quanti veicoli sono stati trovati
        console.log(`Trovati ${idVeicoli.length} ID veicoli.`);

        vehicle_data = await raccogliInfoVeicoli(idVeicoli, page);

        // Crea la cartella "data" se non esiste
        if (!fs.existsSync(cartellaData)) {
            fs.mkdirSync(cartellaData, { recursive: true });
        }

        // Crea il file se non esiste
        if (!fs.existsSync(fileVeicoli)) {
            fs.writeFileSync(fileVeicoli, JSON.stringify({}, null, 2), "utf8");
        }


        // Salva gli ID in un file JSON
        fs.writeFileSync(
            fileVeicoli,
            JSON.stringify(vehicle_data, null, 4),
            "utf8"
        );

        console.log(
            `Raccolta dati completata. File salvato in ${fileVeicoli}.`
        );

    } catch (errore) {
        console.error(
            "Errore durante la raccolta dei dati dei veicoli:",
            errore
        );
    }
}



/**
 * Legge il tipo di ogni veicolo e restituisce un oggetto del tipo:
 *
 * {
 *   "Ambulanza": [1, 5, 8],
 *   "Autopompa": [2, 3]
 * }
 */
async function raccogliInfoVeicoli(listaIdVeicoli, page) {
    const veicoliPerTipo = {};

    for (let i = 0; i < listaIdVeicoli.length; i++) {
        const idVeicolo = listaIdVeicoli[i];

        try {
            console.log(
                `Thread: Veicolo ${i + 1}/${listaIdVeicoli.length}`
            );

            // Apre la pagina del veicolo
            await page.goto(`https://www.operatore112.it/vehicles/${idVeicolo}`);

            // Legge il tipo del veicolo
            const tipoVeicolo = await page
                .locator("#vehicle-attr-type a")
                .innerText();

            // Crea l'array se non esiste
            if (!veicoliPerTipo[tipoVeicolo]) {
                veicoliPerTipo[tipoVeicolo] = [];
            }

            // Salva l'ID del veicolo
            veicoliPerTipo[tipoVeicolo].push(idVeicolo);

        } catch (errore) {
            console.error(`Errore sul veicolo ${idVeicolo}: ${errore.message}`);
        }
    }

    return veicoliPerTipo;
}