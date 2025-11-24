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

## Scientific Foundation

This project is based on current research in phishing detection:

- **Classical ML Models:** Following the review by [Qasim et al.](paper/Phishing_Website_Detection_Using_Machine.pdf), we implement Decision Trees, Random Forest, and SVM models that have shown high accuracy in phishing website detection.

- **Hybrid Approach:** Inspired by [Thapa et al. (2025)](https://arxiv.org/html/2507.07406v1), we combine classical ML/DL models (for high accuracy and efficiency) with quantized LLMs (for context-aware detection and explainability). This hybrid approach addresses the challenge of adversarial rephrasing while maintaining computational efficiency.

- **Feature Engineering:** Our feature extraction is based on established research showing that URL structure, domain characteristics, and suspicious patterns are key indicators for phishing detection.

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
   - **URL Structure Features:** URL length, domain length, subdomain count, path depth, query parameters
   - **Domain Features:** IP address detection, URL shortener detection, domain patterns
   - **Security Features:** HTTPS presence, port specification
   - **Suspicious Patterns:** Keyword detection (login, verify, secure, etc.), special character analysis
   - **Statistical Features:** Digit count, character ratios
   - **Text Features:** For email content (to be implemented)

3. **Training**
   - Train/Test split (80/20)
   - Train models (Logistic Regression, Random Forest)
   - Cross-validation

4. **Evaluation**
   - Metrics: Accuracy, Precision, Recall, F1-Score, ROC-AUC
   - Confusion Matrix
   - Model comparison

### Models

**Phase 1: Classical ML Models (Current Focus)**
- **Random Forest:** Primary model - robust, less overfitting, feature importance available (as recommended in Qasim et al.)
- **Logistic Regression:** Fast baseline, interpretable
- **Decision Trees:** Interpretable, good for understanding feature importance
- **SVM:** High accuracy potential (as shown in research)

**Phase 2: Hybrid Approach (Future)**
- **Quantized LLMs:** Lightweight LLMs (e.g., DeepSeek R1 Distill Qwen 14B Q8) for context-aware detection and explainability
- **Ensemble:** Combine ML model predictions with LLM insights for improved robustness against adversarial attacks

### Scripts

- `scripts/preprocess_urls.py` - Prepare URL data ✅
- `backend/app/services/feature_extraction.py` - Feature extraction (in progress)
- `backend/train.py` - Train models (to be created)
- `backend/app/services/model_loader.py` - Load trained models for inference (to be created)

### Research Papers

- [Phishing Website Detection Using Machine Learning: A Review](paper/Phishing_Website_Detection_Using_Machine.pdf) - Qasim et al.
- [Phishing Detection in the Gen-AI Era: Quantized LLMs vs Classical Models](https://arxiv.org/html/2507.07406v1) - Thapa et al. (2025)


## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** FastAPI, Uvicorn
- **ML:** Scikit-learn, Transformers (Hugging Face)
- **Database:** PostgreSQL, SQLAlchemy
- **DevOps:** Docker, Docker Compose, GitHub Actions


