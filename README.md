# Phishing Detector

Ein vollständiger Phishing-Detector mit ML-Modellen, Web-Interface und API.

## Übersicht

Dieses Projekt implementiert einen Phishing-Detector, der E-Mails und URLs auf Phishing-Verdacht analysiert. Die Anwendung besteht aus:

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** FastAPI (Python)
- **ML-Models:** Scikit-learn (LogisticRegression, RandomForest) + Optional: Transformers (DistilBERT)
- **Database:** PostgreSQL (oder SQLite für MVP)
- **Deployment:** Docker + CI/CD

## Architektur

```
React Frontend → HTTP(s) → FastAPI Backend → ML Service → Database
                                                    ↓
                                            Model Inference
                                                    ↓
                                            Feedback Loop
```

## Projektstruktur

```
phishing_detector/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI Hauptdatei
│   │   ├── schemas.py           # Pydantic Schemas
│   │   ├── models/              # Database Models
│   │   ├── services/            # Business Logic
│   │   │   ├── preprocessing.py
│   │   │   ├── feature_extraction.py
│   │   │   ├── model_loader.py
│   │   │   ├── explainer.py
│   │   │   └── auth.py
│   │   └── database.py          # Database Setup
│   ├── train.py                 # Training Script
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── components/
│   ├── package.json
│   └── Dockerfile
├── data/                         # Datasets (gitignored)
├── models/                       # Gespeicherte Modelle (gitignored)
├── tests/
├── docker-compose.yml
└── README.md
```

## Phasen

Das Projekt ist in 4 Phasen unterteilt:

1. **Phase A:** Vorbereitung & Minimalprototyp
   - Git-Repository & Struktur
   - Minimal Backend (FastAPI)
   - Minimal Frontend (React)
   - Integration Testen

2. **Phase B:** Daten & ML Baseline
   - Daten sammeln & aufbereiten
   - Feature Engineering
   - Training & Evaluation
   - Persistierung

3. **Phase C:** Verbesserungen & UX
   - Explainability (LIME/SHAP)
   - Transformer-Option
   - Feedback-Loop
   - Security & Auth
   - Tests

4. **Phase D:** Deployment & Production
   - Dockerize
   - CI/CD
   - Deployment
   - Monitoring & Logging
   - Production-Ready Features

## Detaillierte Anleitungen

- [Phase A Anleitung](PHASE_A_ANLEITUNG.md)
- [Phase B Anleitung](PHASE_B_ANLEITUNG.md)
- [Phase C Anleitung](PHASE_C_ANLEITUNG.md)
- [Phase D Anleitung](PHASE_D_ANLEITUNG.md)

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker

```bash
docker-compose up --build
```

## API Endpoints

### POST /predict
Analysiert E-Mail-Text und URL auf Phishing.

**Request:**
```json
{
  "text": "E-Mail-Text hier",
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "label": "phish",
  "score": 0.87,
  "explanation": "Suspicious URL detected..."
}
```

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** FastAPI, Uvicorn
- **ML:** Scikit-learn, Transformers (Hugging Face)
- **Database:** PostgreSQL, SQLAlchemy
- **DevOps:** Docker, Docker Compose, GitHub Actions

## License

MIT

