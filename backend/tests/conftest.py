import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401
from app.db import Base, get_db, make_engine
from app.main import app
from app.seed import seed


@pytest.fixture
def db():
    engine = make_engine("sqlite://")
    engine.pool = StaticPool(engine.pool._creator)  # 인메모리 DB를 연결 간 공유
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with Session() as s:
        seed(s)
        yield s
    engine.dispose()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
