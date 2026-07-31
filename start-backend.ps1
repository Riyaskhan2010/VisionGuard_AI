# VisionGuard AI — Start Backend
# Run from the project root: .\start-backend.ps1

Set-Location "$PSScriptRoot\backend"

if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
}

Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& ".\venv\Scripts\Activate.ps1"

Write-Host "Installing dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

Write-Host "Starting Flask server on http://localhost:5000" -ForegroundColor Green
python app.py
