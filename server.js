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
get_alliance_mission = false;

const cartellaData = path.join(__dirname, "data");
const fileVeicoli = path.join(cartellaData, "vehicle_data.json");
const fileMissioni = path.join(__dirname, "data", "mission_data.json");

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
            // await assunzione(page);
        }

        await raccogliDatiVeicoli(page);

        await controllaDatiMissioni(page);


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
    const idVeicoli = [];
    try {

        await page.goto("https://www.operatore112.it/leitstellenansicht");
        await page.waitForSelector(".list-group");

        // Recupera tutti i link che puntano ai veicoli
        const collegamentiVeicoli = await page
            .locator('.list-group a[href^="/vehicles/"]')
            .all();


        // Estrae l'ID da ogni collegamento trovato
        for (const collegamento of collegamentiVeicoli) {
            const urlVeicolo = await collegamento.getAttribute("href");

            // Se l'attributo href esiste, ricava l'ID del veicolo
            if (urlVeicolo) {
                const idVeicolo = urlVeicolo.split("/").pop();

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


async function controllaDatiMissioni(page) {
    try {
        if (fs.existsSync("data/mission_data.json")) {
            fs.unlinkSync("data/mission_data.json");
        }

        await page.goto("https://www.operatore112.it");

        let pannelliMissione;

        if (get_alliance_mission === true) {
            pannelliMissione = await page.$$(".mission_panel_red");
        } else {
            pannelliMissione = await page.$$("#mission_list .mission_panel_red");
        }

        if (pannelliMissione.length === 0) {
            console.log("Nessuna missione trovata");
            return;
        }

        const idMissioni = [];

        for (const pannello of pannelliMissione) {
            const id = await pannello.getAttribute("id");
            idMissioni.push(id.split("_").pop());
        }

        console.log(`Trovate ${idMissioni.length} missioni`);

        const datiMissioni = await raccogliInfoMissioni(idMissioni, page);

        fs.writeFileSync(
            "data/mission_data.json",
            JSON.stringify(datiMissioni, null, 4)
        );

        console.log("Raccolta dati missioni completata.");
    } catch (err) {
        console.log("Errore raccolta dati missioni:", err);
    }
}

async function raccogliInfoMissioni(idMissioni, page) {
    const datiMissioni = {};

    for (let i = 0; i < idMissioni.length; i++) {
        const idMissione = idMissioni[i];

        try {
            console.log(`Missione ${i + 1}/${idMissioni.length}`);

            await page.goto(`https://www.operatore112.it/missions/${idMissione}`);
            await page.waitForSelector("#missionH1", { timeout: 5000 });

            const gettoneEvento = await page.$("#easter-egg-link");

            if (gettoneEvento) {
                await gettoneEvento.click();
                console.log("GETTONE EVENTO OTTENUTO");
            }

            const elementoNome = await page.$("#missionH1");

            if (!elementoNome) {
                console.log(`Nome missione non trovato (${idMissione})`);
                continue;
            }

            const nomeMissione = (await elementoNome.innerText()).trim();

            const pazienti = await page.locator("//div[contains(@class,'mission_patient')]").count();

            await page.click("#mission_help");
            await page.waitForSelector("#iframe-inside-container", {
                timeout: 5000
            });

            const veicoli = await requisitiVeicoli(page);

            const creditiElemento = await page.$(
                'td:has-text("Media dei crediti") + td'
            );

            const crediti = creditiElemento
                ? parseInt((await creditiElemento.innerText()).split(" ")[0])
                : 0;

            const autoIncidentateElemento = await page.$(
                'td:has-text("Maximum amount of cars to tow") + td'
            );

            const autoIncidentate = autoIncidentateElemento
                ? parseInt((await autoIncidentateElemento.innerText()).trim())
                : 0;

            const personaleRichiesto = [];

            const elementiPersonale = await page.$$(
                'td:has-text("Required Personnel Available") + td div'
            );

            for (const elemento of elementiPersonale) {
                const testo = (await elemento.innerText()).trim();

                if (testo.includes("x")) {
                    const [quantita, nome] = testo.split("x", 2);

                    personaleRichiesto.push({
                        name: nome.trim(),
                        count: parseInt(quantita.trim())
                    });
                }
            }

            if (pazienti > 0) {
                veicoli.push({
                    name: "Ambulanza",
                    count: pazienti
                });
            }

            if (pazienti >= 10) {
                veicoli.push({
                    name: "EMS Chief",
                    count: 1
                });
            }

            if (pazienti >= 20) {
                veicoli.push({
                    name: "EMS Mobile Command Unit",
                    count: 1
                });
            }

            datiMissioni[idMissione] = {
                mission_name: nomeMissione,
                credits: crediti,
                vehicles: veicoli,
                patients: pazienti,
                crashed_cars: autoIncidentate,
                required_personnel: personaleRichiesto
            };

        } catch (err) {
            console.log(`Errore missione ${idMissione}:`, err);
        }
    }

    return datiMissioni;
}

async function requisitiVeicoli(page) {
    const requisiti = [];

    const tabella = await page.$(
        'div.col-md-4 > table:has(th:has-text("Requisiti del veicolo e del personale"))'
    );

    if (!tabella) return requisiti;

    const righe = await tabella.$$(
        'tr:has(td:has-text("richieste")), \
         tr:has(td:has-text("richiesto")), \
         tr:has(td:has-text("richiesta")), \
         tr:has(td:has-text("necessarie")), \
         tr:has(td:has-text("Richiesto"))'
    );

    for (const riga of righe) {
        const nomeElemento = await riga.$("td:first-child");
        const numeroElemento = await riga.$("td:nth-child(2)");

        if (!nomeElemento || !numeroElemento) continue;

        let nomeVeicolo = (await nomeElemento.textContent())
            .replace("richieste", "")
            .replace("richiesto", "")
            .replace("Richiesta", "")
            .replace("Richiesto", "")
            .replace("necessarie", "")
            .trim();

        nomeVeicolo = rimuoviPlurale(nomeVeicolo);

        if (nomeVeicolo.includes("Probability")) continue;

        requisiti.push({
            name: nomeVeicolo,
            count: parseInt(await numeroElemento.textContent())
        });
    }

    return requisiti;
}

async function veicoliGiaPresenti(page, nomeVeicolo) {
    let totale = 0;

    try {
        const href = await page.locator(
            "table#mission_vehicle_at_mission td:nth-child(2) a"
        ).evaluateAll(elements =>
            elements.map(e => e.href)
        );

        const datiVeicoli = JSON.parse(
            fs.readFileSync("data/vehicle_data.json", "utf8")
        );

        for (const link of href) {
            const idVeicolo = link.split("/")[4];

            for (const categoria in datiVeicoli) {
                if (datiVeicoli[categoria].includes(idVeicolo)) {

                    const opzioni = get_vehicle_options(nomeVeicolo);

                    if (categoria === opzioni[0]) {
                        totale++;
                    }
                }
            }
        }

    } catch (err) {
        console.log("Errore controllo veicoli presenti:", err);
    }

    return totale;
}

function rimuoviPlurale(nomeVeicolo) {
    const parti = nomeVeicolo.split(" ");

    const ultima = parti[parti.length - 1];

    if (ultima.endsWith("s")) {
        parti[parti.length - 1] = ultima.slice(0, -1);
    }

    return parti.join(" ");
}