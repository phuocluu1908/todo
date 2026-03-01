#!/usr/bin/env bash
set -euo pipefail

# Simple helper to ensure a local MySQL Docker container is running and the
# application database exists, then starts the Nest app in dev mode.

CONTAINER_NAME=${CONTAINER_NAME:-user-mysql}
IMAGE=${IMAGE:-mysql:8.0}
ROOT_PWD=${DB_ROOT_PASSWORD:-root}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-todo_db}

echo "Using container: $CONTAINER_NAME (image: $IMAGE)"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not in PATH. Please install/start Docker."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker and retry."
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -w "$CONTAINER_NAME" >/dev/null 2>&1; then
  STATUS=$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME")
  if [ "$STATUS" != "running" ]; then
    echo "Starting existing container $CONTAINER_NAME..."
    docker start "$CONTAINER_NAME"
  else
    echo "Container $CONTAINER_NAME already running."
  fi
else
  echo "Creating and starting new container $CONTAINER_NAME..."
  docker run -d --name "$CONTAINER_NAME" -e MYSQL_ROOT_PASSWORD="$ROOT_PWD" -p "${DB_PORT}:3306" "$IMAGE"
fi

echo "Waiting for MySQL on 127.0.0.1:$DB_PORT to be reachable..."
for i in {1..30}; do
  if nc -z 127.0.0.1 "$DB_PORT" >/dev/null 2>&1; then
    echo "MySQL reachable."
    break
  fi
  sleep 1
done

echo "Ensuring database '$DB_NAME' exists..."
docker exec "$CONTAINER_NAME" mysql -uroot -p"$ROOT_PWD" -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" || true

echo "Exporting environment variables for the app and starting Nest (dev)..."
export DB_HOST=127.0.0.1
export DB_PORT="$DB_PORT"
export DB_USER=root
export DB_PASSWORD="$ROOT_PWD"
export DB_NAME="$DB_NAME"

exec yarn start:dev
