# syntax=docker/dockerfile:1.6

# Build stage for scheduler
FROM python:3.12-slim AS scheduler

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_INPUT=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /scheduler

# hadolint ignore=DL3005
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

COPY backend/requirements-scheduler.txt .
RUN pip install --no-cache-dir -r requirements-scheduler.txt

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

# Native libs for pip weasyprint; upgrade picks up util-linux CVE-2026-53615
# hadolint ignore=DL3005,DL3008
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        libcairo2 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libgdk-pixbuf-2.0-0 \
        libffi8 \
        shared-mime-info \
        fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

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
