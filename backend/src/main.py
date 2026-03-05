import os
import json
import joblib
import pandas as pd
import uvicorn
import re
from typing import List, Dict, Any, Tuple, Optional
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel, Field
from http_features import safe_fetch_html, extract_features_from_html

# configuration 
MODELS_BASE = "/Users/andrejartuschenko/Desktop/mailharpoon/backend/models"

# URL Only Model
URL_ONLY_CONFIG = {
    "model_path": f"{MODELS_BASE}/rf_url_only/rf_url_final.joblib",
    "features_path": f"{MODELS_BASE}/rf_url_only/rf_url_features.json",
    "threshold_path": f"{MODELS_BASE}/rf_url_only/rf_url_only_threshold.json"
}

# Full Model
RF_FULL_CONFIG = {
    "model_path": f"{MODELS_BASE}/rf_full_final.joblib",
    "features_path": f"{MODELS_BASE}/rf_full_features.json",
    "threshold_path": f"{MODELS_BASE}/rf_threshold.json"
}

#internal constants for url shortner
SHORTENER_LIST = ["bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly"]

# helper functions 
def extract_features_url_only(url: str) -> dict:
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

def extract_features_rf_full(url: str, extended: bool = False) -> Tuple[dict, dict]:
    """
    Extracts 30 features for rf_full.
    Current version uses Phase 1 real features if extended=True.
    """
    # Base features from URL-only
    base = extract_features_url_only(url)
    
    # Normalization for further parsing
    url = url.strip()
    parsed = urlparse(url)
    host = parsed.netloc.split(":")[0]
    
    # Initialize all 30 features
    full_features = {
        "having_ip_address": base["having_ip_address"],
        "url_length": base["url_length"],
        "shortining_service": base["shortining_service"],
        "having_at_symbol": base["having_at_symbol"],
        "double_slash_redirecting": base["double_slash_redirecting"],
        "prefix_suffix": base["prefix_suffix"],
        "having_sub_domain": base["having_sub_domain"],
        "sslfinal_state": 1 if url.startswith("https") else -1,
        "domain_registeration_length": -1, # WHOIS
        "favicon": -1, 
        "port": 1 if ":" in parsed.netloc else -1,
        "https_token": base["https_token"],
        "request_url": -1, 
        "url_of_anchor": -1,
        "links_in_tags": -1,
        "sfh": -1,
        "submitting_to_email": 1 if "mailto:" in url.lower() else -1,
        "abnormal_url": -1,
        "redirect": 0, 
        "on_mouseover": -1,
        "rightclick": -1,
        "popupwidnow": -1,
        "iframe": -1,
        "age_of_domain": -1, # WHOIS
        "dnsrecord": -1, # DNS
        "web_traffic": 0,
        "page_rank": -1,
        "google_index": -1,
        "links_pointing_to_page": 0,
        "statistical_report": -1
    }
    
    # URL Length heuristic
    if len(url) < 54: full_features["url_length"] = -1
    elif len(url) <= 75: full_features["url_length"] = 0
    else: full_features["url_length"] = 1

    fetch_info = {}
    if extended:
        fetch_result = safe_fetch_html(url)
        fetch_info = {
            "allowed": fetch_result["allowed"],
            "status_code": fetch_result["status_code"],
            "redirect_count": fetch_result["redirect_count"],
            "final_url": fetch_result["final_url"],
            "error": fetch_result["error"]
        }
        
        if fetch_result["allowed"]:
            # Extract real Phase 1 features
            html_feats = extract_features_from_html(fetch_result["html"], url, fetch_result["final_url"])
            full_features.update(html_feats)
            
            # Map redirect_count to feature
            if fetch_result["redirect_count"] == 0: full_features["redirect"] = 1
            elif fetch_result["redirect_count"] == 1: full_features["redirect"] = 0
            else: full_features["redirect"] = -1
        else:
            # If fetch failed, use suspicious defaults for some features
            full_features["redirect"] = -1

    return full_features, fetch_info

