# 1. Aşama: Derleme (Build)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Frontend'i derle
RUN npm run build
# server.ts'yi server.js'ye çevirmek yerine doğrudan ts-node ile çalıştıracağız ama bağımlılıkları tam kuruyoruz

# 2. Aşama: Çalıştırma (Runtime)
FROM node:20-alpine
WORKDIR /app

# Sadece gerekli dosyaları alalım
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.ts ./
COPY --from=build /app/public ./public

# Üretim için her şeyi kuralım (ts-node dahil)
RUN npm install

EXPOSE 3000

# ES modülleri için ts-node'u doğru loader ile ayağa kaldırıyoruz
CMD ["node", "--loader", "ts-node/esm", "server.ts"]
