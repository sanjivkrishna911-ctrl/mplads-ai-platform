Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "    MPLADS AI ANOMALY DETECTION & DECISION SUPPORT PLATFORM" -ForegroundColor Yellow
Write-Host "           Smart India Hackathon 2026 (PS 26102)" -ForegroundColor White
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""
$env:PATH = "C:\Program Files\Python311;C:\Program Files\Python311\Scripts;$env:APPDATA\Python\Python311\Scripts;$env:PATH"

$pythonExe = "C:\Program Files\Python311\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

$dbPath = Join-Path $PSScriptRoot "backend\mplads.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "[*] Database not found. Generating realistic MPLADS dataset and training AI models..." -ForegroundColor Cyan
    & $pythonExe "$PSScriptRoot\backend\data_generator.py"
    Write-Host "[OK] Database generated successfully." -ForegroundColor Green
} else {
    Write-Host "[OK] Database found." -ForegroundColor Green
}

Write-Host ""
Write-Host "[*] Launching FastAPI Decision-Support Server on http://127.0.0.1:8000..." -ForegroundColor Cyan
Write-Host "[*] Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host ""

Start-Process "http://127.0.0.1:8000"

Set-Location "$PSScriptRoot\backend"
& $pythonExe -m uvicorn main:app --host 127.0.0.1 --port 8000
