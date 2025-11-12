# Backend Setup - Schritt für Schritt Anleitung

## Übersicht
Wir erstellen jetzt das minimale FastAPI-Backend mit einem Dummy-Modell. Das Ziel ist, eine funktionierende API zu haben, bevor wir echte ML-Modelle trainieren.

## Schritt 1: Projektstruktur anlegen

Die Struktur sollte so aussehen:
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI Hauptdatei
│   ├── schemas.py           # Pydantic Schemas
│   ├── services/            # Business Logic
│   │   ├── __init__.py
│   │   └── dummy_model.py   # Dummy-Modell für Tests
│   └── models/              # Database Models (später)
│       └── __init__.py
├── requirements.txt
└── .env.example             # Environment Variables Template
```

**Was du tun musst:**
- Erstelle die Verzeichnisse (bereits gemacht: `mkdir -p backend/app/services`)
- Erstelle die `__init__.py` Dateien in jedem Verzeichnis

## Schritt 2: requirements.txt erstellen

**Datei:** `backend/requirements.txt`

**Inhalt:**
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
scikit-learn==1.3.2
joblib==1.3.2
python-multipart==0.0.6
```

**Was du lernst:**
- Python Dependency Management
- Package-Versionierung

## Schritt 3: Pydantic Schemas erstellen

**Datei:** `backend/app/schemas.py`

**Was du erstellen musst:**
1. **PredictRequest Schema:**
   - `text: str` - E-Mail-Text
   - `url: str | None` - URL (optional)

2. **PredictResponse Schema:**
   - `label: str` - "phish" oder "legit"
   - `score: float` - Confidence Score (0.0 - 1.0)
   - `explanation: str` - Erklärung, warum klassifiziert

**Was du lernst:**
- Pydantic Models für Request/Response Validation
- Type Hints in Python
- Optional Fields

**Beispiel-Code-Struktur:**
```python
from pydantic import BaseModel
from typing import Optional

class PredictRequest(BaseModel):
    text: str
    url: Optional[str] = None

class PredictResponse(BaseModel):
    label: str  # "phish" oder "legit"
    score: float
    explanation: str
```

## Schritt 4: Dummy-Model Service erstellen

**Datei:** `backend/app/services/dummy_model.py`

**Was du erstellen musst:**
1. Funktion `predict(text: str, url: str | None) -> dict`
2. Gibt zufälliges Ergebnis zurück (für jetzt)
3. Format: `{"label": "phish"|"legit", "score": 0.0-1.0, "explanation": "..."}`

**Was du lernst:**
- Service-Layer Pattern
- Funktionen für Business Logic
- Random Number Generation

**Beispiel-Code-Struktur:**
```python
import random

def predict(text: str, url: str | None = None) -> dict:
    # Zufälliges Label generieren
    label = random.choice(["phish", "legit"])
    # Zufälliger Score zwischen 0.5 und 0.9
    score = random.uniform(0.5, 0.9)
    # Einfache Erklärung
    explanation = f"Suspicious patterns detected in text" if label == "phish" else "No suspicious patterns found"
    
    return {
        "label": label,
        "score": round(score, 2),
        "explanation": explanation
    }
```

## Schritt 5: FastAPI Main App erstellen

**Datei:** `backend/app/main.py`

**Was du erstellen musst:**
1. FastAPI App initialisieren
2. CORS Middleware hinzufügen (für Frontend-Kommunikation)
3. POST `/predict` Endpunkt
4. GET `/health` Endpunkt (optional, für Health Checks)
5. GET `/` Endpunkt (optional, für API Docs)

**Was du lernst:**
- FastAPI App Setup
- CORS (Cross-Origin Resource Sharing)
- API Endpoints definieren
- Request/Response Handling
- Error Handling

**Beispiel-Code-Struktur:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import PredictRequest, PredictResponse
from app.services.dummy_model import predict

app = FastAPI(title="Phishing Detector API", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In Production: spezifische Domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/predict", response_model=PredictResponse)
async def predict_phishing(request: PredictRequest):
    # Dummy-Modell aufrufen
    result = predict(request.text, request.url)
    return PredictResponse(**result)

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

## Schritt 6: Environment Variables (Optional)

**Datei:** `backend/.env.example`

**Inhalt:**
```
# API Settings
API_HOST=0.0.0.0
API_PORT=8000

# Model Settings
MODEL_PATH=./models/dummy_model.pkl

# CORS Settings
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Schritt 7: Testen

### 1. Virtual Environment erstellen:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 2. Dependencies installieren:
```bash
pip install -r requirements.txt
```

### 3. Server starten:
```bash
uvicorn app.main:app --reload
```

### 4. API testen:

**Mit curl:**
```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{"text": "test email", "url": "https://example.com"}'
```

**Oder im Browser:**
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### 5. Erwartete Response:
```json
{
  "label": "phish",
  "score": 0.75,
  "explanation": "Suspicious patterns detected in text"
}
```

## Lernpunkte Zusammenfassung

### FastAPI:
- **Decorators:** `@app.post()`, `@app.get()`
- **Request Models:** Pydantic für Validierung
- **Response Models:** Pydantic für Serialisierung
- **CORS:** Warum wichtig für Frontend-Kommunikation

### Python:
- **Type Hints:** `str | None`, `dict`, `float`
- **Optional:** `from typing import Optional`
- **Async/Await:** `async def` für asynchrone Endpoints

### API Design:
- **RESTful:** POST für Predictions, GET für Health
- **Error Handling:** FastAPI automatisch
- **Documentation:** Automatisch mit FastAPI

## Nächste Schritte

Nach diesem Schritt solltest du haben:
✅ Funktionierendes FastAPI-Backend
✅ POST `/predict` Endpunkt
✅ Dummy-Modell für Tests
✅ API-Dokumentation (automatisch)

**Dann kommt:** Frontend (React + Vite) → Phase A abschließen

## Häufige Probleme

### Import-Fehler:
- **Problem:** `ModuleNotFoundError: No module named 'app'`
- **Lösung:** Stelle sicher, dass du im `backend/` Verzeichnis bist

### CORS-Fehler:
- **Problem:** Frontend kann nicht auf API zugreifen
- **Lösung:** CORS Middleware korrekt konfiguriert?

### Port bereits belegt:
- **Problem:** `Address already in use`
- **Lösung:** Anderen Port verwenden: `uvicorn app.main:app --port 8001`

## Hilfe

Wenn du Fragen hast oder nicht weiterkommst:
1. Prüfe die FastAPI Dokumentation: https://fastapi.tiangolo.com/
2. Prüfe die Pydantic Dokumentation: https://docs.pydantic.dev/
3. Frage mich! 😊

