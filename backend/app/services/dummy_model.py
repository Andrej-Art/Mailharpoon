import random
from typing import Optional


def predict(text: Optional[str] = None, url: Optional[str] = None) -> dict:
    """Dummy model for phishing detection
    
    Returns random results. The real ML model will be loaded here later.
    
    Args:
        text: Email text (optional, not yet used)
        url: URL (optional, not yet used)
    
    Returns:
        dict: {
            "label": 'phish' or "legit",
            "score": float (0.0 - 1.0),
            "explanation": str
        }
    """
    # Simple heuristics for dummy model
    # Check URL for suspicious patterns
    url_suspicious = False
    if url:
        url_lower = url.lower()
        # Check for common phishing indicators
        if any(domain in url_lower for domain in ['bit.ly', 'tinyurl', 't.co', 'goo.gl']):
            url_suspicious = True
        if url_lower.count('.') > 3:  # Many subdomains
            url_suspicious = True
    
    # Check text for suspicious keywords
    text_suspicious = False
    if text:
        text_lower = text.lower()
        suspicious_keywords = ['urgent', 'verify', 'click', 'password', 'suspended', 'immediately']
        suspicious_count = sum(1 for keyword in suspicious_keywords if keyword in text_lower)
        if suspicious_count >= 2:
            text_suspicious = True
    
    # Determine label based on heuristics
    if url_suspicious or text_suspicious:
        label = "phish"
        score = random.uniform(0.7, 0.95)
        if url_suspicious and text_suspicious:
            explanation = "Suspicious patterns detected in both URL and text"
        elif url_suspicious:
            explanation = "Suspicious patterns detected in URL"
        else:
            explanation = "Suspicious patterns detected in text"
    else:
        label = "legit"
        score = random.uniform(0.3, 0.6)
        explanation = "No suspicious patterns found"
    
    return {
        "label": label,
        "score": round(score, 2),
        "explanation": explanation
    }