import os
import json
import joblib
import pandas as pd
import uvicorn
import re
from typing import List, Dict, Any
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel, Field

# --- configuration / absolute paths ---
MODEL_PATH = "/Users/andrejartuschenko/Desktop/mailharpoon/backend/models/rf_url_only/rf_url_final.joblib"
FEATURES_PATH = "/Users/andrejartuschenko/Desktop/mailharpoon/backend/models/rf_url_only/rf_url_features.json"
THRESHOLD_PATH = "/Users/andrejartuschenko/Desktop/mailharpoon/backend/models/rf_url_only/rf_url_only_threshold.json"

# --- internal constants ---
SHORTENER_LIST = ["bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly"]

# --- helper functions ---
def extract_features_from_url(url: str) -> dict:
    """
    extracts 8 features from a URL using string heuristics.
    no external lookups (dns/http) are performed.
    """
    # 1. normalization
    url = url.strip()
    if url.lower().startswith("www."):
        url = "http://" + url
    elif "://" not in url:
        url = "http://" + url
        
    parsed = urlparse(url)
    host = parsed.netloc.split(":")[0]  # host without port
    
    # helper for IPv4 check
    is_ip = 1 if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", host) else -1
    
    # 8 feature extraction
    features = {
        "having_ip_address": is_ip,
        "url_length": len(url),
        "shortining_service": 1 if any(s == host for s in SHORTENER_LIST) else -1,
        "having_at_symbol": 1 if "@" in url else -1,
        "double_slash_redirecting": 1 if "//" in url.split("://", 1)[-1] else -1,
        "prefix_suffix": 1 if "-" in host else -1,
        "having_sub_domain": 1 if host.count(".") > 1 else -1,
        "https_token": 1 if "https" in host.lower() else -1
    }
    return features

# --- api models ---
class PredictRequest(BaseModel):
    having_ip_address: int = Field(..., description="URL contains IP address (-1 = No, 1 = Yes)")
    url_length: int = Field(..., description="Total string length of URL")
    shortining_service: int = Field(..., description="Uses shortening service (-1 = No, 1 = Yes)")
    having_at_symbol: int = Field(..., description="Contains @ symbol (-1 = No, 1 = Yes)")
    double_slash_redirecting: int = Field(..., description="Contains // after scheme (-1 = No, 1 = Yes)")
    prefix_suffix: int = Field(..., description="Contains '-' in host (-1 = No, 1 = Yes)")
    having_sub_domain: int = Field(..., description="Contains multiple dots in host (-1 = No, 1 = Yes)")
    https_token: int = Field(..., description="Contains 'https' in host string (-1 = No, 1 = Yes)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "having_ip_address": -1,
                "url_length": 54,
                "shortining_service": -1,
                "having_at_symbol": -1,
                "double_slash_redirecting": -1,
                "prefix_suffix": 1,
                "having_sub_domain": -1,
                "https_token": -1
            }
        }
    }

class PredictUrlRequest(BaseModel):
    url: str = Field(..., example="https://phishing-site-example.com/login")

class PredictResponse(BaseModel):
    prediction: str
    phishing_probability: float
    legit_probability: float
    threshold: float
    features: Dict[str, Any]
    model_classes: List[int]

# --- FastAPI App ---
app = FastAPI(
    title="Mailharpoon URL Phishing API",
    description="Extended API with URL-based and feature-based detection.",
    version="1.1.0"
)

# --- global state ---
model = None
feature_columns = None
phishing_threshold = 0.5

@app.on_event("startup")
async def startup_event():
    global model, feature_columns, phishing_threshold

    # 1. load features
    if not os.path.exists(FEATURES_PATH):
        raise RuntimeError(f"Feature list meta-file not found: {FEATURES_PATH}")
    with open(FEATURES_PATH, "r") as f:
        feature_columns = json.load(f)
    if not isinstance(feature_columns, list) or not all(isinstance(c, str) for c in feature_columns):
        raise RuntimeError("Meta-file features.json must contain a list of strings.")

    # 2. load model
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"Model artifact not found: {MODEL_PATH}")
    model = joblib.load(MODEL_PATH)
    
    # class check according to request (-1 = phishing, 1 = legit)
    classes = set(model.classes_)
    if not (1 in classes and -1 in classes):
        # logging/note: checking for [0, 1] as backup if the user is using the 0-remapped model
        if not (1 in classes and 0 in classes):
             raise RuntimeError(f"Model classes {model.classes_} inconsistent with requirements (-1 and 1).")
        else:
             print(f"DEBUG: Model uses [0, 1] instead of [-1, 1]. Phishing will be mapped from 0.")

    # 3. load threshold
    if os.path.exists(THRESHOLD_PATH):
        with open(THRESHOLD_PATH, "r") as f:
            data = json.load(f)
            phishing_threshold = data.get("threshold", 0.5)

@app.get("/")
def welcome():
    return {"message": "Welcome to Mailharpoon Phishing API. Use /predict or /predict-url."}

@app.get("/health")
def health():
    if model is None:
        raise HTTPException(status_code=503, detail="Model initialization failed")
    return {"status": "ok"}

def run_inference(input_dict: dict) -> PredictResponse:
    # ensure exact feature order
    df = pd.DataFrame([input_dict])
    try:
        df = df[feature_columns]
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Input missing required features or extra fields present: {str(e)}")
    
    if df.shape[1] != len(input_dict):
        raise HTTPException(status_code=400, detail="Mismatch between input fields and required model features.")

    # calculate probabilities
    probs = model.predict_proba(df)[0]
    classes_list = list(model.classes_)
    
    # dynamic index lookup for requested classes
    # handling both -1/1 and 0/1 (phishing is -1 or 0)
    phish_label = -1 if -1 in classes_list else 0
    legit_label = 1
    
    try:
        phish_idx = classes_list.index(phish_label)
        legit_idx = classes_list.index(legit_label)
    except ValueError:
        raise HTTPException(status_code=500, detail="Model class mapping failed during inference.")
        
    phish_prob = float(probs[phish_idx])
    legit_prob = float(probs[legit_idx])
    
    # classification based on threshold
    prediction = "Malicious" if phish_prob >= phishing_threshold else "Legitimate"
    
    return PredictResponse(
        prediction=prediction,
        phishing_probability=phish_prob,
        legit_probability=legit_prob,
        threshold=phishing_threshold,
        features=input_dict,
        model_classes=classes_list
    )

@app.post("/predict", response_model=PredictResponse)
def predict(request_data: PredictRequest):
    return run_inference(request_data.model_dump())

@app.post("/predict-url", response_model=PredictResponse)
def predict_url(request_data: PredictUrlRequest):
    features = extract_features_from_url(request_data.url)
    return run_inference(features)

if __name__ == "__main__":
    uvicorn.run("src.main:app", host="127.0.0.1", port=8000, reload=True)
