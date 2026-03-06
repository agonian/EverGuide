# 1. Aşama: Build (Derleme)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Frontend'i dist klasörüne basıyoruz
RUN npm run build

# 2. Aşama: Runtime (Çalıştırma)
FROM node:20-alpine
WORKDIR /app

# Sadece gerekli dosyaları kopyalayalım
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.ts ./
COPY --from=build /app/public ./public

# Üretim paketlerini ve TS çalıştırma araçlarını kuralım
RUN npm install --omit=dev
RUN npm install -g ts-node typescript

EXPOSE 3000

# ES modülleri için ts-node'u doğru loader ile çalıştırıyoruz
CMD ["node", "--loader", "ts-node/esm", "server.ts"]
