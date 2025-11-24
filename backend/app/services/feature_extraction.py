"""
Feature Extraction for Phishing Detection

Extracts engineered features from URLs for machine learning models.
Based on research from Qasim et al. and Thapa et al. (2025).
"""

from urllib.parse import urlparse
import re
from typing import Dict

# Suspicious keywords commonly found in phishing URLs
SUSPICIOUS_KEYWORDS = [
    "login", "verify", "secure", "account", "update",
    "password", "confirm", "bank", "urgent", "suspended",
    "limited", "click", "here", "action", "required"
]

# Common URL shortener services
URL_SHORTENERS = [
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
    "is.gd", "buff.ly", "short.link", "rebrand.ly", "cutt.ly",
    "qrco.de", "l.ead.me", "q-r.to", "l.wl.co"
]


class URLFeatureExtractor:
    """
    Extracts engineered features from URLs for phishing detection.
    
    Features are organized into categories:
    - Length features (URL, domain, path lengths)
    - Domain features (subdomains, patterns, IP detection)
    - Path features (depth, extensions, patterns)
    - Query features (parameter count, patterns)
    - Pattern features (suspicious keywords, special characters)
    - Security features (HTTPS, port specification)
    """
    
    def __init__(self):
        """Initialize the feature extractor."""
        pass
    
    def extract(self, url: str) -> Dict[str, float]:
        """
        Extract all features from a URL.
        
        Args:
            url: The URL to analyze (e.g., "https://example.com/path?param=value")
        
        Returns:
            Dictionary with feature names as keys and feature values as values
        """
        if not url or not isinstance(url, str):
            return self._empty_features()
        
        try:
            parsed = urlparse(url)
            
            features = {}
            features.update(self._length_features(url, parsed))
            features.update(self._domain_features(parsed))
            features.update(self._path_features(parsed))
            features.update(self._query_features(parsed))
            features.update(self._pattern_features(url))
            features.update(self._security_features(parsed))
            
            return features
        except Exception as e:
            # Return empty features on error
            print(f"Error extracting features from URL '{url}': {e}")
            return self._empty_features()
    
    def _length_features(self, url: str, parsed) -> Dict[str, float]:
        """Extract length-based features."""
        domain = parsed.netloc.split(':')[0] if parsed.netloc else ""
        path = parsed.path if parsed.path else ""
        
        return {
            "url_length": float(len(url)),
            "domain_length": float(len(domain)),
            "path_length": float(len(path)),
        }
    
    def _domain_features(self, parsed) -> Dict[str, float]:
        """Extract domain-related features."""
        domain = parsed.netloc.split(':')[0] if parsed.netloc else ""
        
        # Count subdomains (e.g., "sub.example.com" has 1 subdomain)
        if domain:
            parts = domain.split('.')
            num_subdomains = max(0, len(parts) - 2)  # -2 for TLD and main domain
        else:
            num_subdomains = 0
        
        # Check if domain contains digits
        domain_has_digits = 1.0 if any(char.isdigit() for char in domain) else 0.0
        
        # Check if domain contains hyphens
        domain_has_hyphens = 1.0 if '-' in domain else 0.0
        
        # Check if domain is a URL shortener
        is_url_shortener = 1.0 if any(shortener in domain.lower() for shortener in URL_SHORTENERS) else 0.0
        
        # Check if domain is an IP address
        has_ip = 0.0
        if domain:
            # Simple IP pattern check (IPv4)
            ip_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
            if re.match(ip_pattern, domain):
                try:
                    # Validate IP address
                    parts = domain.split('.')
                    if all(0 <= int(part) <= 255 for part in parts):
                        has_ip = 1.0
                except ValueError:
                    pass
        
        return {
            "num_subdomains": float(num_subdomains),
            "domain_has_digits": domain_has_digits,
            "domain_has_hyphens": domain_has_hyphens,
            "is_url_shortener": is_url_shortener,
            "has_ip": has_ip,
        }
    
    def _path_features(self, parsed) -> Dict[str, float]:
        """Extract path-related features."""
        path = parsed.path if parsed.path else ""
        
        # path depth (number of directories)
        path_depth = len([p for p in path.split('/') if p]) if path else 0
        
        # check if path has file extension
        path_has_extension = 1.0 if re.search(r'\.[a-zA-Z]{2,4}$', path) else 0.0
        
        return {
            "path_depth": float(path_depth),
            "path_has_extension": path_has_extension,
        }
    
    def _query_features(self, parsed) -> Dict[str, float]:
        """Extract query parameter features."""
        query = parsed.query if parsed.query else ""
        
        # Count number of query parameters
        num_query_params = len(query.split('&')) if query else 0
        
        # Check if query contains credential-related keywords
        query_has_credentials = 0.0
        if query:
            credential_keywords = ['user', 'pass', 'login', 'pwd', 'password', 'token']
            query_lower = query.lower()
            if any(keyword in query_lower for keyword in credential_keywords):
                query_has_credentials = 1.0
        
        return {
            "query_length": float(len(query)),
            "num_query_params": float(num_query_params),
            "query_has_credentials": query_has_credentials,
        }
    
    def _pattern_features(self, url: str) -> Dict[str, float]:
        """Extract pattern-based features (keywords, special characters)."""
        url_lower = url.lower()
        
        # count suspicious keywords
        num_suspicious_keywords = sum(
            1 for keyword in SUSPICIOUS_KEYWORDS if keyword in url_lower
        )
        
        # count special characters
        num_special_chars = len(re.findall(r'[^a-zA-Z0-9./:]', url))
        
        # count digits
        num_digits = len(re.findall(r'\d', url))
        
        return {
            "num_suspicious_keywords": float(num_suspicious_keywords),
            "num_special_chars": float(num_special_chars),
            "num_digits": float(num_digits),
        }
    
    def _security_features(self, parsed) -> Dict[str, float]:
        """Extract security-related features."""
        scheme = parsed.scheme.lower() if parsed.scheme else ""
        has_https = 1.0 if scheme == "https" else 0.0
        
        # check if port is specified
        port_specified = 1.0 if ':' in parsed.netloc and parsed.netloc.split(':')[-1].isdigit() else 0.0
        
        return {
            "has_https": has_https,
            "port_specified": port_specified,
        }
    
    def _empty_features(self) -> Dict[str, float]:
        """
        Return empty features dictionary with all features set to 0.
        Used as fallback for invalid URLs.
        """
        return {
            "url_length": 0.0,
            "domain_length": 0.0,
            "path_length": 0.0,
            "num_subdomains": 0.0,
            "domain_has_digits": 0.0,
            "domain_has_hyphens": 0.0,
            "is_url_shortener": 0.0,
            "has_ip": 0.0,
            "path_depth": 0.0,
            "path_has_extension": 0.0,
            "query_length": 0.0,
            "num_query_params": 0.0,
            "query_has_credentials": 0.0,
            "num_suspicious_keywords": 0.0,
            "num_special_chars": 0.0,
            "num_digits": 0.0,
            "has_https": 0.0,
            "port_specified": 0.0,
        }
    
    def get_feature_names(self) -> list:
        """Return list of all feature names in consistent order."""
        return list(self._empty_features().keys())


# Test function
if __name__ == "__main__":
    extractor = URLFeatureExtractor()
    
    # Test URLs
    test_urls = [
        "https://example.com",
        "https://secure-login.bank.com/verify?account=123",
        "http://192.168.1.1",
        "https://bit.ly/abc123",
    ]
    
    print("Testing URLFeatureExtractor:")
    print("=" * 60)
    
    for url in test_urls:
        features = extractor.extract(url)
        print(f"\nURL: {url}")
        print(f"Features extracted: {len(features)}")
        for name, value in features.items():
            print(f"  {name}: {value}")

