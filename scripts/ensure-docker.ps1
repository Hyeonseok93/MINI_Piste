# Docker 엔진이 꺼져 있으면 켠다.
# Docker Desktop 4.84 는 종료할 때 남긴 소켓 파일(접근 불가 상태)을 다음 시작 때 지우지 못해
# 바로 멈추는 문제가 있어, 시작 전에 해당 폴더를 옆으로 옮겨 둔다. 옮긴 폴더는 일주일 뒤 정리한다.

$ErrorActionPreference = 'SilentlyContinue'

function Test-Engine { docker info --format '{{.ServerVersion}}' *> $null; return $LASTEXITCODE -eq 0 }

if (Test-Engine) { exit 0 }

$exe = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'
if (-not (Test-Path $exe)) { $exe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe' }
if (-not (Test-Path $exe)) {
    Write-Host 'Docker Desktop 을 찾지 못했습니다. 설치되어 있는지 확인하세요.'
    exit 1
}

Write-Host 'Docker Desktop 을 켭니다...'
Get-Process 'Docker Desktop', 'com.docker.backend', 'com.docker.build' | Stop-Process -Force
Start-Sleep -Seconds 2

$stamp = Get-Date -Format 'yyyyMMddHHmmss'
foreach ($dir in @((Join-Path $env:LOCALAPPDATA 'Docker\run'), (Join-Path $env:LOCALAPPDATA 'docker-secrets-engine'))) {
    if (Test-Path -LiteralPath $dir) {
        Rename-Item -LiteralPath $dir -NewName ((Split-Path $dir -Leaf) + '.stale-' + $stamp)
    }
}

# 일주일 지난 옛 폴더는 지운다 (접근 불가 소켓이 남아 있으면 지워지지 않을 수 있어 실패는 무시)
$cutoff = (Get-Date).AddDays(-7)
Get-ChildItem -LiteralPath $env:LOCALAPPDATA -Directory -Filter 'docker-secrets-engine.stale-*' |
    Where-Object { $_.CreationTime -lt $cutoff } | Remove-Item -Recurse -Force
Get-ChildItem -LiteralPath (Join-Path $env:LOCALAPPDATA 'Docker') -Directory -Filter 'run.stale*' |
    Where-Object { $_.CreationTime -lt $cutoff } | Remove-Item -Recurse -Force

Start-Process -FilePath $exe
for ($i = 0; $i -lt 60; $i++) {
    if (Test-Engine) { Write-Host 'Docker 준비 완료'; exit 0 }
    Start-Sleep -Seconds 3
}
Write-Host 'Docker 가 3분 안에 켜지지 않았습니다. Docker Desktop 창의 오류 메시지를 확인하세요.'
exit 1
