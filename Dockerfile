# 1. Aşama: Derleme
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Aşama: Çalıştırma
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
# Vite'ı ana bağımlılıklara aldığımız için bu sefer bulacak
RUN npm install
COPY --from=build /app/server.ts ./
RUN npm install -g ts-node typescript

EXPOSE 3000
# NODE_ENV'yi üretim olarak set ediyoruz ki Vite middleware çalışmasın
ENV NODE_ENV=production
CMD ["npx", "ts-node", "server.ts"]
