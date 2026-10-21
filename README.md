# PISTE — 운동 스케줄 관리

`헬스_스케줄.md`의 1년 플랜을 웹서비스로 옮긴 개인용 앱. 오늘 할 운동과 들어야 할 무게를 보여 주고, 세트를 기록하면 다음 무게를 이중 점진법으로 정해 준다. 로그인 없이 이름만으로 시작한다.

## 실행 (Docker, 한 번에)

1. (선택) Docker Desktop을 켠다. `start.cmd` 가 꺼져 있으면 알아서 켠다.
2. `start.cmd` 더블클릭 (또는 아래 명령)
3. 브라우저에서 http://localhost:8080

```bash
docker compose up -d --build
```

끄기: `stop.cmd` 또는 `docker compose down`. 기록은 Docker 볼륨(`piste_pgdata`)에 남는다.
완전히 초기화하려면 `docker compose down -v` (모든 기록 삭제).

**휴대폰으로 보기**: PC와 같은 와이파이에서 `http://<PC의 IP>:8080`. Windows 방화벽이 8080 포트를 막으면 허용해 준다.

## 화면

| 화면 | 내용 |
|---|---|
| 홈 | 오늘 운동, 1년 플랜 띠(피스트), 연속·출석률·체중·누적, 이번 주, 다음 운동 |
| 오늘 운동 | 종목별 추천 무게, 세트 기록, 무게 찾기, 유산소·메모, 몸 상태 |
| 달력 | 월간 계획과 완료/빠짐, 날짜별 상세 |
| 운동 기록 | 월별 세션 목록과 세트 내역 |
| 통계 | 종목별 최고 무게 추이, 체중과 7일 평균 |
| 플랜 | 단계·루틴·종목 (증량 단위, 세팅 메모 수정) |
| 설정 | 이름·키·시작/목표 체중 |

데스크톱(1024px 이상)은 왼쪽 사이드바, 모바일은 하단 탭으로 바뀐다.

## 구조

- **Backend** [`backend/`](backend): FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL(Docker) / SQLite(로컬 개발)
- **Frontend** [`frontend/`](frontend): React · TypeScript · Vite · TanStack Query, nginx로 서빙하며 `/api` 를 백엔드로 프록시
- 설계: [`docs/DESIGN.md`](docs/DESIGN.md) · API 문서: http://localhost:8080/api/docs

## 개발 모드 (Docker 없이)

```bash
cd backend && uv sync && uv run alembic upgrade head && uv run python -m app.seed && uv run uvicorn app.main:app --reload
cd frontend && npm install && npm run dev    # http://localhost:5173
```

Windows에서 인코딩 오류가 나면 `PYTHONUTF8=1` 을 설정한다.

## 테스트

```bash
cd backend && uv run pytest        # 규칙 + API 통합
cd frontend && npx vitest run      # 유틸 + 컴포넌트
cd frontend && npm run build       # 타입체크 + 번들
```
