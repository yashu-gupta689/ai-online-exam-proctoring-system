@echo off
echo Starting AI Online Exam Proctoring System...

echo.
echo [1/2] Starting Backend Server...
start cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 5

echo.
echo [2/2] Starting Frontend Application...
start cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ==================================================
echo System is starting up!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo ==================================================
pause