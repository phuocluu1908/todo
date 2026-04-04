FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || true
COPY . .
RUN npm run build || true
EXPOSE 4001
CMD ["node", "dist/main.js"]
