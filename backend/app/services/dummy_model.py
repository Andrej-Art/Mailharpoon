import random
from typing import Optional


def predict(text: str, url: Optional[str] = None) -> dict:
    """Dummy model for phishing detection
    
    Returns random results. The real ML model will be loaded here later.
    
    Args:
        text: Email text (not yet used)
        url: URL (optional, not yet used)
    
    Returns:
        dict: {
            “label”: ‘phish’ or “legit”,
            “score”: float (0.0 - 1.0),
            “explanation”: str
        }
    """
    # generate random label
    label = random.choice(["phish", "legit"])
    
    # random score between 0.5 and 0.9
    score = random.uniform(0.5, 0.9)
    
    # explanation based on label
    if label == "phish":
        explanation = "Suspicious patterns detected in text"
    else:
        explanation = "No suspicious patterns found"
    
    return {
        "label": label,
        "score": round(score, 2),
        "explanation": explanation
    }