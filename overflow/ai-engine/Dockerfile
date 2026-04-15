# =============================================================================
# Overflow AI Engine — Dockerfile
# Base image: python:3.11-slim
#
# Uses Python 3.11 (not 3.12) for maximum compatibility with:
#   - sentence-transformers (requires torch, which has pre-built 3.11 wheels)
#   - chromadb (native bindings)
#   - scikit-learn (compiled extensions)
#
# Build optimisations:
#   - Dependencies installed before copying source code for layer caching.
#   - Compiled .pyc files written at install time (--compile) to avoid cold-
#     start overhead on first request.
#   - System packages cleaned in the same RUN layer to keep the image small.
# =============================================================================

FROM python:3.11-slim AS base

LABEL org.opencontainers.image.title="Overflow AI Engine"
LABEL org.opencontainers.image.description="Flask/LangChain/ChromaDB RAG service for Overflow"

# Build argument for environment label (no functional effect; useful for
# image inspection and CI tagging)
ARG PYTHON_ENV=production
ENV PYTHON_ENV=$PYTHON_ENV

# Keeps Python from buffering stdout/stderr — important for Docker log capture
ENV PYTHONUNBUFFERED=1
# Suppress .pyc file generation to /tmp directories in read-only file systems;
# we handle compilation explicitly below
ENV PYTHONDONTWRITEBYTECODE=0

WORKDIR /app

# ---------------------------------------------------------------------------
# System dependencies
# ---------------------------------------------------------------------------
# gcc / g++ / build-essential: required to compile native extensions for
#   numpy, scikit-learn, chromadb's hnswlib, and sentence-transformers.
# libpq-dev: required if psycopg2 is later added for direct Postgres access.
# git: required by some pip packages that fetch from GitHub at install time.
# wget: used by the container healthcheck.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        build-essential \
        libpq-dev \
        git \
        wget \
        curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Python dependencies
# Installed before copying application code so Docker can cache this layer
# independently of source-code changes.
# ---------------------------------------------------------------------------
COPY requirements.txt .

RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --compile -r requirements.txt

# ---------------------------------------------------------------------------
# Application source
# ---------------------------------------------------------------------------
COPY . .

# Create the ChromaDB persistence directory with correct ownership.
# The actual path is overridden at runtime via CHROMADB_PATH env var
# (set to /data/chromadb in docker-compose, which is a named volume).
RUN mkdir -p /app/data/chromadb /app/data/raw

# ---------------------------------------------------------------------------
# Non-root user for security
# ---------------------------------------------------------------------------
RUN groupadd --system --gid 1001 aiengine && \
    useradd  --system --uid 1001 --gid aiengine --no-create-home aiengine && \
    chown -R aiengine:aiengine /app

USER aiengine

EXPOSE 5001

# Health endpoint is expected at GET /health in server.py
HEALTHCHECK --interval=20s --timeout=10s --retries=5 --start-period=60s \
    CMD wget -qO- http://localhost:5001/api/ai/health || exit 1

# Entry point: server.py must expose a Flask application on FLASK_PORT (5001).
# Using `python server.py` (not `flask run`) gives the application full control
# over startup (gevent patching, warm-up, etc.).
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "1", "--threads", "4", "--timeout", "120", "--access-logfile", "-", "server:app"]
