#!/usr/bin/env sh
set -eu

if [ ! -f api/.env.local ]; then
  cp api/.env.example api/.env.local
fi

if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.example frontend/.env.local
fi

echo "Environment templates copied."
