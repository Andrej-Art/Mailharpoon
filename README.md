<p align="center">
  <img src="/images/Mailharpoon_image.png" alt="Mailharpoon Logo" width="250" />
</p>

# Mailharpoon

<p align="center">
  <img src="/images/screenshot.png" alt="Mailharpoon Screenshot" width="800" />
</p>

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


## Installation

To install the required and libraries, run this command in the project directory after Forkinf and cloning this repository: 

```

´´´


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

## Comparison and Training of Machine Learning Models


## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** FastAPI, Uvicorn
- **ML:** Scikit-learn, Transformers (Hugging Face)
- **Database:** PostgreSQL, SQLAlchemy
- **DevOps:** Docker, Docker Compose, GitHub Actions


