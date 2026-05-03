#!/usr/bin/env sh
set -eu

if [ ! -f .env.prod ]; then
  if [ -f .env.prod.example ]; then
    cp .env.prod.example .env.prod
    echo ".env.prod cree depuis .env.prod.example. Pense a remplacer les secrets."
  else
    echo ".env.prod introuvable et .env.prod.example absent." >&2
    exit 1
  fi
fi

docker compose --env-file .env.prod -f infra/docker-compose.prod.yml up -d --build
