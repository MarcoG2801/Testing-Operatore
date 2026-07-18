# Usa l'immagine ufficiale di Playwright con Python preinstallato
FROM mcr.microsoft.com/playwright/python:v1.42.0-jammy

# Imposta la cartella di lavoro
WORKDIR /app

# Copia i file dei requisiti e installali
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia il resto del codice
COPY . .

# Comando per avviare l'applicazione
CMD ["python", "main.py"]