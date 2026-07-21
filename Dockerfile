FROM mcr.microsoft.com/playwright:v1.55.0-jammy

WORKDIR /app

# Copia sia package.json che package-lock.json (se presente)
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il resto del codice sorgente
COPY . .

CMD ["node", "server.js"]