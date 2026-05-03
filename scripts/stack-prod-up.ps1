if (-not (Test-Path ".env.prod")) {
  if (Test-Path ".env.prod.example") {
    Copy-Item ".env.prod.example" ".env.prod"
    Write-Host ".env.prod cree depuis .env.prod.example. Pense a remplacer les secrets."
  } else {
    throw "Fichier .env.prod introuvable et .env.prod.example absent."
  }
}

docker compose --env-file .env.prod -f infra/docker-compose.prod.yml up -d --build
