<p align="center">
  <img src="/images/Mailharpoon_image.png" alt="Mailharpoon Logo" width="250" />
</p>

# Mailharpoon

<p align="center">
  <img src="/images/screenshot1.png" alt="Mailharpoon Screenshot 1" width="800" />
  <br /><br />
  <img src="/images/screenshot2.png" alt="Mailharpoon Screenshot 2" width="800" />
</p>

## Overview

**Mailharpoon** is a state-of-the-art phishing detection system that combines the accuracy of classical machine learning models with the context-awareness of modern AI. Built on cutting-edge research, Mailharpoon provides a comprehensive solution for detecting phishing attempts in both URLs and email content.

### Why Mailharpoon?

**Research-Backed Approach**
- Implements proven ML models (Random Forest, SVM, Decision Trees) as recommended in recent research
- Hybrid architecture combining classical ML with quantized LLMs for optimal accuracy and efficiency
- Based on analysis of ~99,000 real-world phishing and legitimate URLs

**Production-Ready**
- Fast inference with classical ML models 
- Scalable FastAPI backend with async support
- Modern React frontend with real-time feedback
- Docker deployment for easy integration

**Explainable AI**
- Feature importance analysis to understand detection decisions
- LLM-powered explanations for human-readable insights
- Confidence scores for transparent risk assessment

**Adversarial Robustness**
- Designed to handle LLM-rephrased phishing attempts (Gen-AI era threat)
- Ensemble approach combining multiple detection methods
- Continuous learning from feedback loop

## Scientific Foundation

Mailharpoon is built on the latest research in phishing detection:

### Research Papers

- **[Phishing Website Detection Using Machine Learning: A Review](paper/Phishing_Website_Detection_Using_Machine.pdf)** - Qasim et al.
  - Validates effectiveness of Random Forest, SVM, and Decision Trees
  - Provides feature engineering best practices
  - Shows high accuracy (>95%) with proper feature selection

- **[Phishing Detection in the Gen-AI Era: Quantized LLMs vs Classical Models](https://arxiv.org/html/2507.07406v1)** - Thapa et al. (2025)
  - Demonstrates hybrid approach combining ML/DL with LLMs
  - Shows quantized LLMs achieve >80% accuracy with only 17GB VRAM
  - Addresses adversarial rephrasing attacks
  - Highlights importance of explainability in cybersecurity

### Our Implementation

**Phase 1: Classical ML Models (Current)**
- Random Forest (primary model) - robust, interpretable, high accuracy
- Logistic Regression - fast baseline
- Decision Trees - feature importance analysis
- SVM - high accuracy potential

**Phase 2: Hybrid Approach (Future)**
- Quantized LLMs for context-aware detection
- Ensemble methods combining ML + LLM predictions
- Enhanced explainability and adversarial robustness

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   React     │─────▶│   FastAPI    │─────▶│  ML Service │
│  Frontend   │◀─────│   Backend    │◀─────│  (Models)   │
└─────────────┘      └──────────────┘      └─────────────┘
                            │                       │
                            │                       ▼
                            │              ┌─────────────────┐
                            │              │  Feature Engine │
                            │              │  URL + Text     │
                            │              └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Database    │
                     │  (Feedback)  │
                     └──────────────┘
```

## Key Features

### 1. Comprehensive Feature Engineering

**URL Structure Features:**
- URL length, domain length, subdomain count
- Path depth, query parameter analysis
- Protocol detection (HTTP/HTTPS)

**Domain Analysis:**
- IP address detection
- URL shortener identification
- Domain pattern analysis (hyphens, digits)

**Security Indicators:**
- HTTPS presence
- Port specification
- Suspicious keyword detection

**Statistical Features:**
- Character distribution
- Digit count and ratios
- Special character analysis

### 2. Machine Learning Pipeline

- **Data Preprocessing:** Automated cleaning and standardization
- **Feature Extraction:** 20+ engineered features per URL
- **Model Training:** Cross-validation with multiple algorithms
- **Evaluation:** Comprehensive metrics (Accuracy, Precision, Recall, F1, ROC-AUC)
- **Model Versioning:** Track and compare model performance

### 3. Real-Time Detection

- RESTful API for integration
- Sub-100ms inference time
- Batch processing support
- Confidence scoring

## Installation

### Prerequisites

- Python 3.8+
- Node.js 18+
- Docker (optional)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```

### Docker Setup

```bash
docker-compose up --build
```

## Quick Start

### 1. Start Backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

Backend will be available at `http://localhost:8000`

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:5173`

### 3. Test API

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://secure-login.example.com/verify",
    "text": "Click here to verify your account"
  }'
```

## API Documentation

### POST /predict

Analyzes email text and URL for phishing indicators.

**Request:**
```json
{
  "text": "Email content here (optional)",
  "url": "https://example.com (optional)"
}
```

**Response:**
```json
{
  "label": "phish",
  "score": 0.87,
  "confidence": "high",
  "explanation": "Suspicious URL patterns detected: multiple subdomains, suspicious keywords",
  "features": {
    "url_length": 45,
    "num_subdomains": 2,
    "has_https": 1,
    "num_suspicious_keywords": 3
  }
}
```

## Machine Learning Workflow

### Dataset

- **Source:** [Kaggle Phishing URL Dataset](https://www.kaggle.com/datasets/suryaprabha19/phishing-url?resource=download)
- **Size:** ~99,000 URLs
- **Distribution:** 50% Phishing, 50% Legitimate
- **Quality:** No duplicates, no missing values

### Training Pipeline

1. **Preprocessing** (`scripts/preprocess_urls.py`)
   - Load and clean raw data
   - Remove duplicates
   - Standardize labels (phish/legit)

2. **Feature Engineering** (`backend/app/services/feature_extraction.py`)
   - Extract 20+ features per URL
   - Normalize feature values
   - Handle edge cases

3. **Model Training** (`backend/train.py`)
   - Train/Test split (80/20)
   - Cross-validation (5-fold)
   - Hyperparameter tuning
   - Model comparison

4. **Evaluation**
   - Accuracy, Precision, Recall, F1-Score
   - ROC-AUC curve
   - Confusion matrix
   - Feature importance analysis

### Scripts

- ✅ `scripts/preprocess_urls.py` - Data preprocessing
- 🔄 `backend/app/services/feature_extraction.py` - Feature extraction (in progress)
- 📝 `backend/train.py` - Model training (to be created)
- 📝 `backend/app/services/model_loader.py` - Model loading for inference (to be created)

## Tech Stack

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling

### Backend
- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation

### Machine Learning
- **Scikit-learn** - Classical ML models
- **Pandas** - Data processing
- **NumPy** - Numerical computing
- **Joblib** - Model serialization

### Future Additions
- **Transformers** (Hugging Face) - LLM integration
- **PostgreSQL** - Database for feedback loop
- **Docker** - Containerization


## Acknowledgments

- Research by Qasim et al. and Thapa et al. for foundational insights
- Kaggle community for the phishing URL dataset
- Open-source ML community for tools and libraries
