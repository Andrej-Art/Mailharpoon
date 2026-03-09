import dns.resolver
from cachetools import TTLCache
import logging

logger = logging.getLogger(__name__)

# Cache for DNS results: 10 minutes TTL, max 1000 entries
dns_cache = TTLCache(maxsize=1000, ttl=600)

def check_dns_record(domain: str) -> int:
    """
    Checks if a domain has valid A or AAAA records.
    Returns:
    1  -> DNS records found (Legitimate)
    -1 -> NXDOMAIN or no answer (Phishing)
    0  -> Timeout or temporary resolver error (Suspicious)
    """
    if not domain:
        return -1
        
    if domain in dns_cache:
        return dns_cache[domain]
    
    resolver = dns.resolver.Resolver()
    resolver.timeout = 2.0
    resolver.lifetime = 2.0
    
    try:
        # Check for A or AAAA records
        try:
            resolver.resolve(domain, 'A')
            dns_cache[domain] = 1
            return 1
        except (dns.resolver.NoAnswer, dns.resolver.NoNameservers):
            try:
                resolver.resolve(domain, 'AAAA')
                dns_cache[domain] = 1
                return 1
            except:
                pass
        
        dns_cache[domain] = -1
        return -1
        
    except dns.resolver.NXDOMAIN:
        dns_cache[domain] = -1
        return -1
    except (dns.resolver.Timeout, dns.exception.Timeout):
        # We don't cache timeouts to allow retry
        return 0
    except Exception as e:
        logger.debug(f"DNS lookup failed for {domain}: {str(e)}")
        return 0
