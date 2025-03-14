FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

ENV PORT=10000
ENV NODE_ENV=production

EXPOSE $PORT

CMD ["node", "index.js"]
