const http = require('http');
const { chromium } = require('playwright');

// 1. Avvia un micro-server HTTP per soddisfare il Port Binding di Render
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running smoothly H24!');
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`[Server] In ascolto sulla porta ${PORT} per Render Health Check`);
});

// Funzione di utility per fare una pausa tra i cicli
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 2. Il ciclo principale del Bot/Test Playwright
async function runBot() {
  console.log('[Bot] Avvio del ciclo continuo...');

  // Avviamo il browser una volta sola fuori dal ciclo per risparmiare risorse su Render (RAM)
  // Nota: Su Render headless deve essere TRUE
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const context = await browser.newContext();

  while (true) {
    let page;
    try {
      console.log(`[Bot] Nuovo ciclo iniziato alle: ${new Date().toISOString()}`);
      
      page = await context.newPage();
      
      // --- INIZIO LOGICA DI TEST ---
      // Sostituisci questo blocco con la tua vera logica
      await page.goto('https://example.com');
      const title = await page.title();
      console.log(`[Bot] Successo! Titolo della pagina recuperato: "${title}"`);
      // --- FINE LOGICA DI TEST ---

    } catch (error) {
      console.error('[Bot] Errore riscontrato durante l\'esecuzione:', error.message);
    } finally {
      // Chiudiamo la pagina per evitare perdite di memoria (memory leak)
      if (page) {
        await page.close();
      }
    }

    // Pausa di 1 minuto (60000 ms) prima del prossimo controllo.
    // Modificala in base alle tue esigenze per non sovraccaricare la CPU o il sito target.
    console.log('[Bot] In attesa per il prossimo ciclo...');
    await delay(60000); 
  }
}

// Avvia il bot in sottofondo
runBot().catch(err => {
  console.error('[Bot] Errore critico fatale:', err);
  process.exit(1);
});