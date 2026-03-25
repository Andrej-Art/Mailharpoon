# <img src="images/Mailharpoon_image.png" width="80" align="top" /> Mailharpoon: Phishing Detection & Insights

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.133.1-009688.svg)](https://fastapi.tiangolo.com/)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.54.0-FF4B4B.svg)](https://streamlit.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.8.0-F7931E.svg)](https://scikit-learn.org/)

By combining advanced feature extraction with a robust Random Forest classifier, it provides real-time risk assessment and deep network intelligence for any given URL.

<p align="center">
  <img src="images/mailharpoon_preview.gif" alt="Mailharpoon app preview" width="800">
  <br>
  <em>Preview of the Mailharpoon URL analysis workflow</em>
</p>

---

## 🚀 Key Features

- **🧠 Intelligent Detection**: Uses a Random Forest model trained on the UCI Phishing Dataset to classify URLs based on 30+ distinct technical features.
- **🌐 Network Intelligence**: Performs real-time DNS records, SSL/TLS certificate validation, and WHOIS domain age lookups.
- **📸 Visual Preview**: Safely captures a full-page screenshot of the target site using Playwright to identify visual deception.
- **🛡️ Reputation Checks**: Integrates with reputation APIs to check domains against known blacklists.
- **⚡ High Performance**: Fast inference engine built with FastAPI and an interactive, modern dashboard powered by Streamlit.
- **🐳 Deployment Ready**: Fully containerized with Docker and Docker Compose for seamless deployment in any environment.

---

## System Architecture

<p align="center">
  <img src="./system_Architecture.png" alt="MailHarpoon Architecture" width="800">
</p>

The system follows a modern, containerized microservices architecture:
1.  **Frontend (Streamlit)**: High-level UI for user interaction and report generation.
2.  **Backend (FastAPI)**: Heavy-lifting service for feature extraction, external lookups, and model inference.
3.  **Intelligence Layer**: Asynchronous tasks for screenshot capturing and multi-source data gathering.

---

## Machine Learning Model

The project classifies URLs using a **Random Forest classifier**, which was selected after evaluating multiple different algorithms. **Random Forest achieved the best performance**, demonstrating excellent robustness against overfitting, strong generalization, and the ability to effectively handle a highly diverse set of features (ranging from URL structures to network signals). These results directly power the phishing prediction system used in the application.

### Model Performance

This section highlights the training and validation results for the selected Random Forest model.

<p align="center">
  <img src="images/train_test_performance.png" alt="Train vs Test Performance" width="600">
  <br>
  <em>Comparison of training versus testing performance</em>
</p>

The Train vs. Test comparison displays highly stable performance metrics across both datasets. The minimal drop-off in performance on the unseen test data indicates extremely low overfitting and confirms the reliability of the model.

<p align="center">
  <img src="images/rf_cross_validation.png" alt="Random Forest Cross-Validation" width="600">
  <br>
  <em>Cross-validation results for the Random Forest model</em>
</p>

The cross-validation results reinforce the model's reliability. With consistently high and tight metric clusters across different data splits, the classifier proves excellent generalization capabilities.

---

## 🛠️ Tech Stack

- **Frontend**: Streamlit
- **Backend**: FastAPI, Uvicorn, Pydantic, Playwright, Requests
- **Machine Learning**: Scikit-Learn, Joblib, NumPy, Pandas
- **DevOps**: Docker, Docker Compose, Pathlib (deployment-safe path logic)

---

## 📁 Project Structure

```text
mailharpoon/
├── backend/                # FastAPI Microservice
│   ├── src/                # Source code (API, Logic, Config)
│   ├── models/             # Trained ML models & feature sets
│   └── Dockerfile          # Backend containerization
├── frontend_streamlit/     # Streamlit Web App
│   ├── pages/              # Multi-page application structure
│   ├── images/             # UI assets
│   └── Dockerfile          # Frontend containerization
├── docker-compose.yml      # Multi-container orchestration
├── .env.example            # Deployment environment template
└── requirements.txt        # Full project dependencies
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Docker & Docker Compose (Recommended)

### Option 1: Running with Docker (Recommended)
The fastest way to get the entire system up and running:

```bash
# Clone the repository
git clone https://github.com/Andrej-Art/Mailharpoon.git
cd Mailharpoon

# Launch the system
docker-compose up --build
```
*The frontend will be available at `http://localhost:8501`, and the backend at `http://localhost:8000`.*

### Option 2: Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Start Backend
cd backend/src
python main.py

# Start Frontend (in a new terminal)
cd frontend_streamlit
streamlit run app.py
```

---

## API Reference

### Predict URL
`POST /predict-url`

**Request:**
```json
{
  "url": "https://suspicious-site.com/login",
  "model": "rf_full",
  "extended": true
}
```

**Response:**
```json
{
  "prediction": "Malicious",
  "phishing_probability": 0.86,
  "legit_probability": 0.14,
  "model_used": "rf_full"
}
```

---

## Author
**Andrej Artuschenko**
- GitHub: [@Andrej-Art](https://github.com/Andrej-Art)
- Email: andrejart95@gmail.com

