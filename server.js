const express = require("express");
const { chromium } = require("playwright");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const https = require("https");


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


var totaleVeicoli = 0;

// Main
(async () => {
    console.log("Loop Playwright avviato.");

    console.log("---------------------------------------");
    console.log(new Date().toISOString());
    console.log("Avvio browser...");

    browser = await chromium.launch({
        headless: true
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

        if (totaleVeicoli === 0) {
            console.log("Raccolta dati veicoli...");
            await raccogliDatiVeicoli(page);
        }

        await controllaDatiMissioni(page);

        await logicaMissioni(page);

        console.log("Attendo 5 secondi...");
        await sleep(5000);
    }
})();


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// Funzione che serve per non far spegnere il server (richiaamo il sito così non si spegne)
async function renderWakeUp() {
    setInterval(() => {
        https.get("https://testing-operatore.onrender.com");
    }, 60000);
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

        totaleVeicoli = idVeicoli.length;

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


            /////dfdsfdfdfdf
            /////sdfsdfs
            //dfsfd

            logicaTrasporto(page, idMissione);

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


async function logicaTrasporto(page, idMissione) {
    console.log("Avvio logica trasporto.");

    try {
        console.log("Controllo richieste di trasporto.");

        // ---------------------------
        // CONTROLLO PAZIENTI
        // ---------------------------

        const linkTrasporto = page
            .locator("div.alert.alert-danger", {
                hasText: "Trasporto necessario!"
            })
            .locator("a");

        const numeroLink = await linkTrasporto.count();

        console.log(numeroLink);

        if (numeroLink !== 0) {

            for (let i = 0; i < numeroLink; i++) {

                const link = linkTrasporto.nth(i);

                const href = await link.getAttribute("href");
                const testo = await link.innerText();

                console.log(`Link trovato ${i + 1}: ${testo} -> ${href}`);

                await page.goto(`https://www.operatore112.it${href}`);

                console.log(`URL attuale: ${page.url()}`);

                const distanzaKm = (testo) => {

                    testo = testo
                        .toLowerCase()
                        .replace(",", ".")
                        .trim();

                    const valore = parseFloat(
                        testo.replace(/[^\d.]/g, "")
                    );

                    if (testo.includes("km"))
                        return valore;

                    if (testo.includes("m"))
                        return valore / 1000;

                    return valore;
                };

                try {

                    const rigaTuoOspedale =
                        page.locator("#own-hospitals tbody tr").first();

                    const distanzaTuo = await rigaTuoOspedale
                        .locator("td")
                        .nth(1)
                        .innerText();

                    const kmTuo = distanzaKm(distanzaTuo);

                    const rigaAlleanza =
                        page.locator("#alliance-hospitals tbody tr").first();

                    const distanzaAlleanza = await rigaAlleanza
                        .locator("td")
                        .nth(1)
                        .innerText();

                    const kmAlleanza = distanzaKm(distanzaAlleanza);

                    console.log(`Tuo ospedale: ${kmTuo} km`);
                    console.log(`Ospedale alleanza: ${kmAlleanza} km`);

                    if (kmTuo <= kmAlleanza) {

                        console.log(
                            `Il tuo ospedale è più vicino di ${(kmAlleanza - kmTuo).toFixed(2)} km`
                        );

                        await rigaTuoOspedale
                            .getByRole("link", {
                                name: "Trasporta paziente"
                            })
                            .click();

                    } else {

                        console.log(
                            `L'ospedale alleanza è più vicino di ${(kmTuo - kmAlleanza).toFixed(2)} km`
                        );

                        await rigaAlleanza
                            .getByRole("link", {
                                name: "Trasporta paziente"
                            })
                            .click();
                    }

                    await page.waitForTimeout(2000);

                    console.log("Trasporto effettuato.");

                    await page.goto(`https://www.operatore112.it/missions/${idMissione}`);

                } catch (err) {

                    console.log("Errore:", err);

                    await page.goto(`https://www.operatore112.it/missions/${idMissione}`);
                }
            }

        } else {

            console.log("Nessun paziente.");

            // ---------------------------
            // CONTROLLO DETENUTI
            // ---------------------------

            if (await page.locator(".alert-missing-vehicles").isVisible()) {
                console.log("Alert veicoli presente.");
            }

            const bottoneCarceri = page.locator("#btn-show-available-prisons");

            if (await bottoneCarceri.isVisible()) {
                await bottoneCarceri.click();
                await page.waitForTimeout(800);
            }

            function estraiDistanza(testo) {

                const match = testo
                    .toLowerCase()
                    .match(/(\d+[,.]?\d*)\s*(km|m)/);

                if (!match)
                    return Number.MAX_VALUE;

                let valore = parseFloat(
                    match[1].replace(",", ".")
                );

                if (match[2] === "m")
                    valore /= 1000;

                return valore;
            }

            const rigaPrigionieri = page.locator(".vehicle_prisoner_select");

            if ((await rigaPrigionieri.count()) > 0) {

                const links = rigaPrigionieri.locator("a");

                const totale = await links.count();

                const destinazioni = [];

                for (let i = 0; i < totale; i++) {

                    const link = links.nth(i);

                    const testo = await link.innerText();

                    destinazioni.push({
                        elemento: link,
                        testo: testo.trim(),
                        distanza: estraiDistanza(testo)
                    });
                }

                destinazioni.sort(
                    (a, b) => a.distanza - b.distanza
                );

                console.log("Destinazioni ordinate:");

                destinazioni.forEach(dest => {
                    console.log(
                        `${dest.distanza.toFixed(3)} km -> ${dest.testo}`
                    );
                });

                if (destinazioni.length > 0) {

                    console.log(
                        `Invio detenuto a: ${destinazioni[0].testo}`
                    );

                    await destinazioni[0].elemento.click();

                    await page.goto(
                        `https://www.operatore112.it/missions/${idMissione}`
                    );
                }

            } else {

                console.log("Nessuna destinazione trovata.");

                await page.goto(
                    `https://www.operatore112.it/missions/${idMissione}`
                );
            }
        }

    } catch (err) {

        console.log("Errore nella logica trasporto:", err);

        await page.waitForTimeout(1000);

        await page.goto(
            `https://www.operatore112.it/missions/${idMissione}`
        );
    }
}


async function logicaMissioni(page) {
    console.log("Inizio Logica Missioni");

    console.log("Naviga e Smistamento Missioni")
    await navigaEInviaMezzi(page)
}


async function navigaEInviaMezzi(page) {

    // Controlla che il file delle missioni esista
    if (!fs.existsSync("data/mission_data.json")) {
        console.log("Il file mission_data.json non esiste. Interruzione della funzione.");
        return;
    }

    // Carica i dati delle missioni
    const datiMissioni = JSON.parse(
        fs.readFileSync("data/mission_data.json", "utf8")
    );

    // Cicla tutte le missioni presenti nel file JSON
    for (const [idMissione, dati] of Object.entries(datiMissioni)) {

        const nomeMissione = dati.mission_name || "Missione sconosciuta";
        const autoIncidentate = dati.crashed_cars || 0;
        const pazienti = dati.patients || 0;

        console.log(
            `Invio mezzi per ${nomeMissione} 
            (Auto incidentate: ${autoIncidentate}) 
            (Pazienti: ${pazienti})`
        );


        // Apre la pagina della missione
        await page.goto(
            `https://www.operatore112.it/missions/${idMissione}`
        );


        // Aspetta che la missione venga caricata
        try {

            await page.waitForSelector("#missionH1", {
                timeout: 5000
            });

        } catch (errore) {

            console.log(
                `La missione ${idMissione} non è stata caricata in tempo. Saltata.`
            );

            continue;
        }



        // Se ci sono mezzi mancanti disponibili, li carica
        const pulsanteMezziMancanti = await page.$(
            "a.missing_vehicles_load.btn-warning"
        );

        if (pulsanteMezziMancanti) {

            await pulsanteMezziMancanti.click();

            await page.waitForLoadState("networkidle");

            console.log(
                `Caricati mezzi aggiuntivi per la missione ${idMissione}`
            );
        }



        // Gestione dei mezzi richiesti dalla missione
        const richiesteMezzi = dati.vehicles || [];


        for (const richiesta of richiesteMezzi) {

            const nomeMezzo = richiesta.name;
            const quantitaMezzo = richiesta.count;



            /*
                Caso speciale:
                Il personale SWAT viene convertito in mezzi corazzati.
                Ogni mezzo corazzato trasporta 6 operatori.
            */
            if (nomeMezzo.includes("SWAT Personnel")) {


                const corazzatiNecessari = Math.floor(
                    quantitaMezzo / 6
                );


                const idMezziCorazzati =
                    await trovaIDMezzi("SWAT Armoured Vehicle");


                let selezionati = 0;


                // Seleziona prima i mezzi corazzati
                for (const idMezzo of idMezziCorazzati) {


                    if (selezionati >= corazzatiNecessari)
                        break;


                    const checkbox = await page.$(
                        `input.vehicle_checkbox[value="${idMezzo}"]`
                    );


                    if (checkbox) {

                        await page.evaluate(
                            elemento => elemento.scrollIntoView(),
                            checkbox
                        );


                        await page.evaluate(
                            elemento => {
                                elemento.click();
                                elemento.dispatchEvent(
                                    new Event("change", {
                                        bubbles: true
                                    })
                                );
                            },
                            checkbox
                        );


                        console.log(
                            `Selezionato mezzo SWAT corazzato (${idMezzo})`
                        );

                        selezionati++;
                    }
                }



                // Se non bastano usa gli SUV SWAT
                if (selezionati < corazzatiNecessari) {


                    const idSUVSWAT =
                        await trovaIDMezzi("SWAT SUV");


                    for (const idSUV of idSUVSWAT) {


                        if (selezionati >= quantitaMezzo)
                            break;


                        const checkbox = await page.$(
                            `input.vehicle_checkbox[value="${idSUV}"]`
                        );


                        if (checkbox) {


                            await page.evaluate(
                                elemento => elemento.scrollIntoView(),
                                checkbox
                            );


                            await page.evaluate(
                                elemento => {
                                    elemento.click();
                                    elemento.dispatchEvent(
                                        new Event("change", {
                                            bubbles: true
                                        })
                                    );
                                },
                                checkbox
                            );


                            console.log(
                                `Selezionato SUV SWAT (${idSUV})`
                            );


                            selezionati++;
                        }
                    }
                }



            } else {


                // Gestione normale dei mezzi
                const idMezzi =
                    await trovaIDMezzi(nomeMezzo);



                if (!idMezzi || idMezzi.length === 0) {

                    console.log(
                        `Tipo di mezzo '${nomeMezzo}' non trovato`
                    );

                    continue;
                }



                console.log(
                    `Selezione ${quantitaMezzo} mezzo/i ${nomeMezzo}`
                );


                // Conta eventuali mezzi già selezionati
                let selezionati =
                    await contaMezziGiaSelezionati(
                        page,
                        nomeMezzo
                    );



                const checkboxDisponibili =
                    await page.locator(
                        "//input[contains(@id,'vehicle_checkbox')]"
                    ).all();



                const valoriCheckbox = [];


                // Recupera gli ID dei mezzi disponibili nella pagina
                for (const checkbox of checkboxDisponibili) {

                    valoriCheckbox.push(
                        await checkbox.getAttribute("value")
                    );
                }



                // Seleziona i mezzi necessari
                for (const numero of valoriCheckbox) {


                    if (selezionati >= quantitaMezzo)
                        break;



                    if (idMezzi.includes(numero)) {


                        const checkbox =
                            await page.$(
                                `input.vehicle_checkbox[value="${numero}"]`
                            );



                        if (checkbox) {


                            await page.evaluate(
                                elemento => elemento.scrollIntoView(),
                                checkbox
                            );


                            await page.evaluate(
                                elemento => {

                                    elemento.click();

                                    elemento.dispatchEvent(
                                        new Event("change", {
                                            bubbles: true
                                        })
                                    );

                                },
                                checkbox
                            );



                            console.log(
                                `Selezionato ${nomeMezzo} (${numero})`
                            );


                            selezionati++;
                        }
                    }
                }
            }
        }




        /*
            Gestione delle auto incidentate:
            - più di una auto -> servono trasportatori o carri attrezzi
            - una sola auto -> basta un carro attrezzi
        */

        if (autoIncidentate > 1) {


            const trasportatoriNecessari =
                autoIncidentate - 2;


            const idTrasportatori =
                await trovaIDMezzi("Flatbed Carrier");


            let selezionati = 0;



            // Prova prima con i trasportatori
            for (const idMezzo of idTrasportatori) {


                if (selezionati >= trasportatoriNecessari)
                    break;



                const checkbox = await page.$(
                    `input.vehicle_checkbox[value="${idMezzo}"]`
                );



                if (checkbox) {


                    await page.evaluate(
                        elemento => elemento.scrollIntoView(),
                        checkbox
                    );


                    await page.evaluate(
                        elemento => {

                            elemento.click();

                            elemento.dispatchEvent(
                                new Event("change", {
                                    bubbles: true
                                })
                            );

                        },
                        checkbox
                    );



                    console.log(
                        `Selezionato Flatbed Carrier (${idMezzo})`
                    );


                    selezionati++;
                }
            }



            // Se mancano mezzi usa i carri attrezzi
            if (selezionati < trasportatoriNecessari) {


                const tipiCarroAttrezzi = [
                    "Wrecker",
                    "Police Wrecker",
                    "Fire Wrecker"
                ];



                for (const tipo of tipiCarroAttrezzi) {


                    const idCarri =
                        await trovaIDMezzi(tipo);



                    for (const idMezzo of idCarri) {


                        if (selezionati >= trasportatoriNecessari)
                            break;



                        const checkbox =
                            await page.$(
                                `input.vehicle_checkbox[value="${idMezzo}"]`
                            );



                        if (checkbox) {

                            await page.evaluate(
                                elemento => elemento.scrollIntoView(),
                                checkbox
                            );


                            await page.evaluate(
                                elemento => {

                                    elemento.click();

                                    elemento.dispatchEvent(
                                        new Event("change", {
                                            bubbles: true
                                        })
                                    );

                                },
                                checkbox
                            );


                            console.log(
                                `Selezionato ${tipo} (${idMezzo})`
                            );


                            selezionati++;
                        }
                    }
                }
            }



        } else if (autoIncidentate === 1) {


            const tipiCarroAttrezzi = [
                "Wrecker",
                "Police Wrecker",
                "Fire Wrecker"
            ];


            let selezionati = 0;



            // Cerca un qualsiasi carro attrezzi
            for (const tipo of tipiCarroAttrezzi) {


                const idCarri =
                    await trovaIDMezzi(tipo);



                for (const idMezzo of idCarri) {


                    if (selezionati >= 1)
                        break;



                    const checkbox =
                        await page.$(
                            `input.vehicle_checkbox[value="${idMezzo}"]`
                        );



                    if (checkbox) {


                        await page.evaluate(
                            elemento => elemento.scrollIntoView(),
                            checkbox
                        );


                        await page.evaluate(
                            elemento => {

                                elemento.click();

                                elemento.dispatchEvent(
                                    new Event("change", {
                                        bubbles: true
                                    })
                                );

                            },
                            checkbox
                        );


                        console.log(
                            `Selezionato ${tipo} (${idMezzo})`
                        );


                        selezionati++;
                    }
                }
            }



            // Se non trova carri attrezzi usa un trasportatore
            if (selezionati === 0) {


                const trasportatori =
                    await trovaIDMezzi("Flatbed Carrier");


                if (trasportatori.length > 0) {


                    const checkbox =
                        await page.$(
                            `input.vehicle_checkbox[value="${trasportatori[0]}"]`
                        );


                    if (checkbox) {


                        await page.evaluate(
                            elemento => elemento.scrollIntoView(),
                            checkbox
                        );


                        await page.evaluate(
                            elemento => {

                                elemento.click();

                                elemento.dispatchEvent(
                                    new Event("change", {
                                        bubbles: true
                                    })
                                );

                            },
                            checkbox
                        );


                        console.log(
                            `Selezionato Flatbed Carrier (${trasportatori[0]})`
                        );
                    }
                }
            }
        }



        // Invia la missione
        const pulsanteInvio =
            await page.$("#alert_btn");


        if (pulsanteInvio) {


            await pulsanteInvio.click();


            console.log(
                `Mezzi inviati per missione ${idMissione}`
            );


        } else {


            console.log(
                `Pulsante invio non trovato per missione ${idMissione}`
            );
        }
    }
}

/**
 * Restituisce gli ID dei mezzi compatibili con il nome richiesto.
 * Cerca prima il tipo esatto e successivamente eventuali alternative.
 */
async function trovaIDMezzi(nomeMezzo) {

    // Carica il file contenente tutti gli ID dei mezzi
    const datiMezzi = JSON.parse(
        fs.readFileSync("data/vehicle_data.json", "utf8")
    );

    // Array che conterrà tutti gli ID trovati
    const idMezzi = [];

    // Se il mezzo esiste nel file JSON aggiunge i suoi ID
    if (nomeMezzo in datiMezzi) {

        idMezzi.push(...datiMezzi[nomeMezzo]);
    }

    console.log("Ricerca mezzo:", nomeMezzo);

    // Recupera eventuali mezzi alternativi
    const mezziAlternativi = ottieniMezziAlternativi(nomeMezzo);

    if (mezziAlternativi.length > 0) {

        console.log(
            `Ricerca alternative per "${nomeMezzo}": ${mezziAlternativi.join(", ")}`
        );

        // Aggiunge gli ID di tutti i mezzi alternativi
        for (const nomeAlternativo of mezziAlternativi) {

            if (nomeAlternativo in datiMezzi) {

                idMezzi.push(...datiMezzi[nomeAlternativo]);
            }
        }
    }

    // Nessun mezzo trovato
    if (idMezzi.length === 0) {

        console.log(
            `Nessun mezzo trovato per "${nomeMezzo}" o per le sue alternative.`
        );
    }

    return idMezzi;
}



/**
 * Restituisce un elenco di mezzi alternativi
 * compatibili con quello richiesto.
 */
function ottieniMezziAlternativi(tipoMezzo) {

    // Mappa dei mezzi equivalenti
    const mappaAlternative = {

        // Ricorda:
        // le chiavi devono essere tutte in minuscolo

        "ambulanza": [
            "Ambulanza BLSD"
        ],

        "pattuglie": [
            "Volante"
        ],

        "aps/abp": [
            "ABP",
            "APS"
        ],

        "aps/abp o unità polisoccorso": [
            "ABP",
            "APS"
        ],

        "aps/abp, unità polisoccorso o autoscale": [
            "ABP",
            "APS",
            "AS"
        ],

        "pattuglie o veicoli della polizia locale": [
            "Volante"
        ],

        "unità cinofila antidroga": [
            "Unità cinofila antidroga"
        ],

        "ambulanze": [
            "Ambulanza BLSD"
        ],

        "suv uopi": [
            "UOPI Suv"
        ],

        "autoscale": [
            "AS"
        ],

        "unità polisoccorso": [
            "APS",
            "AS"
        ],

        "furgone antisommossa": [
            "Furgone Antisommossa"
        ]
    };

    // Converte il nome in minuscolo per evitare problemi di confronto
    tipoMezzo = tipoMezzo.toLowerCase();

    // Restituisce le alternative oppure un array vuoto
    return mappaAlternative[tipoMezzo] || [];
}


/**
 * Conta quanti mezzi dello stesso tipo sono già presenti sulla missione.
 *
 * @param {Page} pagina
 * @param {string} nomeMezzo
 * @returns {number} Numero di mezzi già inviati
 */
async function contaMezziGiaSelezionati(pagina, nomeMezzo) {

    // Contatore dei mezzi trovati
    let totale = 0;

    try {

        // Recupera tutti i link dei mezzi già presenti sulla missione
        const collegamenti = await pagina
            .locator("table#mission_vehicle_at_mission td:nth-child(2) a")
            .evaluateAll(elementi =>
                elementi.map(elemento => elemento.href)
            );

        // Carica il database dei mezzi una sola volta
        const fs = require("fs");

        const datiMezzi = JSON.parse(
            fs.readFileSync("data/vehicle_data.json", "utf8")
        );

        // Recupera il tipo alternativo del mezzo richiesto
        const mezziAlternativi =
            ottieniMezziAlternativi(nomeMezzo);

        const mezzoDaConfrontare =
            mezziAlternativi.length > 0
                ? mezziAlternativi[0]
                : nomeMezzo;

        // Controlla ogni mezzo già presente
        for (const collegamento of collegamenti) {

            // Estrae l'ID del mezzo dall'URL
            const idMezzo = collegamento.split("/")[4];

            // Cerca a quale categoria appartiene
            for (const [tipoMezzo, listaID] of Object.entries(datiMezzi)) {

                if (listaID.includes(idMezzo)) {

                    if (tipoMezzo === mezzoDaConfrontare) {

                        totale++;
                    }

                    // L'ID appartiene ad una sola categoria
                    break;
                }
            }
        }

    } catch (errore) {

        console.log(
            `Errore durante il controllo dei mezzi già presenti: ${errore}`
        );
    }

    return totale;
}