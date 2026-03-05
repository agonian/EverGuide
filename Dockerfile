# 1. Aşama: Build
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Aşama: Yayın
FROM nginx:stable-alpine
# Hazırladığımız özel ayarı Nginx'in içine kopyalıyoruz
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Derlenen site dosyalarını kopyalıyoruz
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
