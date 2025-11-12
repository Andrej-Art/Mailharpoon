# Python Imports - Problem und Lösung

## Problem: "ModuleNotFoundError: No module named 'app'"

### Warum passiert das?

Die `validation.py` Datei versucht:
```python
from app.schemas import PredictRequest, PredictResponse
```

Aber Python findet das Modul `app` nicht, weil:

1. **Python-Path Problem:** Das `backend/` Verzeichnis ist nicht im Python-Path
2. **Struktur Problem:** `tests/` ist im Root, `app/` ist in `backend/`
3. **Import-Pfad Problem:** Python sucht nach `app` im aktuellen Verzeichnis, findet es aber nicht

### Verzeichnisstruktur:
```
phishing_detector/
├── backend/
│   └── app/
│       └── schemas.py      ← Hier ist das Modul
└── tests/
    └── validation.py       ← Hier versuchst du zu importieren
```

## Lösungen

### Lösung 1: Python-Path setzen (Empfohlen)

**In `validation.py`:**
```python
import sys
from pathlib import Path

# Backend-Verzeichnis zum Python-Path hinzufügen
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# Jetzt kann Python das Modul finden
from app.schemas import PredictRequest, PredictResponse
```

### Lösung 2: Von Root aus ausführen

**Von Root-Verzeichnis aus:**
```bash
cd /Users/andrejartuschenko/Desktop/phishing_detector
PYTHONPATH=backend python tests/validation.py
```

### Lösung 3: Relative Imports (schwieriger)

**In `validation.py`:**
```python
# Nicht empfohlen für Tests
import sys
sys.path.insert(0, '../backend')
from app.schemas import PredictRequest, PredictResponse
```

### Lösung 4: Als Paket ausführen (Beste Lösung)

**Von Root-Verzeichnis aus:**
```bash
cd /Users/andrejartuschenko/Desktop/phishing_detector
python -m backend.app.schemas  # Test schemas direkt
python -m tests.validation     # Test validation
```

## Empfohlene Lösung für Tests

### Schritt 1: Python-Path in validation.py setzen

```python
import sys
from pathlib import Path

# Backend-Verzeichnis zum Python-Path hinzufügen
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.schemas import PredictRequest, PredictResponse

# Jetzt kannst du testen
def test_predict_request():
    request = PredictRequest(text="test email", url="https://example.com")
    assert request.text == "test email"
    assert request.url == "https://example.com"

def test_predict_response():
    response = PredictResponse(
        label="phish",
        score=0.87,
        explanation="Suspicious patterns detected"
    )
    assert response.label == "phish"
    assert response.score == 0.87

if __name__ == "__main__":
    test_predict_request()
    test_predict_response()
    print("✅ Alle Tests bestanden!")
```

### Schritt 2: Von Root aus ausführen

```bash
cd /Users/andrejartuschenko/Desktop/phishing_detector
python tests/validation.py
```

## Alternative: pytest verwenden (Empfohlen für später)

### pytest automatisch findet Tests, wenn:

1. **conftest.py** im Root oder tests/ Verzeichnis:
```python
# conftest.py
import sys
from pathlib import Path

backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))
```

2. **Von Root aus ausführen:**
```bash
cd /Users/andrejartuschenko/Desktop/phishing_detector
pytest tests/
```

## Zusammenfassung

### Problem:
- ❌ Python findet `app` Modul nicht
- ❌ `backend/` ist nicht im Python-Path

### Lösung:
- ✅ Python-Path in `validation.py` setzen
- ✅ `backend/` Verzeichnis zum Path hinzufügen
- ✅ Dann können Imports funktionieren

### Code:
```python
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.schemas import PredictRequest, PredictResponse
```

## Nächste Schritte

1. **validation.py korrigieren** - Python-Path setzen
2. **schemas.py korrigieren** - Doppelte Definitionen entfernen
3. **Tests ausführen** - Von Root aus

**Soll ich dir die korrigierten Dateien zeigen?** 🚀

