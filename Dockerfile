FROM node:20-alpine
WORKDIR /app

# 1. Bağımlılıkları kur (tsx burada yüklenecek)
COPY package*.json ./
RUN npm install

# 2. Tüm dosyaları kopyala
COPY . .

# 3. Frontend'i derle (dist klasörü oluşsun)
RUN npm run build

# 4. Uygulama portunu aç
EXPOSE 3000

# 5. Sitenin motorunu çalıştır
# tsx hem ESM desteği verir hem de .ts dosyalarını şak diye çalıştırır
CMD ["npx", "tsx", "server.ts"]
