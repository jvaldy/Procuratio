#!/usr/bin/env sh
set -eu
docker compose --env-file .env.prod -f infra/docker-compose.prod.yml down
