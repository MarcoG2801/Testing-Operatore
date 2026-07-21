FROM mcr.microsoft.com/playwright:v1.55.0-jammy

WORKDIR /app

COPY package-lock.json package-lock.json
RUN npm install

COPY . .

CMD ["node", "server.js"]