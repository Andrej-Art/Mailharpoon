import dns.resolver
from cachetools import TTLCache
import logging

logger = logging.getLogger(__name__)

# Cache for DNS results: 10 minutes TTL, max 1000 entries
dns_cache = TTLCache(maxsize=1000, ttl=600)

from typing import Tuple, Dict, Any

def check_dns_record(domain: str) -> Tuple[int, Dict[str, Any]]:
    """
    Checks if a domain has valid DNS records (A, AAAA, CNAME, NS).
    Returns a tuple (status_code, metadata):
    -1 -> DNS records found (Legitimate)
    1  -> NXDOMAIN or no answer (Phishing)
    0  -> Timeout or temporary resolver error (Suspicious)
    """
    metadata = {
        "hostname": domain,
        "a_record": False,
        "aaaa_record": False,
        "cname_record": False,
        "ns_record": False,
        "resolution": "Failed"
    }

    if not domain:
        metadata["error"] = "Empty domain"
        return 1, metadata
        
    if domain in dns_cache:
        return dns_cache[domain]
    
    status = 1
    found_any = False

    try:
        # A
        try:
            dns.resolver.resolve(domain, 'A', timeout=2.0, lifetime=2.0)
            metadata["a_record"] = True
            found_any = True
        except (dns.resolver.NoAnswer, dns.resolver.NoNameservers): pass

        # AAAA
        try:
            dns.resolver.resolve(domain, 'AAAA', timeout=2.0, lifetime=2.0)
            metadata["aaaa_record"] = True
            found_any = True
        except (dns.resolver.NoAnswer, dns.resolver.NoNameservers): pass
        
        # CNAME
        try:
            answers = dns.resolver.resolve(domain, 'CNAME', timeout=2.0, lifetime=2.0)
            metadata["cname_record"] = True
            metadata["cname_target"] = str(answers[0].target)
            found_any = True
        except (dns.resolver.NoAnswer, dns.resolver.NoNameservers): pass

        # NS
        try:
            dns.resolver.resolve(domain, 'NS', timeout=2.0, lifetime=2.0)
            metadata["ns_record"] = True
            found_any = True
        except (dns.resolver.NoAnswer, dns.resolver.NoNameservers): pass

        if found_any:
            status = -1
            metadata["resolution"] = "Successful"
        else:
            status = 1
            metadata["error"] = "No standard web records found"

    except (dns.resolver.Timeout, dns.exception.Timeout):
        status = 0
        metadata["error"] = "Timeout"
    except dns.resolver.NXDOMAIN:
        status = 1
        metadata["error"] = "NXDOMAIN (Does not exist)"
    except Exception as e:
        status = 1
        logger.debug(f"DNS lookup failed for {domain}: {str(e)}")
        metadata["error"] = str(e)
        
    result = (status, metadata)
    if status != 0:
        dns_cache[domain] = result
    return result
