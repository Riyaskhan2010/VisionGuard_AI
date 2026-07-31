# VisionGuard AI — Start Frontend
# Run from the project root: .\start-frontend.ps1

Set-Location "$PSScriptRoot\frontend"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm packages..." -ForegroundColor Cyan
    npm install
}

Write-Host "Starting Vite dev server on http://localhost:5173" -ForegroundColor Green
npm run dev
