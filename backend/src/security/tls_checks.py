import ssl
import socket
import ipaddress
import logging
from urllib.parse import urlparse
from typing import Optional

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

def check_ssl_certificate(url: str) -> int:
    """
    Checks the TLS certificate of a domain and returns:
    -1 -> HTTPS present and TLS certificate valid (Legitimate)
    1  -> HTTPS present but certificate error / connection issue (Phishing)
    1  -> URL does not use HTTPS (Phishing)
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme.lower() != "https":
            return 1
        
        host = parsed.hostname
        if not host:
            return 1
            
        port = parsed.port or 443

        # 1. SSRF Protection: Resolve and check IPs before connection
        try:
            addr_info = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
            # Check all resolved IPs
            for info in addr_info:
                ip_addr = info[4][0]
                if not is_public_ip(ip_addr):
                    logger.debug(f"SSRF Protection: Blocked private IP {ip_addr} for {host}")
                    return 1
        except socket.gaierror:
            logger.debug(f"DNS resolution failed for {host}")
            return 1

        # 2. TLS Handshake with Certificate Validation
        context = ssl.create_default_context()
        
        # Connection with short timeout
        with socket.create_connection((host, port), timeout=3) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                if cert:
                    return -1
                else:
                    return 1

    except ssl.SSLError as e:
        logger.debug(f"SSL validation failed for {url}: {str(e)}")
        return 1
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        logger.debug(f"Connection failed for {url}: {str(e)}")
        return 1
    except Exception as e:
        logger.debug(f"Unexpected error during SSL check for {url}: {str(e)}")
        return 1
