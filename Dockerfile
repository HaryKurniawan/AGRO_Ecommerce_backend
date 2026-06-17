FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generate Prisma client sebelum build (wajib agar types tersedia)
RUN npx prisma generate

RUN npm run build

EXPOSE 4000

CMD ["node", "dist/src/main.js"]
