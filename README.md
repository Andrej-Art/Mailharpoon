<p align="center">
  <img src="/images/Mailharpoon_image.png" alt="Mailharpoon Logo" width="250" />
</p>

# Mailharpoon

<p align="center">
  <img src="/images/screenshot1.png" alt="Mailharpoon Screenshot 1" width="800" />
  <br /><br />
  <img src="/images/screenshot2.png" alt="Mailharpoon Screenshot 2" width="800" />
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

### Dataset

The project uses URL data from the [Kaggle Phishing URL Dataset](https://www.kaggle.com/datasets/suryaprabha19/phishing-url?resource=download).

- **Number of URLs:** ~99,000
- **Class Distribution:** ~50% Phishing, ~50% Legitimate
- **Data Quality:** No duplicates, no missing values

### Workflow

1. **Preprocessing** (`scripts/preprocess_urls.py`)
   - Load and clean data
   - Remove duplicates
   - Standardize labels (phish/legit)

2. **Feature Engineering**
   - Extract URL features (Domain, Path, Query parameters, etc.)
   - Text features (for emails)

3. **Training**
   - Train/Test split (80/20)
   - Train models (Logistic Regression, Random Forest)
   - Cross-validation

4. **Evaluation**
   - Metrics: Accuracy, Precision, Recall, F1-Score, ROC-AUC
   - Confusion Matrix
   - Model comparison

### Models

- **Logistic Regression:** Fast, interpretable, good baseline
- **Random Forest:** Robust, less overfitting, feature importance available
- **Optional:** XGBoost, Transformers (DistilBERT)

### Scripts

- `scripts/preprocess_urls.py` - Prepare URL data
- `backend/train.py` - Train models (to be created)
- `backend/app/services/feature_extraction.py` - Feature extraction (to be created)


## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** FastAPI, Uvicorn
- **ML:** Scikit-learn, Transformers (Hugging Face)
- **Database:** PostgreSQL, SQLAlchemy
- **DevOps:** Docker, Docker Compose, GitHub Actions


