# <img src="images/Mailharpoon_image.png" width="80" align="center" /> Mailharpoon: Phishing Detection & Insights
![Status](https://img.shields.io/badge/status-active%20development-orange)

**Mailharpoon** is a machine learning-based tool designed to analyze URLs and identify potential phishing attempts. The project combines data science techniques with an interactive web interface to provide users with a risk score and detailed insights into suspicious URL characteristics.

## Overview

Phishing attacks often use deceptive URLs to trick users into revealing sensitive information. Mailharpoon leverages the **UCI Phishing Websites Dataset** to train classification models that can distinguish between legitimate and malicious websites based on 30+ features (e.g., URL length, SSL state, domain registration length).

## Key Features

- **Interactive URL Analyzer**: Paste a URL to get an instant risk assessment.
- **Machine Learning Insights**: Explore the principles behind the classification models.
- **Educational Content**: Learn what phishing is and how to protect yourself.
- **Modern UI**: A sleek, dark-mode dashboard built with Streamlit.

## Project Structure

- `backend/`: Data processing and model development.
  - `data/`: Raw and processed datasets.
  - `notebooks/`: Jupyter Notebooks for EDA, Preprocessing, and Modeling.
- `frontend_streamlit/`: The interactive web application.
- `images/`: Brand assets and supplementary visuals.
- `requirements.txt`: Project dependencies.

## Tech Stack

- **Language**: Python
- **Web Framework**: Streamlit
- **Data Science**: Pandas, NumPy, Scikit-learn
- **Visualization**: Matplotlib, Seaborn

## How to Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Andrej-Art/Mailharpoon.git
   cd Mailharpoon
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Streamlit app**:
   ```bash
   streamlit run frontend_streamlit/app.py
   ```

---
*Developed by Andrej Artuschenko*
