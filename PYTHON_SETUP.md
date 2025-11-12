# Python Setup für Backend

## ✅ Gut: Python 3.12 ist installiert!

Du hast Python 3.12 unter: `/Users/andrejartuschenko/opt/miniconda3/bin/python3.12`

## Was bedeutet das?

### Aktuelle Situation:
- ❌ System-Python: 3.7.1 (zu alt)
- ✅ Conda Python 3.12: Verfügbar (perfekt!)

### Lösung:
Nutze Python 3.12 für das Backend! 🎉

## Virtual Environment mit Python 3.12 erstellen

### Schritt 1: Virtual Environment erstellen
```bash
cd backend

# Mit Python 3.12 (vollständiger Pfad):
/Users/andrejartuschenko/opt/miniconda3/bin/python3.12 -m venv venv

# Oder wenn python3.12 im PATH ist:
python3.12 -m venv venv
```

### Schritt 2: Virtual Environment aktivieren
```bash
source venv/bin/activate
```

### Schritt 3: Python-Version prüfen
```bash
python --version
# Sollte zeigen: Python 3.12.x
```

### Schritt 4: pip aktualisieren
```bash
pip install --upgrade pip
```

### Schritt 5: Pakete installieren
```bash
pip install -r requirements.txt
```

## Alternative: Conda Environment (empfohlen bei Conda)

Falls du Conda verwendest, kannst du auch ein Conda Environment erstellen:

```bash
cd backend

# Conda Environment erstellen:
conda create -n phishing_detector python=3.12

# Aktivieren:
conda activate phishing_detector

# Pakete installieren:
pip install -r requirements.txt
```

## requirements.txt Status

### ✅ requirements.txt (NEUESTE Versionen)
- **Für:** Python 3.8+ (empfohlen: Python 3.11 oder 3.12)
- **Pakete:** Neueste Versionen (FastAPI 0.121.1, etc.)
- **Empfehlung:** Diese verwenden! 🚀

### ⚠️ requirements-py37.txt (Python 3.7 kompatibel)
- **Für:** Python 3.7 (falls du es behalten musst)
- **Pakete:** Ältere Versionen (FastAPI 0.68.0, etc.)
- **Nur verwenden:** Falls du Python 3.7 behalten musst

## Empfehlung

### ✅ Verwende Python 3.12:
1. **Virtual Environment mit Python 3.12 erstellen**
2. **requirements.txt verwenden** (neueste Versionen)
3. **Alle Features verfügbar**
4. **Bessere Performance**
5. **Zukunftssicher**

## Schnellstart

### Mit Python 3.12:
```bash
cd backend

# Virtual Environment erstellen:
/Users/andrejartuschenko/opt/miniconda3/bin/python3.12 -m venv venv

# Aktivieren:
source venv/bin/activate

# Prüfen:
python --version  # Sollte 3.12.x sein

# pip aktualisieren:
pip install --upgrade pip

# Pakete installieren:
pip install -r requirements.txt

# Server starten:
uvicorn app.main:app --reload
```

### Mit Conda:
```bash
cd backend

# Conda Environment erstellen:
conda create -n phishing_detector python=3.12

# Aktivieren:
conda activate phishing_detector

# Pakete installieren:
pip install -r requirements.txt

# Server starten:
uvicorn app.main:app --reload
```

## Troubleshooting

### Problem: "python3.12: command not found"
**Lösung:** Verwende vollständigen Pfad:
```bash
/Users/andrejartuschenko/opt/miniconda3/bin/python3.12 -m venv venv
```

### Problem: "ModuleNotFoundError"
**Lösung:** Stelle sicher, dass Virtual Environment aktiviert ist:
```bash
source venv/bin/activate
which python  # Sollte venv zeigen
```

### Problem: "pip: command not found"
**Lösung:** pip installieren:
```bash
python -m ensurepip --upgrade
```

## Zusammenfassung

### ✅ Python 3.12 ist verfügbar!
### ✅ requirements.txt hat neueste Versionen!
### ✅ Einfach Virtual Environment mit Python 3.12 erstellen!
### ✅ Dann Pakete installieren mit `pip install -r requirements.txt`!

**Alles bereit für neueste Pakete!** 🎉

## Nächste Schritte

1. **Virtual Environment mit Python 3.12 erstellen**
2. **Pakete installieren:** `pip install -r requirements.txt`
3. **Backend-Code schreiben** (schemas.py, main.py, etc.)
4. **Server starten:** `uvicorn app.main:app --reload`

**Soll ich dir beim Erstellen des Virtual Environments helfen?** 🚀

