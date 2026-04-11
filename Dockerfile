FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (use lockfile)
COPY package.json yarn.lock ./
RUN yarn install

# Copy sources and build
COPY . .
RUN yarn build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json yarn.lock ./
RUN yarn install --production

# Copy built output
COPY --from=builder /app/dist ./dist

EXPOSE 3000
# Run migrations (using compiled JS, no ts-node needed) then start app
CMD ["sh", "-c", "node node_modules/typeorm/cli.js migration:run -d dist/src/data-source.js && node dist/src/main"]
