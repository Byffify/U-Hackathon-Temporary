from pathlib import Path

from alembic import command
from alembic.config import Config
from conftest import ORIGIN, login
from fastapi.testclient import TestClient

from app.main import create_app


def test_migrations_support_fresh_database_and_repeatable_upgrade(settings, clock):
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.attributes["database_url"] = settings.database_url
    command.upgrade(config, "head")
    with TestClient(create_app(settings, clock=clock), headers={"Origin": ORIGIN}) as client:
        identity = login(client)
        assert client.get("/health/ready").status_code == 200
    command.upgrade(config, "head")
    with TestClient(create_app(settings, clock=clock)) as client:
        assert client.get(f"/api/v1/creators/{identity['user']['id']}").status_code == 200
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    with TestClient(create_app(settings, clock=clock)) as client:
        assert client.get("/health/ready").status_code == 200
