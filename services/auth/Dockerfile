FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/main.js"]
