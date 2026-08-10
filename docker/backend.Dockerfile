# syntax=docker/dockerfile:1.6

# Build stage for scheduler
FROM python:3.12-slim AS scheduler

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_INPUT=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /scheduler

COPY backend/requirements-scheduler.txt .
RUN pip install --no-cache-dir -r requirements-scheduler.txt \
    && pip install --no-cache-dir -U 'setuptools>=78.1.1'

# Copy only scheduler script and config
COPY backend/run_scheduler.py .
COPY backend/config.py .

# Main stage for API
FROM python:3.12-slim AS main

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_INPUT=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /backend

# WeasyPrint via apt (version pinned by Debian bookworm package index)
# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get install -y --no-install-recommends weasyprint \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY backend/requirements.txt .

# hadolint ignore=DL3042
RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir --prefer-binary -r requirements.txt && \
    pip install --no-cache-dir -U 'msgpack>=1.2.1' 'setuptools>=78.1.1'

# Copy backend code
COPY backend/ .

# Copy migrations to separate directory (outside of data) to avoid being overwritten by volume mounts
# Placed in /backend/migrations so Flask-Migrate finds it without -d parameter
COPY backend/data/migrations/ migrations/

# Add entrypoint for migrations
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV FLASK_APP=run.py \
    FLASK_ENV=production

EXPOSE 9000

ENTRYPOINT ["/entrypoint.sh"]

# Create scheduler image
FROM scheduler AS scheduler-image
CMD ["python", "run_scheduler.py"] 
