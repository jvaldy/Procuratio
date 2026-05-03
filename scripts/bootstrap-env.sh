#!/usr/bin/env sh
set -eu

if [ "${1:-}" = "--force" ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    echo ".env.example introuvable" >&2
    exit 1
  fi
fi

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    echo ".env et .env.example absents" >&2
    exit 1
  fi
fi

echo "Environment bootstrap complete (.env racine prêt)."
