import requests
import logging
import tldextract
from typing import Dict, Any, Optional, List
from cachetools import TTLCache

logger = logging.getLogger(__name__)

# URLHaus API Endpoint
URLHAUS_API_URL = "https://urlhaus-api.abuse.ch/v1/host/"

# Cache for reputation results: 12 hours TTL, max 1000 entries
reputation_cache = TTLCache(maxsize=1000, ttl=43200)

def get_registrable_domain(url: str) -> str:
    """Extracts the registrable domain from a URL."""
    ext = tldextract.extract(url)
    if not ext.suffix:
        return ext.domain
    return f"{ext.domain}.{ext.suffix}"

def check_domain_reputation(url: str) -> Dict[str, Any]:
    """
    Checks the reputation of a domain using URLHaus.
    Returns structured results and a risk mapping.
    """
    domain = get_registrable_domain(url)
    
    if domain in reputation_cache:
        return reputation_cache[domain]

    results = {
        "domain_analyzed": domain,
        "urlhaus_match": False,
        "urlhaus_detections": 0,
        "status": "Clean",
        "risk_score": -1, # Default Low Risk
        "sources": []
    }

    try:
        # URLHaus API call
        # Documentation: https://urlhaus-api.abuse.ch/#host
        response = requests.post(URLHAUS_API_URL, data={'host': domain}, timeout=3.0)
        
        if response.status_code == 200:
            data = response.json()
            query_status = data.get("query_status")
            
            if query_status == "ok":
                results["urlhaus_match"] = True
                # Count URLs currently online/blacklisted
                urls = data.get("urls", [])
                results["urlhaus_detections"] = len(urls)
                results["status"] = "Suspicious"
                results["sources"].append("URLHaus")
                
                # Risk Mapping:
                # 0 (Moderate) if 1 detection, 1 (High) if multiple
                results["risk_score"] = 1 if len(urls) > 1 else 0
            elif query_status == "no_results":
                results["status"] = "Clean"
                results["risk_score"] = -1
            else:
                results["status"] = "Unknown"
        else:
            results["status"] = "Service Unavailable"

    except Exception as e:
        logger.error(f"Reputation check failed for {domain}: {str(e)}")
        results["status"] = "Error"
    
    # Cache and return
    reputation_cache[domain] = results
    return results
