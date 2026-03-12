#!/bin/sh
set -e

echo "Running database migrations..."
node /app/scripts/migrate.mjs

echo "Starting price scrape cron..."
node /app/scripts/cron.mjs &

echo "Starting Jarvis Dashboard..."
exec node /app/server.js
