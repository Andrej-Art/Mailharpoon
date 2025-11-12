# Phase B: Daten & ML Baseline

## Übersicht
In dieser Phase sammeln wir echte Daten, extrahieren Features und trainieren unser erstes ML-Modell.

## Schritt 1: Daten sammeln & aufbereiten

### Was du lernen wirst:
- Datenquellen für Phishing-Detection
- Preprocessing-Pipeline (Text → Features)
- Train/Test-Split
- Datenvalidierung

### Datenquellen:

1. **Legitime E-Mails:**
   - Enron Email Dataset (Kaggle)
   - Eigenes E-Mail-Archiv (optional, anonymisiert)

2. **Phishing E-Mails:**
   - PhishTank (kostenlose API)
   - Kaggle Phishing Email Datasets
   - OpenPhish (optional)

3. **URL-Datasets:**
   - PhishTank URL-Liste
   - Kaggle URL-Phishing-Datasets

### Aufgaben:

1. **`backend/app/data/` Verzeichnis anlegen:**
   - `raw/` - Rohdaten
   - `processed/` - Aufbereitete Daten
   - `train/` - Trainingsdaten
   - `test/` - Testdaten

2. **Preprocessing-Pipeline erstellen:**
   - `backend/app/services/preprocessing.py`
   - Funktionen:
     - `html_to_text(html: str) -> str` - HTML entfernen
     - `clean_text(text: str) -> str` - Stopwords, Zeichen entfernen
     - `extract_urls(text: str) -> list[str]` - URLs extrahieren
     - `extract_domain_features(url: str) -> dict` - Domain-Features

3. **Daten-Loader:**
   - `backend/app/services/data_loader.py`
   - Funktionen:
     - `load_emails(directory: str) -> list[dict]`
     - `load_labels(directory: str) -> list[int]`
     - `create_dataset(emails: list, labels: list) -> pd.DataFrame`

### Lernpunkte:
- **Text Preprocessing:** Warum entfernen wir HTML? Was sind Stopwords?
- **Feature Extraction:** Welche Informationen sind wichtig?
- **Data Splitting:** Warum 80/20 oder 70/20/10?
- **Label Encoding:** 0 = legit, 1 = phishing

## Schritt 2: Feature Engineering

### Was du lernen wirst:
- Text-Features (TF-IDF, Bag of Words)
- URL-Features (Domain, Subdomain, IP)
- Meta-Features (Anzahl Links, Bilder, Formulare)

### Feature-Typen:

1. **Text-Features:**
   - TF-IDF (unigram + bigram)
   - Text-Länge
   - Anzahl Uppercase-Zeichen
   - Anzahl Sonderzeichen
   - Anzahl URLs im Text

2. **URL-Features:**
   - Domain-Länge
   - Anzahl Subdomains
   - IP-Adresse statt Domain?
   - Suspicious Tokens (login, secure, verify)
   - HTTPS vorhanden?
   - Domain-Alter (optional, requires API)

3. **Meta-Features:**
   - Anzahl Links
   - Anzahl Bilder
   - Formulare vorhanden?
   - Anhänge vorhanden?

### Aufgaben:

1. **Feature Extractor erstellen:**
   - `backend/app/services/feature_extraction.py`
   - Klassen:
     - `TextFeatureExtractor`
     - `URLFeatureExtractor`
     - `MetaFeatureExtractor`
   - Funktion: `extract_all_features(email: dict) -> np.array`

2. **Vectorizer erstellen:**
   - `backend/app/services/vectorizer.py`
   - TF-IDF Vectorizer (sklearn)
   - Fit auf Trainingsdaten
   - Transform auf Testdaten

### Lernpunkte:
- **TF-IDF:** Term Frequency × Inverse Document Frequency
- **Feature Scaling:** Warum wichtig für ML?
- **Feature Selection:** Welche Features sind wichtig?
- **Dimensionalität:** Zu viele Features = Overfitting?

## Schritt 3: Training & Evaluation

### Was du lernen wirst:
- Baseline-Modelle (LogisticRegression, RandomForest)
- Cross-Validation
- Metriken (Precision, Recall, F1, ROC-AUC)
- Hyperparameter-Tuning

### Modelle:

1. **LogisticRegression:**
   - Schnell, interpretierbar
   - Gute Baseline

2. **RandomForest:**
   - Robuster, weniger Overfitting
   - Feature Importance verfügbar

3. **Optional: XGBoost:**
   - Oft beste Performance
   - Komplexer zu tunen

### Aufgaben:

1. **Training-Skript erstellen:**
   - `backend/train.py`
   - Lädt Daten
   - Extrahiert Features
   - Train/Test-Split (80/20)
   - Trainiert Modelle
   - Evaluiert mit Metriken
   - Speichert Modelle

2. **Evaluation-Modul:**
   - `backend/app/services/evaluation.py`
   - Funktionen:
     - `calculate_metrics(y_true, y_pred) -> dict`
     - `plot_confusion_matrix(y_true, y_pred)`
     - `plot_roc_curve(y_true, y_pred_proba)`

3. **Metriken berechnen:**
   - Precision, Recall, F1-Score
   - ROC-AUC
   - Precision@k (optional)

4. **Cross-Validation:**
   - K-Fold CV (k=5)
   - Durchschnittliche Metriken

### Lernpunkte:
- **Train/Test-Split:** Warum nicht alles zum Training?
- **Overfitting:** Wie erkenne ich es?
- **Metriken:** Welche Metrik ist wichtig für Phishing?
- **Hyperparameter:** Was sind sie? Wie finde ich gute Werte?

## Schritt 4: Persistierung

### Was du lernen wirst:
- Model-Serialisierung (joblib, pickle)
- Model-Versioning
- Model-Loading im Backend

### Aufgaben:

1. **Model-Speicherung:**
   - `models/v1/` - Model-Versionen
   - Speichere: Modell, Vectorizer, Feature-Selector
   - Metadaten: Training-Datum, Metriken, Version

2. **Model-Loading im Backend:**
   - `backend/app/services/model_loader.py`
   - Funktion: `load_model(version: str) -> Model`
   - Lädt Modell + Vectorizer beim Start

3. **Model-Update:**
   - Funktion: `update_model(new_model_path: str)`
   - Hot-Reload (optional)

### Lernpunkte:
- **Serialisierung:** Warum joblib statt pickle?
- **Versioning:** Warum wichtig?
- **Model-Deployment:** Wie lade ich ein Modell im Produktivbetrieb?

## Nächste Schritte

Nach Phase B solltest du haben:
✅ Trainiertes ML-Modell (LogisticRegression oder RandomForest)
✅ Feature-Extraction-Pipeline
✅ Evaluation-Metriken
✅ Modell geladen im Backend (ersetzt Dummy-Modell)

**Phase C:** Dann kommen Explainability und Verbesserungen!

