import requests
import socket
import ipaddress
import re
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional, Tuple

# SSRF & Request Constants
MAX_RESPONSE_SIZE = 500 * 1024  # 500 KB
CONNECT_TIMEOUT = 2.0
READ_TIMEOUT = 5.0
MAX_REDIRECTS = 3
USER_AGENT = "MailharpoonPhishingDetector/1.0"

def is_public_ip(ip_str: str) -> bool:
    """Checks if an IP address is public (not private, loopback, or reserved)."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return not (ip.is_private or ip.is_loopback or ip.is_link_local or 
                    ip.is_reserved or ip.is_multicast)
    except ValueError:
        return False

def is_safe_url(url: str) -> Tuple[bool, Optional[str]]:
    """
    Resolves host and checks all IPs for SSRF safety.
    Returns (is_safe, error_message).
    """
    try:
        parsed = urlparse(url)
        host = parsed.hostname
        if not host:
            return False, "Invalid hostname"
        
        # Resolve all IP addresses for the host
        addr_info = socket.getaddrinfo(host, None)
        ips = {info[4][0] for info in addr_info}
        
        for ip in ips:
            if not is_public_ip(ip):
                return False, f"Non-public IP blocked: {ip}"
        
        return True, None
    except Exception as e:
        return False, f"DNS resolution failed: {str(e)}"

def safe_fetch_html(url: str) -> Dict[str, Any]:
    """
    Fetches HTML from a URL with SSRF protection, timeouts, and size limits.
    """
    result = {
        "allowed": False,
        "final_url": None,
        "status_code": None,
        "redirect_count": 0,
        "content_type": None,
        "html": None,
        "error": None
    }
    
    current_url = url
    session = requests.Session()
    session.max_redirects = MAX_REDIRECTS
    
    try:
        for i in range(MAX_REDIRECTS + 1):
            # Check SSRF safety for each step
            is_safe, error = is_safe_url(current_url)
            if not is_safe:
                result["error"] = error
                return result
            
            # Perform request (don't follow redirects automatically to check each step)
            response = session.get(
                current_url,
                timeout=(CONNECT_TIMEOUT, READ_TIMEOUT),
                headers={"User-Agent": USER_AGENT},
                stream=True,
                allow_redirects=False
            )
            
            result["status_code"] = response.status_code
            result["content_type"] = response.headers.get("Content-Type", "").lower()
            
            # Handle Redirects manually to ensure safety at each hop
            if response.is_redirect or response.is_permanent_redirect:
                result["redirect_count"] += 1
                if result["redirect_count"] > MAX_REDIRECTS:
                    result["error"] = "Too many redirects"
                    return result
                current_url = urljoin(current_url, response.headers.get("Location", ""))
                continue
            
            # Check Content-Type
            if "text/html" not in result["content_type"] and "application/xhtml+xml" not in result["content_type"]:
                result["error"] = f"Invalid Content-Type: {result['content_type']}"
                return result

            # Read content with size limit
            content = []
            size = 0
            for chunk in response.iter_content(chunk_size=8192, decode_unicode=True):
                if chunk:
                    size += len(chunk)
                    if size > MAX_RESPONSE_SIZE:
                        result["error"] = "Response size limit exceeded"
                        return result
                    content.append(chunk)
            
            result["html"] = "".join(content)
            result["final_url"] = response.url
            result["allowed"] = True
            return result

    except requests.exceptions.Timeout:
        result["error"] = "Request timed out"
    except Exception as e:
        result["error"] = f"Fetch failed: {str(e)}"
    
    return result

def get_registrable_domain(url: str) -> str:
    """Minimal helper to extract domain. tldextract would be better but keeping it simple."""
    try:
        parsed = urlparse(url)
        host = parsed.netloc.lower().split(":")[0]
        # taking last two parts for simple domains
        parts = host.split('.')
        if len(parts) >= 2:
            return ".".join(parts[-2:])
        return host
    except:
        return ""

def extract_features_from_html(html: str, base_url: str, final_url: str) -> Dict[str, int]:
    """
    Extracts Phase 1 features from HTML content.
    Returns values: 1 (legitimate), 0 (neutral/uncertain), -1 (malicious).
    """
    soup = BeautifulSoup(html, "html.parser")
    final_domain = get_registrable_domain(final_url)
    
    features = {}
    
    # 1. Favicon: External domain for favicon is suspicious
    favicon = soup.find("link", rel=re.compile(r"icon", re.I))
    if favicon and favicon.get("href"):
        fav_href = urljoin(final_url, favicon["href"])
        fav_domain = get_registrable_domain(fav_href)
        features["favicon"] = 1 if fav_domain == final_domain else -1
    else:
        features["favicon"] = -1 # Common in phishing to not have one or use external
        
    # Helper for URL ratios (Request URL, Links in Tags)
    def get_url_ratio(tags, attr):
        urls = [urljoin(final_url, t.get(attr)) for t in tags if t.get(attr)]
        if not urls: return 0.0
        externals = [u for u in urls if get_registrable_domain(u) != final_domain]
        return len(externals) / len(urls)

    # 2. Request URL: Ratio of external objects (img, script, etc.)
    # <0.22 => 1, 0.22-0.61 => 0, >0.61 => -1
    req_tags = soup.find_all(["img", "script", "link", "iframe"], src=True) + soup.find_all("link", href=True)
    req_ratio = get_url_ratio(req_tags, "src") # Simplification: checking mostly src
    if len(req_tags) == 0: features["request_url"] = 0
    elif req_ratio < 0.22: features["request_url"] = 1
    elif req_ratio <= 0.61: features["request_url"] = 0
    else: features["request_url"] = -1

    # 3. URL of Anchor: Ratio of anchors with suspicious/external links
    anchors = soup.find_all("a", href=True)
    suspicious_anchors = 0
    external_anchors = 0
    for a in anchors:
        href = a["href"].strip().lower()
        if href in ["", "#", "javascript:void(0)", "javascript:"]:
            suspicious_anchors += 1
        else:
            abs_href = urljoin(final_url, href)
            if get_registrable_domain(abs_href) != final_domain:
                external_anchors += 1
    
    total_a = len(anchors)
    if total_a == 0:
        features["url_of_anchor"] = 0
    else:
        anchor_ratio = (suspicious_anchors + external_anchors) / total_a
        if anchor_ratio < 0.31: features["url_of_anchor"] = 1
        elif anchor_ratio <= 0.67: features["url_of_anchor"] = 0
        else: features["url_of_anchor"] = -1

    # 4. Links in Tags: Ratio of external links in metadata/scripts
    # Using meta, script, link
    tags_ratio = get_url_ratio(soup.find_all(["meta", "script", "link"]), "href")
    if tags_ratio < 0.22: features["links_in_tags"] = 1
    elif tags_ratio <= 0.61: features["links_in_tags"] = 0
    else: features["links_in_tags"] = -1

    # 5. SFH (Server Form Handler): Empty action or external action in forms
    forms = soup.find_all("form", action=True)
    if not forms:
        features["sfh"] = 1
    else:
        sfh_val = 1
        for f in forms:
            action = f["action"].strip().lower()
            if action in ["", "about:blank"]:
                sfh_val = -1
                break
            abs_action = urljoin(final_url, action)
            if get_registrable_domain(abs_action) != final_domain:
                sfh_val = 0 # Suspicious but not fatal
        features["sfh"] = sfh_val

    # 6. on_mouseover: Phishers hide real URLs in status bar
    has_mouseover = soup.find(lambda t: t.has_attr("onmouseover")) or "onmouseover" in html.lower()
    features["on_mouseover"] = -1 if has_mouseover else 1

    # 7. rightclick: Disabling right-click to prevent source inspection
    has_rightclick_disable = any(x in html.lower() for x in ["event.button==2", "contextmenu", "preventdefault()"])
    features["rightclick"] = -1 if has_rightclick_disable else 1

    # 8. popupwidnow: Phishing sites often use fake popups
    has_popup = "window.open(" in html.lower() or "window.location.replace(" in html.lower()
    features["popupwidnow"] = -1 if has_popup else 1

    # 9. iframe: Iframe used to overlay malicious content
    has_iframe = soup.find("iframe") is not None
    features["iframe"] = -1 if has_iframe else 1

    return features
