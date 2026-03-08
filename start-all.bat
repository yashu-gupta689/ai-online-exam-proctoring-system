@echo off
echo Starting Backend...
start cmd /k "cd /d "C:\Users\yashu\Documents\trae_projects\WEB CAM DETECTION\ai-online-exam-proctoring-system\backend" && node src/server.js"
timeout /t 3
echo Starting Frontend...
start cmd /k "cd /d "C:\Users\yashu\Documents\trae_projects\WEB CAM DETECTION\ai-online-exam-proctoring-system\frontend" && npm run dev"
echo Both servers started!
pause
```

---

### 🔧 Step 3 — File Save karo:
1. **Ctrl+S** dabaao
2. Save dialog aayega
3. **File name** me likho:
```
start-all.bat
```
4. **Save as type** me select karo: **All Files**
5. Location select karo:
```
C:\Users\yashu\Documents\trae_projects\WEB CAM DETECTION\ai-online-exam-proctoring-system