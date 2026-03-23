import os
import streamlit as st

def get_backend_url() -> str:
    """
    Centralized source of truth for the backend URL.
    1. Try BACKEND_URL from environment (OS level)
    2. Try BACKEND_URL from Streamlit secrets
    3. Fallback to local development (http://127.0.0.1:8000)
    """
    # 1. Environment Variable (Preferred for Docker/Render)
    url = os.getenv("BACKEND_URL")
    
    # 2. Streamlit Secrets (Optional fallback)
    if not url:
        try:
            url = st.secrets.get("BACKEND_URL")
        except Exception:
            pass
            
    # 3. Local Default
    if not url:
        url = "http://127.0.0.1:8000"
        
    return url.rstrip("/")

# Global constants derived from the single source of truth
BASE_BACKEND_URL = get_backend_url()
API_URL = f"{BASE_BACKEND_URL}/predict-url"
HEALTH_URL = f"{BASE_BACKEND_URL}/health"
