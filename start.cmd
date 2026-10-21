@echo off
chcp 65001 >nul
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-docker.ps1"
if errorlevel 1 (
  pause
  exit /b 1
)

echo PISTE 를 시작합니다. 처음에는 이미지를 만드느라 몇 분 걸립니다.
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo 시작하지 못했습니다. 위 오류 메시지를 확인하세요.
  pause
  exit /b 1
)
echo.
echo 준비되면 브라우저에서 http://localhost:8080 을 엽니다.
timeout /t 3 >nul
start "" http://localhost:8080
