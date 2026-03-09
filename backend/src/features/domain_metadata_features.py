import whois
from datetime import datetime, timezone
from cachetools import TTLCache
import tldextract
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

# Cache for WHOIS results: 24 hours TTL, max 1000 entries
whois_cache = TTLCache(maxsize=1000, ttl=86400)

def get_registrable_domain(url: str) -> str:
    """Extracts the registrable domain (e.g., example.co.uk) from a URL."""
    ext = tldextract.extract(url)
    if not ext.suffix:
        return ext.domain # handle cases like IP addresses or local hosts
    return f"{ext.domain}.{ext.suffix}"

def normalize_whois_date(date_val: Any) -> Optional[datetime]:
    """Handles various WHOIS date formats (list, string, datetime)."""
    if not date_val:
        return None
    
    # If it's a list, take the first element (usually the oldest or primary)
    if isinstance(date_val, list):
        date_val = date_val[0]
        
    if isinstance(date_val, datetime):
        if date_val.tzinfo is None:
            return date_val.replace(tzinfo=timezone.utc)
        return date_val
    
    if isinstance(date_val, str):
        try:
            # Common formats
            for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%Y-%m-%dT%H:%M:%SZ"):
                try:
                    dt = datetime.strptime(date_val.split(' ')[0], fmt)
                    return dt.replace(tzinfo=timezone.utc)
                except:
                    continue
        except:
            pass
            
    return None

def get_domain_dates(domain: str) -> Optional[Dict[str, Optional[datetime]]]:
    """Fetches creation and expiration dates from WHOIS."""
    if domain in whois_cache:
        return whois_cache[domain]
        
    try:
        w = whois.whois(domain)
        dates = {
            "creation_date": normalize_whois_date(w.get("creation_date")),
            "expiration_date": normalize_whois_date(w.get("expiration_date"))
        }
        whois_cache[domain] = dates
        return dates
    except Exception as e:
        logger.debug(f"WHOIS lookup failed for {domain}: {str(e)}")
        return None

def get_domain_age(domain: str) -> int:
    """
    Checks if domain age is >= 6 months.
    1  -> Age >= 6 months (Legitimate)
    -1 -> Age < 6 months (Phishing)
    0  -> Unknown / Lookup failed (Suspicious)
    """
    dates = get_domain_dates(domain)
    if not dates or not dates["creation_date"]:
        return 0
        
    age_delta = datetime.now(timezone.utc) - dates["creation_date"]
    months_old = age_delta.days / 30
    
    return 1 if months_old >= 6 else -1

def get_domain_registration_length(domain: str) -> int:
    """
    Checks if registration expires in >= 12 months.
    1  -> Expiration >= 12 months (Legitimate)
    -1 -> Expiration < 12 months (Phishing)
    0  -> Unknown / Lookup failed (Suspicious)
    """
    dates = get_domain_dates(domain)
    if not dates or not dates["expiration_date"]:
        return 0
        
    expire_delta = dates["expiration_date"] - datetime.now(timezone.utc)
    months_left = expire_delta.days / 30
    
    return 1 if months_left >= 12 else -1