# api models 
class PredictUrlRequest(BaseModel):
    url: str = Field(..., example="https://phishing-site-example.com/login")
    model: str = Field("url_only", description="Model to use: 'url_only' or 'rf_full'")
    extended: bool = Field(False, description="Whether to perform extended checks (DNS/HTTP)")

class PredictResponse(BaseModel):
    prediction: str
    phishing_probability: float
    legit_probability: float
    threshold: float
    features: Dict[str, Any]
    model_classes: List[int]
    model_used: str
    fetch_info: Optional[Dict[str, Any]] = None

# FastAPI App 
app = FastAPI(
    title="Mailharpoon URL Phishing API",
    description="Extended API supporting multiple models.",
    version="1.2.0"
)

# global state 
models = {}
feature_sets = {}
thresholds = {}

def load_model_assets(name: str, config: dict):
    model_path = config["model_path"]
    features_path = config["features_path"]
    threshold_path = config["threshold_path"]
    
    # 1. load features
    if not os.path.exists(features_path):
        print(f"ERROR: Feature list meta-file not found: {features_path}")
        return False
    with open(features_path, "r") as f:
        feature_sets[name] = json.load(f)
    
    # 2. load model
    if not os.path.exists(model_path):
        print(f"ERROR: Model artifact not found: {model_path}")
        return False
    models[name] = joblib.load(model_path)
    
    # 3. load threshold
    thresholds[name] = 0.5
    if os.path.exists(threshold_path):
        with open(threshold_path, "r") as f:
            data = json.load(f)
            thresholds[name] = data.get("threshold", 0.5)
    
    print(f"Successfully loaded model assets for '{name}'")
    return True

@app.on_event("startup")
async def startup_event():
    load_model_assets("url_only", URL_ONLY_CONFIG)
    load_model_assets("rf_full", RF_FULL_CONFIG)

@app.get("/")
def welcome():
    return {"message": "Welcome to Mailharpoon Phishing API. Use /predict-url."}

@app.get("/health")
def health():
    if not models:
        raise HTTPException(status_code=503, detail="No models loaded")
    return {"status": "ok", "loaded_models": list(models.keys())}

@app.post("/predict-url", response_model=PredictResponse)
def predict_url(request_data: PredictUrlRequest):
    model_name = request_data.model
    if model_name not in models:
        raise HTTPException(status_code=400, detail=f"Model '{model_name}' not available.")
    
    # Step 1: Feature Extraction
    fetch_info = None
    if model_name == "rf_full":
        features, fetch_info = extract_features_rf_full(request_data.url, request_data.extended)
    else:
        features = extract_features_url_only(request_data.url)
    
    # Step 2: Inference
    model = models[model_name]
    feature_columns = feature_sets[model_name]
    threshold = thresholds[model_name]
    
    df = pd.DataFrame([features])
    try:
        df = df[feature_columns]
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"Extracted features missing columns for '{model_name}': {str(e)}")
    
    probs = model.predict_proba(df)[0]
    classes_list = list(model.classes_)
    
    # Handling both -1/1 and 0/1 classifications
    phish_label = -1 if -1 in classes_list else 0
    legit_label = 1
    
    try:
        phish_idx = classes_list.index(phish_label)
        legit_idx = classes_list.index(legit_label)
    except ValueError:
        raise HTTPException(status_code=500, detail=f"Class mapping failed for model '{model_name}'.")
        
    phish_prob = float(probs[phish_idx])
    legit_prob = float(probs[legit_idx])
    
    prediction = "Malicious" if phish_prob >= threshold else "Legitimate"
    
    return PredictResponse(
        prediction=prediction,
        phishing_probability=phish_prob,
        legit_probability=legit_prob,
        threshold=threshold,
        features=features,
        model_classes=classes_list,
        model_used=model_name,
        fetch_info=fetch_info
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

