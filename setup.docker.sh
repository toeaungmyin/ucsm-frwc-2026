#!/usr/bin/env bash
# Local Docker setup: prepares backend/frontend env files and runs the stack
# (nginx, frontend, backend, minio). PostgreSQL is external — set DATABASE_URL in backend/.env.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

log() { printf '%s\n' "$*"; }

if [ ! -f backend/.env ]; then
  if [ -f backend/.env.example ]; then
    cp backend/.env.example backend/.env
    log "[INFO] Created backend/.env from backend/.env.example — edit it if needed (DATABASE_URL, secrets)."
  else
    log "[ERROR] Missing backend/.env and backend/.env.example" >&2
    exit 1
  fi
fi

if [ ! -f frontend/.env ] && [ -f frontend/.env.example ]; then
  cp frontend/.env.example frontend/.env
  log "[INFO] Created frontend/.env from frontend/.env.example — for host dev; Docker build uses /api in compose."
fi

if [ ! -f docker-compose.yml ]; then
  log "[ERROR] docker-compose.yml not found in $ROOT" >&2
  exit 1
fi

log "[INFO] Building and starting services (this may take a while)…"
docker compose up -d --build

log ""
log "Stack is up. With default compose:"
log "  App:        http://localhost:8026"
log "  MinIO UI:  http://localhost:9001"
log ""
log "One-time database (after containers are healthy):"
log "  docker exec -it ucsm-frwc-backend npx prisma migrate deploy"
log "  docker exec -it ucsm-frwc-backend npm run db:seed   # if you use seeding"
