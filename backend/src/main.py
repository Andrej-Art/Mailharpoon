import os
import json
import joblib
import pandas as pd
import uvicorn
import re
import ipaddress
import tldextract
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from http_features import safe_fetch_html, extract_features_from_html, get_ip_geolocation
from security.tls_checks import check_ssl_certificate
from security.screenshot_service import capture_screenshot, cleanup_screenshots
from features.dns_features import check_dns_record
from features.domain_metadata_features import (
    get_domain_age, 
    get_domain_registration_length, 
    get_registrable_domain,
    get_domain_dates
)
from features.google_index_features import is_domain_indexed
from features.reputation_features import check_domain_reputation

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
def detect_ip_type(host: str) -> Tuple[int, str]:
    """
    Detects if a host is an IP address (IPv4, IPv6, Hex, or Integer).
    Returns (result, type_label) where result is 1 (IP) or -1 (Domain).
    """
    if not host:
        return -1, "Empty"
        
    # Remove IPv6 brackets for parsing
    clean_host = host.strip("[]")
    
    # 1. Standard IP parsing
    try:
        ip = ipaddress.ip_address(clean_host)
        label = "Direct IPv6 address" if isinstance(ip, ipaddress.IPv6Address) else "Direct IPv4 address"
        return 1, label
    except ValueError:
        pass
        
    # 2. Check for numeric/hexadecimal formats (often used in phishing)
    # Hex: 0x...
    if host.lower().startswith("0x"):
        try:
            val = int(host, 16)
            if 0 <= val <= 0xFFFFFFFF: # 32-bit range for IPv4
                return 1, "Obfuscated IP (Hexadecimal)"
        except ValueError:
            pass
            
    # Integer: All digits
    if host.isdigit():
        try:
            val = int(host)
            if 0 <= val <= 0xFFFFFFFF:
                return 1, "Obfuscated IP (Integer)"
        except ValueError:
            pass
            
    return -1, "Registered domain"

def analyze_subdomains(url: str) -> dict:
    """
    Accurately extracts subdomain depth and metadata using Public Suffix List.
    """
    try:
        extracted = tldextract.extract(url)
        subdomains_str = extracted.subdomain
        
        # Split but ignore empty strings (if no subdomains exist)
        subdomain_list = [sub for sub in subdomains_str.split('.') if sub]
        
        return {
            "hostname": extracted.fqdn,
            "domain": extracted.domain,
            "suffix": extracted.suffix,
            "subdomains": subdomain_list,
            "subdomain_count": len(subdomain_list)
        }
    except Exception:
        return {
            "hostname": url,
            "domain": "",
            "suffix": "",
            "subdomains": [],
            "subdomain_count": 0
        }

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
    
    # helper for IP check
    is_ip, ip_label = detect_ip_type(host)
    
    # Accurate Subdomain check via tldextract
    sub_meta = analyze_subdomains(url)
    dots = sub_meta["subdomain_count"]
    
    # Risk Heuristic: 0-1 safe (-1), 2-3 moderate (0), >3 suspicious (1)
    if dots <= 1: sub_domain = -1
    elif dots <= 3: sub_domain = 0
    else: sub_domain = 1

    features = {
        "having_ip_address": is_ip,
        "url_length": len(url),
        "shortining_service": 1 if any(s == host for s in SHORTENER_LIST) else -1,
        # @ is only phishing-relevant when it appears in the authority/userinfo section
        # (e.g. http://paypal.com@evil.com), NOT in path/query/fragment (e.g. medium.com/@user)
        "having_at_symbol": 1 if parsed.username is not None or (
            "@" in parsed.netloc
        ) else -1,
        "double_slash_redirecting": 0 if "//" in url.split("://", 1)[-1] else -1,
        # Port check: non-standard ports (not 80/443/None)
        "port": 0 if parsed.port and parsed.port not in [80, 443] else -1,
        "having_sub_domain": sub_domain,
        "https_token": 0 if "https" in host.lower() else -1
    }
    
    # Prefix/Suffix check using accurate sub_meta
    has_hyphen_domain = "-" in sub_meta["domain"]
    has_hyphen_subdomain = any("-" in sub for sub in sub_meta["subdomains"])
    
    suspicious_kw = ["paypal", "microsoft", "apple", "amazon", "login", "verify", "secure", "update", "account", "billing"]
    tokens = []
    
    if has_hyphen_domain:
        tokens.extend(sub_meta["domain"].split("-"))
    for sub in sub_meta["subdomains"]:
        if "-" in sub:
            tokens.extend(sub.split("-"))
            
    # Filter empty tokens
    tokens = [t.lower() for t in tokens if t]
    has_suspicious_token = any(kw in tokens for kw in suspicious_kw)
    
    if len(tokens) == 0:
        pref_suf = -1
    elif has_suspicious_token:
        pref_suf = 1
    else:
        pref_suf = 0
        
    features["prefix_suffix"] = pref_suf
    
    return features

