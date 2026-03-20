# Use a slim Python 3.11 image as base
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the source directory in PYTHONPATH so imports work correctly
ENV PYTHONPATH /app/src

# Set working directory inside the container
WORKDIR /app

# Install basic system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright (Chromium) and its required system libraries
# This ensures screenshots work inside the container
RUN playwright install --with-deps chromium

# Copy backend source code and models
# (Relative structure: /app/src and /app/models)
COPY src/ /app/src/
COPY models/ /app/models/

# Create a directory for temporary screenshots with appropriate permissions
RUN mkdir -p /tmp/mailharpoon_screenshots && chmod 777 /tmp/mailharpoon_screenshots

# Expose the API port (default 8000)
EXPOSE 8000

# Set default environment variables for the deployment-safe path logic
# These can be overridden at runtime via docker run -e or docker-compose
ENV MAILHARPOON_API_HOST=0.0.0.0
ENV MAILHARPOON_API_PORT=8000
ENV MAILHARPOON_MODELS_DIR=/app/models
ENV MAILHARPOON_SCREENSHOT_DIR=/tmp/mailharpoon_screenshots

# Start the FastAPI application using uvicorn
# Note: --reload is omitted for production use
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
