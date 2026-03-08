FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (use lockfile)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy sources and build
COPY . .
RUN yarn build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

# Copy built output
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/src/main"]
