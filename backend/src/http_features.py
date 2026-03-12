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
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
IP_GEO_API = "http://ip-api.com/json/{ip}"

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

def get_ip_geolocation(ip: str) -> Dict[str, Any]:
    """Fetches geolocation data for a public IP address."""
    if not is_public_ip(ip):
        return {"status": "fail", "message": "Private IP"}
    try:
        url = IP_GEO_API.format(ip=ip)
        response = requests.get(url, timeout=3)
        if response.status_code == 200:
            return response.json()
    except:
        pass
    return {"status": "fail", "message": "Lookup failed"}

def safe_fetch_html(url: str) -> Dict[str, Any]:
    """
    Fetches HTML from a URL with SSRF protection, timeouts, and size limits.
    """
    result = {
        "allowed": False,
        "final_url": None,
        "status_code": None,
        "redirect_count": 0,
        "redirect_chain": [],
        "content_type": None,
        "html": None,
        "resolved_ip": None,
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
            
            # Perform request
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
                result["redirect_chain"].append(current_url)
                result["redirect_count"] += 1
                if result["redirect_count"] > MAX_REDIRECTS:
                    result["error"] = "Too many redirects"
                    return result
                current_url = urljoin(current_url, response.headers.get("Location", ""))
                continue
            
            # Final host reached - ensure IP is captured
            try:
                parsed_final = urlparse(current_url)
                result["resolved_ip"] = socket.gethostbyname(parsed_final.hostname)
            except:
                pass

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
    """Uses tldextract to accurately determine the registered domain."""
    import tldextract
    try:
        extracted = tldextract.extract(url)
        if extracted.domain and extracted.suffix:
            return f"{extracted.domain}.{extracted.suffix}"
        return extracted.domain or ""
    except Exception:
        return ""

def extract_features_from_html(html: str, base_url: str, final_url: str) -> Tuple[Dict[str, int], Dict[str, Any]]:
    """
    Extracts Phase 1 features from HTML content and returns raw metadata.
    Returns: (features_dict, metadata_dict)
    """
    soup = BeautifulSoup(html, "html.parser")
    final_domain = get_registrable_domain(final_url)
    
    features = {}
    metadata = {}
    
    # 1. Favicon: External domain for favicon is suspicious
    favicon = soup.find("link", rel=re.compile(r"icon", re.I))
    if favicon and favicon.get("href"):
        fav_href = urljoin(final_url, favicon["href"])
        fav_domain = get_registrable_domain(fav_href)
        features["favicon"] = -1 if fav_domain == final_domain else 1
        metadata["favicon_url"] = fav_href
    else:
        features["favicon"] = 1 
        metadata["favicon_url"] = None
        
    # Helper for URL ratios (Request URL, Links in Tags)
    def get_url_ratio(tags, attr):
        urls = [urljoin(final_url, t.get(attr)) for t in tags if t.get(attr)]
        if not urls: return 0.0
        externals = [u for u in urls if get_registrable_domain(u) != final_domain]
        return len(externals) / len(urls)

    # 2. Request URL: Ratio of external objects (img, script, media, etc.)
    asset_urls = []
    for tag in soup.find_all(["img", "script", "iframe", "source", "video", "audio"]):
        if tag.get("src"):
            asset_urls.append(urljoin(final_url, tag.get("src")))
    for tag in soup.find_all("link"):
        if tag.get("href"):
            asset_urls.append(urljoin(final_url, tag.get("href")))

    total_assets = len(asset_urls)
    external_assets = sum(1 for u in asset_urls if get_registrable_domain(u) != final_domain)
    req_ratio = external_assets / total_assets if total_assets > 0 else 0.0
    
    metadata["total_assets"] = total_assets
    metadata["external_assets"] = external_assets
    metadata["request_url_ratio"] = req_ratio
    metadata["request_url_available"] = True
    
    if total_assets == 0: 
        features["request_url"] = 0
    elif req_ratio < 0.22: 
        features["request_url"] = -1
    elif req_ratio <= 0.61: 
        features["request_url"] = 0
    else: 
        features["request_url"] = 1

    # 3. URL of Anchor: Ratio of anchors with suspicious/external links
    anchors = soup.find_all("a", href=True)
    empty_hash = 0
    javascript_anchors = 0
    external_anchors = 0
    cta_anchors = 0
    
    cta_keywords = ["login", "verify", "update", "confirm", "payment", "security", "account"]

    for a in anchors:
        href = a["href"].strip().lower()
        if href in ["", "#"]:
            empty_hash += 1
        elif href.startswith("javascript:"):
            javascript_anchors += 1
        else:
            abs_href = urljoin(final_url, href)
            if get_registrable_domain(abs_href) != final_domain:
                external_anchors += 1
                
                # Check for CTA abuse on external links
                text = a.get_text(strip=True).lower()
                if any(kw in text for kw in cta_keywords):
                    cta_anchors += 1
    
    total_a = len(anchors)
    metadata["total_anchors"] = total_a
    metadata["empty_hash_anchors"] = empty_hash
    metadata["javascript_anchors"] = javascript_anchors
    metadata["external_anchors"] = external_anchors
    metadata["cta_anchors"] = cta_anchors
    metadata["url_of_anchor_available"] = True
    
    suspicious_total = empty_hash + javascript_anchors + external_anchors
    
    if total_a == 0:
        features["url_of_anchor"] = 0
    else:
        anchor_ratio = suspicious_total / total_a
        metadata["anchor_ratio"] = anchor_ratio
        if anchor_ratio < 0.31: features["url_of_anchor"] = -1
        elif anchor_ratio <= 0.67: features["url_of_anchor"] = 0
        else: features["url_of_anchor"] = 1

    # 4. Links in Tags: Ratio of external links in metadata/scripts
    # Using meta, script, link
    tags_ratio = get_url_ratio(soup.find_all(["meta", "script", "link"]), "href")
    if tags_ratio < 0.22: features["links_in_tags"] = -1
    elif tags_ratio <= 0.61: features["links_in_tags"] = 0
    else: features["links_in_tags"] = 1

    # 5. SFH (Server Form Handler): Empty action or external action in forms
    forms = soup.find_all("form", action=True)
    if not forms:
        features["sfh"] = -1
    else:
        sfh_val = -1
        for f in forms:
            action = f["action"].strip().lower()
            if action in ["", "about:blank"]:
                sfh_val = 1
                break
            abs_action = urljoin(final_url, action)
            if get_registrable_domain(abs_action) != final_domain:
                sfh_val = 0 # Suspicious but not fatal
        features["sfh"] = sfh_val

    # 6. on_mouseover: Phishers hide real URLs in status bar
    has_mouseover = soup.find(lambda t: t.has_attr("onmouseover")) or "onmouseover" in html.lower()
    features["on_mouseover"] = 1 if has_mouseover else -1

    # 7. rightclick: Disabling right-click to prevent source inspection
    has_rightclick_disable = any(x in html.lower() for x in ["event.button==2", "contextmenu", "preventdefault()"])
    features["rightclick"] = 1 if has_rightclick_disable else -1

    # 8. popupwidnow: Phishing sites often use fake popups
    has_popup = "window.open(" in html.lower() or "window.location.replace(" in html.lower()
    features["popupwidnow"] = 1 if has_popup else -1
    metadata["has_popup"] = has_popup

    # 9. iframe: Using invisible iframes to load malicious content
    has_iframe = soup.find("iframe") is not None
    features["iframe"] = 1 if has_iframe else -1
    metadata["has_iframe"] = has_iframe

    return features, metadata
