# Docker mynd fyrir verkefnalistann

# Nota Node.js Alpine sem grunn (létt og örugg)
FROM node:20-alpine

# Vinnumappa í gámnum
WORKDIR /app

# Afrita package.json skrár
COPY package*.json ./

# Setja upp pakka (bara production)
RUN npm ci --only=production

# Afrita allan kóða
COPY . .

# Umhverfisbreytur
ENV PORT=10000
ENV NODE_ENV=production

# Opna port
EXPOSE $PORT

# Keyrsla
CMD ["node", "index.js"]
