# requirements.txt erklärt

## Was ist `requirements.txt`?

Die `requirements.txt` ist eine **Textdatei**, die alle Python-Pakete (Dependencies) auflistet, die dein Projekt braucht.

## Warum brauchen wir sie?

### 1. Dependency Management
- **Ohne requirements.txt:** Du musst manuell jedes Paket installieren
- **Mit requirements.txt:** Ein Befehl installiert alles

### 2. Versionierung
- **Ohne requirements.txt:** Andere entwickeln mit anderen Versionen → Fehler!
- **Mit requirements.txt:** Alle nutzen die gleichen Versionen → Funktioniert überall!

### 3. Reproduzierbarkeit
- **Ohne requirements.txt:** Dein Projekt funktioniert nur auf deinem Rechner
- **Mit requirements.txt:** Dein Projekt funktioniert überall (gleiche Pakete)

### 4. Deployment
- **Ohne requirements.txt:** Du musst manuell Pakete auf dem Server installieren
- **Mit requirements.txt:** Server installiert automatisch alle Pakete

## Beispiel: Unser Backend

### Was brauchen wir?
- `fastapi` - Für die API
- `uvicorn` - Für den Server
- `pydantic` - Für Request/Response Validation
- `scikit-learn` - Für ML-Modelle (später)
- `joblib` - Für Model-Serialisierung (später)

### requirements.txt Inhalt:

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
scikit-learn==1.3.2
joblib==1.3.2
python-multipart==0.0.6
```

### Was bedeutet `==`?

- `fastapi==0.104.1` - **Exakte Version** (empfohlen für Production)
- `fastapi>=0.104.1` - **Minimum Version** (kann neuer sein)
- `fastapi~=0.104.1` - **Kompatible Version** (0.104.x, aber nicht 0.105.x)
- `fastapi` - **Neueste Version** (nicht empfohlen - kann brechen!)

## Wie verwendet man requirements.txt?

### 1. Erstellen:
```bash
# Manuell erstellen (wir machen das)
# Oder automatisch generieren:
pip freeze > requirements.txt
```

### 2. Installieren:
```bash
# Alle Pakete installieren:
pip install -r requirements.txt
```

### 3. Virtual Environment (empfohlen):
```bash
# Virtual Environment erstellen:
python -m venv venv

# Aktivieren (Mac/Linux):
source venv/bin/activate

# Aktivieren (Windows):
venv\Scripts\activate

# Jetzt installieren:
pip install -r requirements.txt
```

## Warum Virtual Environment?

### Problem ohne Virtual Environment:
```
Projekt A braucht: fastapi==0.104.1
Projekt B braucht: fastapi==0.100.0
❌ Konflikt! Beide können nicht gleichzeitig installiert sein!
```

### Lösung mit Virtual Environment:
```
Projekt A (venv_a/): fastapi==0.104.1 ✅
Projekt B (venv_b/): fastapi==0.100.0 ✅
✅ Kein Konflikt! Jedes Projekt hat sein eigenes Environment
```

## Vollständiges Beispiel

### 1. requirements.txt erstellen:
```txt
# backend/requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
scikit-learn==1.3.2
joblib==1.3.2
python-multipart==0.0.6
```

### 2. Virtual Environment erstellen:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Mac/Linux
```

### 3. Pakete installieren:
```bash
pip install -r requirements.txt
```

### 4. Prüfen, was installiert wurde:
```bash
pip list
```

### 5. Server starten:
```bash
uvicorn app.main:app --reload
```

## Wichtige Befehle

### Pakete installieren:
```bash
pip install -r requirements.txt
```

### Pakete aktualisieren:
```bash
pip install --upgrade -r requirements.txt
```

### Neue Pakete hinzufügen:
```bash
# 1. Paket installieren:
pip install neues-paket

# 2. In requirements.txt hinzufügen:
# neues-paket==1.0.0

# 3. Oder automatisch aktualisieren:
pip freeze > requirements.txt
```

### Alle installierten Pakete anzeigen:
```bash
pip list
```

### requirements.txt aus installierten Paketen erstellen:
```bash
pip freeze > requirements.txt
```

## Best Practices

### 1. Versionen spezifizieren
```txt
# ✅ Gut (exakte Version):
fastapi==0.104.1

# ❌ Schlecht (keine Version):
fastapi
```

### 2. Kommentare verwenden
```txt
# Web Framework
fastapi==0.104.1

# Server
uvicorn[standard]==0.24.0

# Validation
pydantic==2.5.0
```

### 3. Virtual Environment verwenden
- **Immer** Virtual Environment verwenden
- **Nie** System-Python direkt nutzen
- **Immer** `venv/` in `.gitignore` aufnehmen

### 4. Regelmäßig aktualisieren
```bash
# Prüfe verfügbare Updates:
pip list --outdated

# Update einzelnes Paket:
pip install --upgrade fastapi

# Update requirements.txt:
pip freeze > requirements.txt
```

## Unser Backend requirements.txt

### Minimal (für Phase A):
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
scikit-learn==1.3.2
joblib==1.3.2
python-multipart==0.0.6
```

### Erweitert (für später):
```txt
# Web Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0

# Validation
pydantic==2.5.0

# ML
scikit-learn==1.3.2
joblib==1.3.2
transformers==4.35.0  # Für DistilBERT (später)

# Database (später)
sqlalchemy==2.0.23
psycopg2-binary==2.9.9  # PostgreSQL

# Auth (später)
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# Utilities
python-multipart==0.0.6
python-dotenv==1.0.0  # Für .env Dateien
```

## Zusammenfassung

### Was macht requirements.txt?
1. **Listet alle Dependencies auf** - Welche Pakete braucht das Projekt?
2. **Spezifiziert Versionen** - Welche Versionen werden verwendet?
3. **Ermöglicht Reproduzierbarkeit** - Gleiche Pakete überall
4. **Erleichtert Deployment** - Automatische Installation

### Warum wichtig?
- ✅ **Reproduzierbarkeit:** Projekt funktioniert überall
- ✅ **Versionierung:** Gleiche Pakete für alle
- ✅ **Deployment:** Einfache Installation auf Server
- ✅ **Teamarbeit:** Alle nutzen die gleichen Pakete

### Für unser Projekt:
- **Erstelle `backend/requirements.txt`** mit den benötigten Paketen
- **Nutze Virtual Environment** (`venv`)
- **Installiere Pakete** mit `pip install -r requirements.txt`

## Häufige Fragen

### Q: Muss ich alle Pakete manuell auflisten?
**A:** Ja, für den Anfang. Später kannst du `pip freeze > requirements.txt` nutzen.

### Q: Was ist der Unterschied zu package.json (Node.js)?
**A:** Ähnlich! `requirements.txt` ist wie `package.json` für Python.

### Q: Kann ich requirements.txt automatisch generieren?
**A:** Ja! `pip freeze > requirements.txt` erstellt sie aus installierten Paketen.

### Q: Was bedeutet `uvicorn[standard]`?
**A:** `[standard]` installiert zusätzliche Dependencies für bessere Performance.

### Q: Sollte ich requirements.txt committen?
**A:** Ja! `requirements.txt` sollte immer im Git sein.

## Fazit

**requirements.txt ist wichtig für:**
- ✅ Dependency Management
- ✅ Versionierung
- ✅ Reproduzierbarkeit
- ✅ Deployment

**Für unser Projekt:**
- Erstelle `backend/requirements.txt`
- Nutze Virtual Environment
- Installiere Pakete mit `pip install -r requirements.txt`

**Das ist der Standard-Weg für Python-Projekte!** 🎉

