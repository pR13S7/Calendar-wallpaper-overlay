FROM python:3.12-slim

WORKDIR /app

# Install only what Pillow needs at runtime (libjpeg, zlib already in slim)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libjpeg62-turbo libwebp7 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .
COPY templates/ templates/
COPY static/ static/
COPY fonts/ fonts/

EXPOSE 5555

# Run with gunicorn for production (4 workers, 120s timeout for large images)
CMD ["gunicorn", "--bind", "0.0.0.0:5555", "--workers", "4", "--timeout", "120", "app:app"]
