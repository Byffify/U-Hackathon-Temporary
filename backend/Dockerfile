FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./
RUN useradd --create-home --uid 10001 utopia
USER utopia
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:create_app --factory --host 0.0.0.0 --port ${PORT:-8000}"]
