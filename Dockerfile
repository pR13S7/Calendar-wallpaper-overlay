FROM python:3.12-slim

WORKDIR /app

# Pillow ships manylinux wheels that bundle libjpeg, libwebp, zlib — no apt step needed.
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