def detect_infrastructure(geo_data: Dict[str, Any]) -> str:
    """
    Identifies if the IP belongs to a known CDN or Cloud provider.
    """
    if geo_data.get("status") != "success":
        return "Unknown"
        
    org = geo_data.get("org", "").lower()
    isp = geo_data.get("isp", "").lower()
    as_info = geo_data.get("as", "").lower()
    
    infra_map = {
        "cloudflare": "Cloudflare CDN Edge Node",
        "fastly": "Fastly CDN Edge Node",
        "akamai": "Akamai CDN Edge Node",
        "cloudfront": "Amazon CloudFront CDN",
        "amazon.com": "AWS Infrastructure",
        "google": "Google Cloud / CDN",
        "microsoft": "Azure CDN / Microsoft",
        "edgecast": "EdgeCast CDN",
        "limelight": "Limelight CDN",
        "incapsula": "Imperva/Incapsula CDN"
    }
    
    combined = f"{org} {isp} {as_info}"
    for key, label in infra_map.items():
        if key in combined:
            return label
            
    return "Origin Server"

def extract_features_rf_full(url: str, extended: bool = False) -> Tuple[Dict[str, int], Dict[str, Any], Dict[str, Any]]:
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
    
    # Extract registrable domain for DNS/WHOIS lookups
    reg_domain = get_registrable_domain(url)
    
    # Get DNS status and metadata (use full host, not reg_domain)
    dns_status, dns_metadata = check_dns_record(host) if extended else (1, {})

    # Initialize all 30 features
    full_features = {
        "having_ip_address": base["having_ip_address"],
        "url_length": base["url_length"],
        "shortining_service": base["shortining_service"],
        "having_at_symbol": base["having_at_symbol"],
        "double_slash_redirecting": base["double_slash_redirecting"],
        "prefix_suffix": base["prefix_suffix"],
        "having_sub_domain": base["having_sub_domain"],
        "sslfinal_state": 1, # Default phishing if not checked
        "domain_registeration_length": get_domain_registration_length(reg_domain) if extended else 1,
        "favicon": 0, 
        "port": base["port"],
        "https_token": base["https_token"],
        "request_url": 0, 
        "url_of_anchor": 0,
        "links_in_tags": 0,
        "sfh": -1,
        "submitting_to_email": -1,
        "abnormal_url": -1, # Will be refined below if extended=True
        "redirect": 0, 
        "on_mouseover": -1,
        "rightclick": -1,
        "popupwidnow": -1,
        "iframe": -1,
        "age_of_domain": get_domain_age(reg_domain) if extended else 1,
        "dnsrecord": dns_status,
        "web_traffic": 0,
        "page_rank": 0,
        "google_index": 0, # Placeholder, will be refined if extended=True
        "links_pointing_to_page": 0,
        "statistical_report": 0, # Placeholder, will be refined if extended=True
    }
    
    # Metadata for technical insights
    metadata = {
        "url_length": len(url),
        "hostname": host,
        "is_ip": base["having_ip_address"] == 1,
        "shortener": base["shortining_service"] == 1,
        "at_symbol": base["having_at_symbol"] == 1,
        "at_symbol_metadata": {
            "in_netloc": "@" in parsed.netloc,
            "username_present": parsed.username is not None,
            "in_path": "@" in parsed.path,
            "in_query": "@" in (parsed.query or ""),
            "in_fragment": "@" in (parsed.fragment or ""),
        },
        "subdomain_count": parsed.netloc.count('.') - 1,
        "subdomains": parsed.netloc.split('.')[:-2],
        "prefix_suffix": base["prefix_suffix"],
        "dns_metadata": dns_metadata,
        "page_rank_metadata": {
            "domain": reg_domain,
            "is_available": False,
            "note": "No external domain popularity or authority source is configured."
        },
        "ip_metadata": {
            "hostname": host,
            "pattern": detect_ip_type(host)[1] if base["having_ip_address"] == 1 else "Registered domain",
            "result": "Yes" if base["having_ip_address"] == 1 else "No"
        },
        "double_slash_metadata": {
            "has_extra_double_slash": "//" in url.split("://", 1)[-1]
        },
        "prefix_suffix_metadata": {
            "has_hyphen_domain": "-" in analyze_subdomains(url)["domain"],
            "has_hyphen_subdomain": any("-" in sub for sub in analyze_subdomains(url)["subdomains"]),
            "tokens": [t for part in analyze_subdomains(url)["subdomains"] + [analyze_subdomains(url)["domain"]] if "-" in part for t in part.split("-")]
        },
        "port_metadata": {
            "scheme": parsed.scheme or "http",
            "is_explicit": parsed.port is not None,
            "detected_port": parsed.port if parsed.port is not None else (443 if (parsed.scheme or "").lower() == "https" else 80)
        },
        "https_token_metadata": {
            "has_token": "https" in host.lower(),
            "in_domain": "https" in analyze_subdomains(url)["domain"].lower(),
            "in_subdomain": any("https" in sub.lower() for sub in analyze_subdomains(url)["subdomains"])
        },
        "sub_meta": analyze_subdomains(url),
        "domain_age_days": None,
        "registration_length_days": None
    }

    fetch_info = {}
    if extended:
        # Check SSL and capture metadata
        ssl_status, ssl_meta = check_ssl_certificate(url)
        full_features["sslfinal_state"] = ssl_status
        metadata["ssl_metadata"] = ssl_meta

        # Fetch age/registration details for metadata
        dates = get_domain_dates(reg_domain)
        if dates:
            if dates["creation_date"]:
                metadata["domain_age_days"] = (datetime.now(timezone.utc) - dates["creation_date"]).days
            if dates["expiration_date"]:
                metadata["registration_length_days"] = (dates["expiration_date"] - datetime.now(timezone.utc)).days

        fetch_result = safe_fetch_html(url)
        resolved_ip = fetch_result["resolved_ip"]
        geo = get_ip_geolocation(resolved_ip) if resolved_ip else None
        
        fetch_info = {
            "allowed": fetch_result["allowed"],
            "status_code": fetch_result["status_code"],
            "redirect_count": fetch_result["redirect_count"],
            "redirect_chain": fetch_result.get("redirect_chain", []),
            "final_url": fetch_result["final_url"],
            "resolved_ip": resolved_ip,
            "infrastructure": detect_infrastructure(geo) if geo else "Unknown",
            "ip_info": geo,
            "error": fetch_result["error"]
        }
        
        if fetch_result["allowed"]:
            # Extract real Phase 1 features + metadata
            html_feats, html_meta = extract_features_from_html(fetch_result["html"], url, fetch_result["final_url"])
            full_features.update(html_feats)
            metadata.update(html_meta)
            
            # Map redirect_count to feature
            # Correct logic: fewer redirects = more normal for well-configured sites
            # 0-1 → Legitimate (-1), 2 → Neutral (0), 3+ → Suspicious/Phishing (1)
            rc = fetch_result["redirect_count"]
            if rc <= 1: full_features["redirect"] = -1
            elif rc == 2: full_features["redirect"] = 0
            else: full_features["redirect"] = 1

            # Check Google Index Status
            g_index = is_domain_indexed(url)
            full_features["google_index"] = g_index["risk_score"]
            metadata["google_index_metadata"] = g_index

            # Check Domain Reputation (Statistical Report)
            reputation = check_domain_reputation(url)
            full_features["statistical_report"] = reputation["risk_score"]
            metadata["reputation_metadata"] = reputation
        else:
            # If fetch failed, use suspicious defaults for some features
            full_features["redirect"] = -1
            metadata["request_url_available"] = False
            metadata["url_of_anchor_available"] = False
            
        # Abnormal URL: Inconsistency between Hostname and Infrastructure
        # (Legit: Host matches SSL cert OR is on a major CDN)
        is_consistent = True
        host_lower = host.lower()
        
        # Check SSL Consistency
        ssl_meta = metadata.get("ssl_metadata", {})
        if ssl_meta and ssl_meta.get("subject_cn"):
            cn = ssl_meta["subject_cn"].lower()
            sans = [s.lower() for s in ssl_meta.get("sans", [])]
            
            def match_host(pattern, hostname):
                if pattern == hostname: return True
                if pattern.startswith("*."):
                    suffix = pattern[1:]
                    if hostname.endswith(suffix) and "." in hostname[:-len(suffix)]:
                        return True
                return False

            ssl_match = match_host(cn, host_lower) or any(match_host(s, host_lower) for s in sans)
            if not ssl_match:
                is_consistent = False

        # If it's a known CDN or Major Cloud, we treat it as consistent even if SSL cert is generic/different
        infra = fetch_info.get("infrastructure", "Unknown")
        if "CDN" in infra or "AWS" in infra or "Google Cloud" in infra or "Azure" in infra:
            is_consistent = True
            
        # Result mapping
        # If mismatch detected (and not CDN), mark as Phishing
        full_features["abnormal_url"] = 1 if not is_consistent else -1
        
        metadata["abnormal_url_metadata"] = {
            "is_consistent": is_consistent,
            "detected_infrastructure": infra,
            "resolved_ip": fetch_info.get("resolved_ip"),
            "ssl_host_match": True if (ssl_meta and ssl_meta.get("subject_cn") and is_consistent) else False
        }

        # DNS Consistency Check
        if fetch_info.get("resolved_ip") and full_features["dnsrecord"] == 1:
            # If we successfully resolved an IP, DNS cannot be missing. Override it.
            full_features["dnsrecord"] = -1
            if "dns_metadata" in metadata:
                metadata["dns_metadata"]["resolution"] = "Successful (Overridden by resolved IP)"
                metadata["dns_metadata"]["error"] = ""
                # We don't know the exact record type that succeeded (maybe host file / custom DNS),
                # but we know it resolved. We assume A/AAAA for the sake of the report.
                if not metadata["dns_metadata"].get("a_record") and not metadata["dns_metadata"].get("aaaa_record"):
                     metadata["dns_metadata"]["a_record"] = True
                     metadata["dns_metadata"]["note"] = "Detected via active HTTP connection"

    return full_features, metadata, fetch_info

