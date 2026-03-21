import os
import streamlit as st

# Centralized Backend Configuration
# 1. Try BACKEND_URL from environment (OS level)
# 2. Try BACKEND_URL from Streamlit secrets
# 3. Fallback to local development
BACKEND_URL = os.getenv("BACKEND_URL")

if not BACKEND_URL:
    try:
        BACKEND_URL = st.secrets.get("BACKEND_URL")
    except Exception:
        pass

if not BACKEND_URL:
    BACKEND_URL = "http://127.0.0.1:8000"

# Clean URL (remove trailing slash)
BASE_BACKEND_URL = BACKEND_URL.rstrip("/")

# Specific API Endpoints
API_URL = f"{BASE_BACKEND_URL}/predict-url"
HEALTH_URL = f"{BASE_BACKEND_URL}/health"
