@echo off
cd "C:\Users\yashu\Documents\trae_projects\WEB CAM DETECTION\ai-online-exam-proctoring-system"
git add .
set /p msg="Kya change kiya?: "
git commit -m "%msg%"
git push
echo Done! GitHub par upload ho gaya!
pause