"""E2E 테스트용 API 서버: 매번 새 SQLite DB에 마이그레이션 + 시드를 넣고 띄운다.

실제 기록(Docker Postgres, backend/gym.db)은 건드리지 않는다.
사용: uv run python scripts/e2e_server.py [port]
"""

import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8100
# 포트마다 DB 파일을 따로 둔다: 시연용 서버와 E2E 서버를 같이 띄워도 서로 파일을 잠그지 않게
DB = Path(tempfile.gettempdir()) / f"piste_e2e_{PORT}.db"

# app 을 import 하기 전에 DB 주소를 정해야 설정에 반영된다
DB.unlink(missing_ok=True)
os.environ["DATABASE_URL"] = f"sqlite:///{DB.as_posix()}"
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))

import uvicorn  # noqa: E402
from alembic.config import Config  # noqa: E402

from alembic import command  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.seed import seed  # noqa: E402

command.upgrade(Config(str(ROOT / "alembic.ini")), "head")
with SessionLocal() as s:
    seed(s)

uvicorn.run("app.main:app", host="127.0.0.1", port=PORT, log_level="warning")
