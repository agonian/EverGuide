FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
# En basit çalıştırma yolu:
CMD ["npx", "tsx", "server.ts"]
