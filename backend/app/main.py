import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from app import auth, commerce, explore, gemini, intake, profiles, projects
from app.body_limit import BodyLimitMiddleware
from app.chain import ChainGateway
from app.config import Settings
from app.db import Base, make_engine
from app.errors import install_error_handlers
from app.schemas import Envelope, ErrorEnvelope, HealthView
from app.sources import SourceService
from app.storage import Storage


def create_app(settings: Settings | None = None, *, clock=None) -> FastAPI:
    settings = settings or Settings()
    engine = make_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(app):
        yield
        engine.dispose()

    app = FastAPI(
        title="U-topia API",
        version="0.1.0",
        lifespan=lifespan,
        responses={status: {"model": ErrorEnvelope} for status in (401, 403, 404, 422, 429, 503)},
    )
    app.state.settings = settings
    app.state.clock = clock or (lambda: int(time.time()))
    app.state.sessions = sessionmaker(engine, expire_on_commit=False)
    app.state.storage = Storage(settings)
    app.state.chain_gateway = ChainGateway(settings)
    app.state.source_service = SourceService(app)
    install_error_handlers(app)
    app.add_middleware(BodyLimitMiddleware, settings=settings)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.frontend_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT"],
        allow_headers=["Content-Type", "X-CSRF-Token", "Idempotency-Key"],
    )

    @app.middleware("http")
    async def response_headers(request, call_next):
        request.state.request_id = str(uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    app.include_router(auth.router)
    app.include_router(profiles.router)
    app.include_router(projects.router)
    app.include_router(explore.router)
    app.include_router(commerce.router)
    app.include_router(gemini.router)
    app.include_router(intake.router)

    @app.get("/health/live", tags=["health"], response_model=Envelope[HealthView])
    def live():
        return {"data": {"status": "ok"}}

    @app.get("/health/ready", tags=["health"], response_model=Envelope[HealthView])
    def ready(db: auth.DB):
        for table in Base.metadata.sorted_tables:
            db.execute(select(table).limit(1))
        return {"data": {"status": "ready"}}

    return app
