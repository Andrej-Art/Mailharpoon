# Pydantic Schemas - Schritt für Schritt

## Was sind Pydantic Schemas?

Pydantic Schemas sind **Datenmodelle**, die:
- ✅ **Request-Daten validieren** (was das Frontend sendet)
- ✅ **Response-Daten strukturieren** (was das Backend zurückgibt)
- ✅ **Type Safety** bieten (Type Hints)
- ✅ **Automatische Dokumentation** in FastAPI

## Was brauchen wir?

### 1. PredictRequest Schema
**Für:** Eingehende Daten vom Frontend
- `text: str` - E-Mail-Text (erforderlich)
- `url: str | None` - URL (optional)

### 2. PredictResponse Schema
**Für:** Ausgehende Daten an Frontend
- `label: str` - "phish" oder "legit"
- `score: float` - Confidence Score (0.0 - 1.0)
- `explanation: str` - Erklärung

## Schritt-für-Schritt Anleitung

### Schritt 1: Datei erstellen
**Datei:** `backend/app/schemas.py`

### Schritt 2: Imports
```python
from pydantic import BaseModel
from typing import Optional
```

### Schritt 3: PredictRequest Schema
```python
class PredictRequest(BaseModel):
    text: str
    url: Optional[str] = None
```

**Was bedeutet das?**
- `text: str` - Text ist erforderlich (String)
- `url: Optional[str] = None` - URL ist optional (kann None sein)

### Schritt 4: PredictResponse Schema
```python
class PredictResponse(BaseModel):
    label: str
    score: float
    explanation: str
```

**Was bedeutet das?**
- `label: str` - Label ist erforderlich (String)
- `score: float` - Score ist erforderlich (Float)
- `explanation: str` - Erklärung ist erforderlich (String)

## Vollständiger Code

```python
from pydantic import BaseModel
from typing import Optional

class PredictRequest(BaseModel):
    """Request Schema für Phishing-Detection"""
    text: str
    url: Optional[str] = None

class PredictResponse(BaseModel):
    """Response Schema für Phishing-Detection"""
    label: str  # "phish" oder "legit"
    score: float  # Confidence Score (0.0 - 1.0)
    explanation: str  # Erklärung, warum klassifiziert
```

## Was lernst du?

### 1. Pydantic BaseModel
- **BaseModel** ist die Basisklasse für alle Pydantic Models
- Bietet automatische Validierung
- Bietet automatische Serialisierung

### 2. Type Hints
- **`str`** - String (Text)
- **`float`** - Float (Dezimalzahl)
- **`Optional[str]`** - Optionaler String (kann None sein)

### 3. Optional Fields
- **`url: Optional[str] = None`** - URL ist optional, Standardwert ist None
- **Ohne `= None`** - Feld ist erforderlich

## Validierung

### Automatische Validierung:
```python
# ✅ Gültig:
request = PredictRequest(text="test email", url="https://example.com")

# ✅ Gültig (URL optional):
request = PredictRequest(text="test email")

# ❌ Ungültig (text fehlt):
request = PredictRequest(url="https://example.com")
# Fehler: Field required

# ❌ Ungültig (falscher Typ):
request = PredictRequest(text=123)
# Fehler: Input should be a valid string
```

## Erweiterte Features (Optional)

### 1. Field Validation
```python
from pydantic import BaseModel, Field

class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, description="E-Mail-Text")
    url: Optional[str] = Field(None, description="URL (optional)")
```

### 2. Enum für Label
```python
from pydantic import BaseModel
from enum import Enum

class Label(str, Enum):
    PHISH = "phish"
    LEGIT = "legit"

class PredictResponse(BaseModel):
    label: Label
    score: float
    explanation: str
```

### 3. Validators
```python
from pydantic import BaseModel, validator

class PredictRequest(BaseModel):
    text: str
    url: Optional[str] = None
    
    @validator('text')
    def text_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Text darf nicht leer sein')
        return v
```

## Testen

### Manuell testen:
```python
# In Python Shell:
from app.schemas import PredictRequest, PredictResponse

# Request testen:
request = PredictRequest(text="test email", url="https://example.com")
print(request.text)  # "test email"
print(request.url)   # "https://example.com"

# Response testen:
response = PredictResponse(
    label="phish",
    score=0.87,
    explanation="Suspicious patterns detected"
)
print(response.label)  # "phish"
```

## Zusammenfassung

### Was hast du gelernt?
1. ✅ **Pydantic BaseModel** - Basis für Datenmodelle
2. ✅ **Type Hints** - Type Safety in Python
3. ✅ **Optional Fields** - Optionale Parameter
4. ✅ **Automatische Validierung** - Pydantic validiert automatisch

### Was kommt als nächstes?
1. **Dummy-Model Service** - Funktion, die zufällige Ergebnisse zurückgibt
2. **FastAPI Main App** - API-Endpunkte erstellen
3. **Integration** - Alles zusammenfügen

## Nächste Schritte

1. **Erstelle `backend/app/schemas.py`**
2. **Füge PredictRequest und PredictResponse hinzu**
3. **Teste die Schemas (optional)**
4. **Dann weiter mit Dummy-Model Service**

**Bereit? Erstelle die Datei `backend/app/schemas.py`!** 🚀

