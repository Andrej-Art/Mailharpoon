import os
from pathlib import Path

# --- Path Centralization ---

# backend/src/config.py -> backend/src
BACKEND_SRC_DIR = Path(__file__).resolve().parent

# backend/src -> backend
BACKEND_DIR = BACKEND_SRC_DIR.parent

# backend -> project root
PROJECT_ROOT = BACKEND_DIR.parent

# Models Directory
# Default: backend/models
DEFAULT_MODELS_DIR = BACKEND_DIR / "models"
MODELS_DIR = Path(os.getenv("MAILHARPOON_MODELS_DIR", str(DEFAULT_MODELS_DIR)))

# Screenshot Directory
# Default: /tmp/mailharpoon_screenshots (Standard for many linux/docker envs)
DEFAULT_SCREENSHOT_DIR = Path("/tmp/mailharpoon_screenshots")
SCREENSHOT_DIR = Path(os.getenv("MAILHARPOON_SCREENSHOT_DIR", str(DEFAULT_SCREENSHOT_DIR)))

# --- API Configuration ---

# Host and Port for uvicorn
API_HOST = os.getenv("MAILHARPOON_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("MAILHARPOON_API_PORT", "8000"))

# Backend URL for CORS or Frontend reference (if needed on backend)
# Default to localhost for ease of use
BACKEND_URL = os.getenv("MAILHARPOON_BACKEND_URL", f"http://127.0.0.1:{API_PORT}")

def get_model_config(name: str) -> dict:
    """
    Returns the path configuration for a specific model.
    """
    if name == "url_only":
        base = MODELS_DIR / "rf_url_only"
        return {
            "model_path": base / "rf_url_final.joblib",
            "features_path": base / "rf_url_features.json",
            "threshold_path": base / "rf_url_only_threshold.json"
        }
    elif name == "rf_full":
        return {
            "model_path": MODELS_DIR / "rf_full_final.joblib",
            "features_path": MODELS_DIR / "rf_full_features.json",
            "threshold_path": MODELS_DIR / "rf_threshold.json"
        }
    return {}
