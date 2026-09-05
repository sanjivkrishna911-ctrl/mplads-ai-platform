@echo off
title MPLADS AI Platform Launcher - SIH 2026
echo ===============================================================
echo     MPLADS AI ANOMALY DETECTION ^& DECISION SUPPORT PLATFORM
echo            Smart India Hackathon 2026 (PS 26102)
echo ===============================================================
echo.

cd /d "%~dp0"
set "PATH=C:\Program Files\Python311;C:\Program Files\Python311\Scripts;%APPDATA%\Python\Python311\Scripts;%PATH%"

echo [*] Checking database status...
if not exist "backend\mplads.db" (
    echo [!] Database not found. Generating realistic MPLADS dataset and training AI models...
    python backend\data_generator.py
    echo [OK] Database generated successfully.
) else (
    echo [OK] Database found.
)

echo.
echo [*] Launching FastAPI Decision-Support Server on http://127.0.0.1:8000...
echo [*] Press Ctrl+C in this terminal to stop the server.
echo.

start "" http://127.0.0.1:8000

cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000

