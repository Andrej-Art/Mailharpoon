import logging
import tldextract
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def get_registrable_domain(url: str) -> str:
    """Extracts the registrable domain from a URL."""
    ext = tldextract.extract(url)
    if not ext.suffix:
        return ext.domain
    return f"{ext.domain}.{ext.suffix}"

def is_domain_indexed(url: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Checks if a domain is indexed by Google.
    
    Currently implements a robust placeholder to avoid unreliable scraping.
    In a production environment, this should join with an official API 
    like Google Custom Search or SerpAPI.
    """
    domain = get_registrable_domain(url)
    
    # Placeholder Logic:
    # 1. We avoid direct scraping because it's unreliable and leads to blocks.
    # 2. If an API key is provided, we would call the search API.
    # 3. For now, we return 'Unknown' status unless it's a known major domain.
    
    major_domains = {"google.com", "github.com", "microsoft.com", "apple.com", "amazon.com", "facebook.com", "medium.com", "wikipedia.org"}
    
    is_indexed = False
    status = "Unknown"
    
    if domain in major_domains:
        is_indexed = True
        status = "Indexed"
    elif api_key:
        # Here we would implement the actual API call
        # e.g., requests.get(f"https://www.googleapis.com/customsearch/v1?key={api_key}&q=site:{domain}")
        status = "Lookup skip (API not implemented yet)"
    else:
        # Default behavior: we don't know without a reliable API
        status = "Unknown"

    # Risk Mapping:
    # -1: Indexed (Legitimate)
    #  0: Not Indexed or Unknown (Suspicious/Neutral)
    risk_score = -1 if is_indexed else 0

    return {
        "risk_score": risk_score,
        "is_indexed": is_indexed,
        "status": status,
        "domain_analyzed": domain,
        "technical_interpretation": f"Domain indexing status: {status}"
    }
