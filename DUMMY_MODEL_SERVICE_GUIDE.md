# Dummy-Model Service - Schritt für Schritt

## Was ist der Dummy-Model Service?

Der Dummy-Model Service ist eine **temporäre Funktion**, die zufällige Ergebnisse zurückgibt. Später wird hier das echte ML-Modell geladen.

## Warum brauchen wir das?

- ✅ **Frühes Testing:** API kann sofort getestet werden
- ✅ **Frontend-Entwicklung:** Frontend kann sofort entwickelt werden
- ✅ **Prototyp:** Schneller Prototyp ohne ML-Modell
- ✅ **Später austauschbar:** Einfach durch echtes Modell ersetzen

## Schritt-für-Schritt Anleitung

### Schritt 1: Datei erstellen
**Datei:** `backend/app/services/dummy_model.py`

### Schritt 2: Imports
```python
import random
```

### Schritt 3: Predict-Funktion
```python
def predict(text: str, url: str | None = None) -> dict:
    """Dummy-Modell für Phishing-Detection
    
    Args:
        text: E-Mail-Text
        url: URL (optional)
    
    Returns:
        dict: {"label": "phish"|"legit", "score": float, "explanation": str}
    """
    # Zufälliges Label generieren
    label = random.choice(["phish", "legit"])
    
    # Zufälliger Score zwischen 0.5 und 0.9
    score = random.uniform(0.5, 0.9)
    
    # Einfache Erklärung
    if label == "phish":
        explanation = "Suspicious patterns detected in text"
    else:
        explanation = "No suspicious patterns found"
    
    return {
        "label": label,
        "score": round(score, 2),
        "explanation": explanation
    }
```

## Vollständiger Code

```python
import random
from typing import Optional


def predict(text: str, url: Optional[str] = None) -> dict:
    """Dummy-Modell für Phishing-Detection
    
    Gibt zufällige Ergebnisse zurück. Später wird hier das echte ML-Modell geladen.
    
    Args:
        text: E-Mail-Text (wird noch nicht verwendet)
        url: URL (optional, wird noch nicht verwendet)
    
    Returns:
        dict: {
            "label": "phish" oder "legit",
            "score": float (0.0 - 1.0),
            "explanation": str
        }
    """
    # Zufälliges Label generieren
    label = random.choice(["phish", "legit"])
    
    # Zufälliger Score zwischen 0.5 und 0.9
    score = random.uniform(0.5, 0.9)
    
    # Einfache Erklärung basierend auf Label
    if label == "phish":
        explanation = "Suspicious patterns detected in text"
    else:
        explanation = "No suspicious patterns found"
    
    return {
        "label": label,
        "score": round(score, 2),
        "explanation": explanation
    }
```

## Erweiterte Version (Optional)

### Mit einfacher Heuristik:
```python
import random
from typing import Optional


def predict(text: str, url: Optional[str] = None) -> dict:
    """Dummy-Modell mit einfacher Heuristik"""
    
    # Einfache Heuristik basierend auf Text
    text_lower = text.lower()
    suspicious_keywords = ["password", "verify", "urgent", "click", "login"]
    suspicious_count = sum(1 for keyword in suspicious_keywords if keyword in text_lower)
    
    # URL-Heuristik
    url_suspicious = False
    if url:
        url_lower = url.lower()
        if "bit.ly" in url_lower or "tinyurl" in url_lower:
            url_suspicious = True
    
    # Entscheidung basierend auf Heuristik
    if suspicious_count >= 2 or url_suspicious:
        label = "phish"
        score = random.uniform(0.7, 0.95)
        explanation = f"Found {suspicious_count} suspicious keywords"
    else:
        label = "legit"
        score = random.uniform(0.3, 0.6)
        explanation = "No suspicious patterns found"
    
    return {
        "label": label,
        "score": round(score, 2),
        "explanation": explanation
    }
```

## Testen

### Manuell testen:
```python
# In Python Shell:
from app.services.dummy_model import predict

# Test mit Text und URL
result = predict("test email", "https://example.com")
print(result)
# Output: {"label": "phish", "score": 0.75, "explanation": "..."}

# Test nur mit Text
result2 = predict("test email")
print(result2)
# Output: {"label": "legit", "score": 0.65, "explanation": "..."}
```

### Mit Test-Datei:
```python
# backend/app/test_dummy_model.py
from app.services.dummy_model import predict

def test_predict():
    result = predict("test email", "https://example.com")
    assert "label" in result
    assert "score" in result
    assert "explanation" in result
    assert result["label"] in ["phish", "legit"]
    assert 0.0 <= result["score"] <= 1.0
    print("✅ Dummy-Model Test: OK")

if __name__ == "__main__":
    test_predict()
```

## Was lernst du?

### 1. Service-Layer Pattern
- **Service-Layer:** Business Logic getrennt von API-Logik
- **Wiederverwendbar:** Kann von verschiedenen Stellen aufgerufen werden
- **Testbar:** Einfach zu testen

### 2. Funktionen für Business Logic
- **Funktionen:** Kapseln Logik
- **Type Hints:** Bessere Code-Qualität
- **Docstrings:** Dokumentation

### 3. Random Number Generation
- **random.choice():** Zufällige Auswahl aus Liste
- **random.uniform():** Zufällige Zahl zwischen zwei Werten
- **round():** Runden auf 2 Dezimalstellen

## Nächste Schritte

1. **Erstelle `backend/app/services/dummy_model.py`**
2. **Implementiere die `predict()` Funktion**
3. **Teste die Funktion (optional)**
4. **Dann weiter mit FastAPI Main App**

## Zusammenfassung

### Was hast du gelernt?
1. ✅ **Service-Layer Pattern** - Business Logic getrennt
2. ✅ **Funktionen** - Kapselung von Logik
3. ✅ **Random Generation** - Zufällige Werte generieren

### Was kommt als nächstes?
1. **FastAPI Main App** - API-Endpunkte erstellen
2. **Integration** - Alles zusammenfügen
3. **Testing** - API testen

**Bereit? Erstelle die Datei `backend/app/services/dummy_model.py`!** 🚀

