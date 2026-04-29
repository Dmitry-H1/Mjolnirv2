FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (for numpy, sklearn, etc.)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements FIRST (for caching)
COPY backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/app ./app

# Cloud Run requirements
ENV PORT=8080
EXPOSE 8080

# Start FastAPI
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]