param(
  [switch]$Force
)

if ($Force -or -not (Test-Path "api/.env.local")) {
  Copy-Item "api/.env.example" "api/.env.local" -Force
}

if ($Force -or -not (Test-Path "frontend/.env.local")) {
  Copy-Item "frontend/.env.example" "frontend/.env.local" -Force
}

Write-Host "Environment templates ready."
