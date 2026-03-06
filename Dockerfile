# 1. Aşama: Dosyaları Hazırla (Build)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Aşama: Nginx ile Yayınla
FROM nginx:stable-alpine
# Vite'ın oluşturduğu 'dist' klasörünü Nginx'in içine atıyoruz
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
