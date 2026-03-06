# 1. Aşama: Frontend Derleme (Build)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Aşama: Çalıştırma (Runtime)
FROM node:20-alpine
WORKDIR /app

# Sadece gerekli dosyaları kopyalıyoruz
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.ts ./
COPY --from=build /app/public ./public

# Üretim için gerekli paketleri kuruyoruz
RUN npm install --omit=dev
RUN npm install -g ts-node typescript

# Port ayarı (server.ts'deki 3000 portuyla eşleşmeli)
EXPOSE 3000

# Uygulamayı başlat
CMD ["npx", "ts-node", "server.ts"]
