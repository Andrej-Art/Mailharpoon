import ssl
import socket
import ipaddress
import logging
from urllib.parse import urlparse
from typing import Optional, Tuple, Dict, Any

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def is_public_ip(ip_str: str) -> bool:
    """Checks if an IP address is public (not private, loopback, or reserved)."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return not (ip.is_private or ip.is_loopback or ip.is_link_local or 
                    ip.is_reserved or ip.is_multicast)
    except ValueError:
        return False

def check_ssl_certificate(url: str) -> Tuple[int, Dict[str, Any]]:
    """
    Checks the TLS certificate of a domain and returns:
    -1 -> HTTPS present and TLS certificate valid (Legitimate)
    1  -> HTTPS present but certificate error / connection issue (Phishing)
    1  -> URL does not use HTTPS (Phishing)
    
    Returns: (status, cert_metadata)
    """
    metadata = {
        "issuer": None,
        "expiry": None,
        "protocol": None,
        "error": None
    }
    
    try:
        parsed = urlparse(url)
        if parsed.scheme.lower() != "https":
            metadata["error"] = "No HTTPS scheme"
            return 1, metadata
        
        host = parsed.hostname
        if not host:
            metadata["error"] = "Invalid hostname"
            return 1, metadata
            
        port = parsed.port or 443

        # 1. SSRF Protection: Resolve and check IPs before connection
        try:
            addr_info = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
            # Check all resolved IPs
            for info in addr_info:
                ip_addr = info[4][0]
                if not is_public_ip(ip_addr):
                    logger.debug(f"SSRF Protection: Blocked private IP {ip_addr} for {host}")
                    metadata["error"] = "Private IP blocked (SSRF)"
                    return 1, metadata
        except socket.gaierror:
            logger.debug(f"DNS resolution failed for {host}")
            metadata["error"] = "DNS resolution failed"
            return 1, metadata

        # 2. TLS Handshake with Certificate Validation
        context = ssl.create_default_context()
        
        # Connection with short timeout
        with socket.create_connection((host, port), timeout=3.0) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                cipher = ssock.cipher()
                metadata["protocol"] = ssock.version()
                
                if cert:
                    # Extract Issuer (usually a list of tuples)
                    issuer = dict(x[0] for x in cert.get('issuer', []))
                    metadata["issuer"] = issuer.get('commonName') or issuer.get('organizationName')
                    metadata["expiry"] = cert.get('notAfter')
                    return -1, metadata
                else:
                    metadata["error"] = "No certificate received"
                    return 1, metadata

    except ssl.SSLError as e:
        logger.debug(f"SSL validation failed for {url}: {str(e)}")
        metadata["error"] = f"SSL Error: {str(e)}"
        return 1, metadata
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        logger.debug(f"Connection failed for {url}: {str(e)}")
        metadata["error"] = f"Connection Error: {str(e)}"
        return 1, metadata
    except Exception as e:
        logger.debug(f"Unexpected error during SSL check for {url}: {str(e)}")
        metadata["error"] = str(e)
        return 1, metadata
