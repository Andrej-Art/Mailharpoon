# Phase A: Vorbereitung & Minimalprototyp

## Übersicht
In dieser Phase richten wir die Grundstruktur ein und erstellen einen funktionierenden Prototypen mit Dummy-Modell.

## Schritt 1: Git-Repository & Struktur

### Was du machen musst:

1. **Git-Repository initialisieren:**
   ```bash
   git init
   git branch -M main
   git checkout -b dev
   git checkout -b feature/phase-a-backend
   ```

2. **Projektstruktur anlegen:**
   ```
   phishing_detector/
   ├── backend/
   │   ├── app/
   │   │   ├── __init__.py
   │   │   ├── main.py          # FastAPI Hauptdatei
   │   │   ├── models/          # ML-Modelle
   │   │   ├── services/        # Business Logic
   │   │   └── schemas/         # Pydantic Schemas
   │   ├── requirements.txt
   │   └── Dockerfile
   ├── frontend/
   │   ├── src/
   │   │   ├── App.jsx
   │   │   ├── main.jsx
   │   │   └── components/
   │   ├── package.json
   │   └── Dockerfile
   ├── data/                     # Datasets (gitignored)
   ├── models/                   # Gespeicherte Modelle (gitignored)
   ├── tests/
   ├── docker-compose.yml
   └── README.md
   ```

3. **`.gitignore` erstellen:**
   - Python: `__pycache__/`, `*.pyc`, `venv/`, `.env`
   - Node: `node_modules/`, `dist/`
   - Daten: `data/`, `models/`
   - IDE: `.vscode/`, `.idea/`

## Schritt 2: Minimal Backend (FastAPI)

### Was du lernen wirst:
- FastAPI Grundlagen (Routes, Request/Response Models)
- Pydantic Schemas für Validierung
- Dummy-Modell für frühes Testing

### Aufgaben:

1. **`backend/requirements.txt` erstellen:**
   ```
   fastapi==0.104.1
   uvicorn[standard]==0.24.0
   pydantic==2.5.0
   scikit-learn==1.3.2
   joblib==1.3.2
   python-multipart==0.0.6
   ```

2. **`backend/app/main.py` erstellen:**
   - FastAPI App initialisieren
   - CORS Middleware (für Frontend-Kommunikation)
   - POST `/predict` Endpunkt
   - Request Schema: `{"text": str, "url": str | None}`
   - Response Schema: `{"label": "phish" | "legit", "score": float, "explanation": str}`
   - Dummy-Logik: Zufälliges Label + Score zwischen 0.5-0.9

3. **`backend/app/schemas.py` erstellen:**
   - `PredictRequest` (Pydantic Model)
   - `PredictResponse` (Pydantic Model)

4. **Dummy-Modell-Service erstellen:**
   - `backend/app/services/dummy_model.py`
   - Funktion `predict(text: str, url: str | None) -> dict`
   - Gibt zufälliges Ergebnis zurück (später wird hier das echte Modell geladen)

### Lernpunkte:
- **FastAPI Decorators:** `@app.post()`, `@app.get()`
- **Pydantic Models:** Type validation, JSON serialization
- **CORS:** Warum brauchen wir das? (Frontend ↔ Backend)
- **API Design:** RESTful Prinzipien

### Testen:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Teste mit: `curl -X POST http://localhost:8000/predict -H "Content-Type: application/json" -d '{"text": "test email", "url": "https://example.com"}'`

## Schritt 3: Minimal Frontend (React + Vite)

### Was du lernen wirst:
- React Hooks (useState, useEffect)
- API-Aufrufe mit fetch/axios
- Formular-Handling
- Error Handling

### Aufgaben:

1. **Vite-Projekt initialisieren:**
   ```bash
   cd frontend
   npm create vite@latest . -- --template react
   npm install
   ```

2. **Dependencies installieren:**
   ```bash
   npm install axios tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

3. **`src/App.jsx` erstellen:**
   - State für: emailText, url, result, loading, error
   - Formular: Textarea für E-Mail, Input für URL, Submit-Button
   - API-Aufruf zu `http://localhost:8000/predict`
   - Ergebnisanzeige: Label, Score, Explanation
   - Error-Handling: Zeige Fehlermeldungen an

4. **`src/components/PredictionResult.jsx` erstellen:**
   - Zeige Label (phish/legit) mit Farbe
   - Zeige Score als Progress Bar oder Zahl
   - Zeige Explanation als Text
   - Zeige Raw JSON (optional, für Debugging)

5. **Styling mit Tailwind:**
   - Container, Cards, Buttons
   - Farben: Rot für Phishing, Grün für Legit

### Lernpunkte:
- **React State:** useState für Formular-Daten und API-Ergebnisse
- **API Calls:** async/await, Error Handling
- **Event Handling:** onSubmit, onChange
- **Conditional Rendering:** Zeige Ergebnis nur wenn vorhanden

### Testen:
```bash
cd frontend
npm run dev
```
Öffne http://localhost:5173 und teste das Formular.

## Schritt 4: Integration Testen

### Was du machen musst:

1. **Backend starten** (Port 8000)
2. **Frontend starten** (Port 5173)
3. **Teste die vollständige Pipeline:**
   - E-Mail-Text eingeben
   - URL eingeben (optional)
   - Submit klicken
   - Ergebnis sollte angezeigt werden

### Häufige Probleme:
- **CORS Error:** Backend muss CORS erlauben (`CORSMiddleware`)
- **Connection Error:** Prüfe Backend läuft auf Port 8000
- **JSON Error:** Prüfe Request-Format stimmt mit Schema überein

## Nächste Schritte

Nach Phase A solltest du haben:
✅ Funktionierendes Backend mit Dummy-Modell
✅ Funktionierendes Frontend mit Formular
✅ API-Kommunikation zwischen Frontend und Backend
✅ Grundverständnis von FastAPI und React

**Phase B:** Dann kommen echte Daten und ML-Modelle!

