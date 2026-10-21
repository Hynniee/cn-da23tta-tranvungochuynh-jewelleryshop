FROM node:20-alpine AS build
WORKDIR /app/scr/client
COPY scr/client/package*.json ./
RUN npm install
COPY scr/client/ ./
COPY scr/server/src/data/catalog.json /app/scr/server/src/data/catalog.json
COPY scr/server/src/data/storeConfig.json /app/scr/server/src/data/storeConfig.json
RUN npm run build
FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/scr/client/dist /usr/share/nginx/html
EXPOSE 80
