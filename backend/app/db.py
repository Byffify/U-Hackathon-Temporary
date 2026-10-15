from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def make_engine(url: str):
    args = {"check_same_thread": False} if url.startswith("sqlite") else {"connect_timeout": 5}
    engine = create_engine(url, pool_pre_ping=True, connect_args=args)
    if url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

    return engine


def get_db(request):
    with request.app.state.sessions() as session:
        yield session
