param(
  [switch]$Force
)

if ($Force) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env" -Force
  } else {
    throw "Fichier .env.example introuvable."
  }
}

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env" -Force
  } else {
    throw "Fichier .env manquant et .env.example introuvable."
  }
}

Write-Host "Environment bootstrap complete (.env racine prêt)."
