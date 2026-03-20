# Use a slim Python 3.11 image for the frontend
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory for the application
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the frontend application code into the container
COPY . /app/

# IMPORTANT: The application (app.py) expects an 'images' folder to be a 
# sibling of the 'frontend_streamlit' directory. 
# We copy the project's 'images' folder to the container's root directory 
# so that the relative path resolution in app.py remains valid.
# (Note: This requires 'images' to be part of the build context)
COPY images/ /images/

# Expose the default Streamlit port
EXPOSE 8501

# Default environment variables for backend communication
# This can be overridden at runtime (e.g., to http://backend:8000 in docker-compose)
ENV MAILHARPOON_BACKEND_URL=http://localhost:8000

# Configure Streamlit to run in a containerized environment
ENV STREAMLIT_SERVER_PORT=8501
ENV STREAMLIT_SERVER_ADDRESS=0.0.0.0
ENV STREAMLIT_BROWSER_GATHER_USAGE_STATS=false

# Healthcheck to ensure the Streamlit service is responsive
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl --fail http://localhost:8501/_stcore/health || exit 1

# Start the Streamlit application
CMD ["streamlit", "run", "app.py"]
