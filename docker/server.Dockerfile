FROM node:20-alpine
WORKDIR /app
COPY scr/server/package*.json ./
RUN npm install
COPY scr/server/ ./
RUN npm run build
EXPOSE 5000
CMD ["npm","start"]
