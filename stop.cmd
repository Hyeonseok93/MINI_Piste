@echo off
chcp 65001 >nul
cd /d "%~dp0"
docker compose down
echo PISTE 를 껐습니다. 기록은 그대로 남아 있습니다.
timeout /t 3 >nul