# api models 
class PredictUrlRequest(BaseModel):
    url: str = Field(..., example="https://phishing-site-example.com/login")
    model: str = Field("rf_full", description="Model to use: 'url_only' or 'rf_full'")
    extended: bool = Field(True, description="Whether to perform extended checks (DNS/HTTP)")

class PredictResponse(BaseModel):
    prediction: str
    phishing_probability: float
    legit_probability: float
    threshold: float
    features: Dict[str, Any]
    feature_metadata: Optional[Dict[str, Any]] = None
    model_classes: List[int]
    model_used: str
    fetch_info: Optional[Dict[str, Any]] = None

# FastAPI App 
app = FastAPI(
    title="Mailharpoon URL Phishing API",
    description="Extended API supporting multiple models.",
    version="1.2.0"
)

# Static files for screenshots
app.mount("/images/screenshots", StaticFiles(directory="/tmp/mailharpoon_screenshots"), name="screenshots")

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
    # Cleanup old screenshots
    cleanup_screenshots()
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
async def predict_url(request_data: PredictUrlRequest):
    model_name = request_data.model
    if model_name not in models:
        raise HTTPException(status_code=400, detail=f"Model '{model_name}' not available.")
    
    # Step 1: Feature Extraction
    features = None
    feature_metadata = None
    fetch_info = None
    
    if model_name == "rf_full":
        features, feature_metadata, fetch_info = extract_features_rf_full(request_data.url, request_data.extended)
        
        # Capture Screenshot only for extended full check
        if request_data.extended:
            screenshot_meta = await capture_screenshot(request_data.url)
            feature_metadata["screenshot_metadata"] = screenshot_meta
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
        feature_metadata=feature_metadata,
        model_classes=classes_list,
        model_used=model_name,
        fetch_info=fetch_info
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

