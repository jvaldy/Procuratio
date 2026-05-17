FROM node:20-bookworm-slim

WORKDIR /app

# Dependances systeme minimales pour executer des navigateurs headless en E2E.
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    libgtk-3-0 \
    libnss3 \
    libxss1 \
    libasound2 \
    libgbm1 \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*
