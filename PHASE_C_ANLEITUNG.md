# Phase C: Verbesserungen & UX

## Übersicht
In dieser Phase verbessern wir das Modell, fügen Explainability hinzu und implementieren einen Feedback-Loop.

## Schritt 1: Explainability

### Was du lernen wirst:
- LIME (Local Interpretable Model-agnostic Explanations)
- SHAP (SHapley Additive exPlanations)
- Feature Importance
- Token-Level Explanations

### Methoden:

1. **LIME:**
   - Lokale Erklärungen
   - Funktioniert mit jedem Modell
   - Zeigt wichtigste Features

2. **SHAP:**
   - Theoretisch fundiert
   - Zeigt Feature-Contributions
   - Global und lokal

3. **Feature Importance:**
   - Für Tree-basierte Modelle (RandomForest)
   - Zeigt wichtigste Features insgesamt

### Aufgaben:

1. **LIME-Integration:**
   - `backend/app/services/explainer.py`
   - Klasse: `LIMEExplainer`
   - Funktion: `explain(text: str, url: str) -> dict`
   - Gibt Top-K Features zurück

2. **SHAP-Integration:**
   - `backend/app/services/shap_explainer.py`
   - Klasse: `SHAPExplainer`
   - Funktion: `explain(text: str, url: str) -> dict`
   - Gibt Feature-Contributions zurück

3. **Frontend-Update:**
   - Zeige wichtige Features in der UI
   - Visualisiere Feature-Contributions
   - Highlight wichtige Tokens im Text

### Lernpunkte:
- **Explainability:** Warum wichtig für ML?
- **LIME vs SHAP:** Wann welche Methode?
- **Feature Attribution:** Was bedeutet "wichtig"?
- **User Trust:** Wie baut man Vertrauen auf?

## Schritt 2: Transformer-Option

### Was du lernen wirst:
- Transformers (DistilBERT, BERT)
- Fine-Tuning für Text-Klassifikation
- Hugging Face Transformers
- Tokenization

### Modelle:

1. **DistilBERT:**
   - Schneller als BERT
   - Gute Performance
   - Weniger Parameter

2. **BERT:**
   - Beste Performance
   - Mehr Parameter
   - Langsamer

3. **Pretrained Classifier:**
   - Verwendung ohne Fine-Tuning
   - Schneller Start
   - Weniger Anpassung

### Aufgaben:

1. **Transformer-Service:**
   - `backend/app/services/transformer_model.py`
   - Klasse: `TransformerModel`
   - Funktion: `predict(text: str) -> dict`
   - Lädt DistilBERT-Modell

2. **Fine-Tuning (optional):**
   - `backend/train_transformer.py`
   - Fine-Tune DistilBERT auf Phishing-Daten
   - Speichere Modell

3. **Model-Switching:**
   - Backend kann zwischen klassischem Modell und Transformer wechseln
   - Konfiguration über Environment-Variable

### Lernpunkte:
- **Transformers:** Was sind sie? Warum so mächtig?
- **Fine-Tuning:** Wann nötig? Wann nicht?
- **Tokenization:** Wie funktioniert sie?
- **Attention:** Was ist Attention?

## Schritt 3: Feedback-Loop

### Was du lernen wirst:
- Datenbank-Integration (SQLite/PostgreSQL)
- Feedback-Sammlung
- Retraining-Pipeline

### Aufgaben:

1. **Datenbank-Setup:**
   - `backend/app/database.py`
   - SQLAlchemy Models
   - Tabelle: `feedback` (id, text, url, predicted_label, user_label, timestamp)

2. **Feedback-API:**
   - `backend/app/main.py`
   - POST `/feedback` Endpunkt
   - Speichert Feedback in DB

3. **Frontend-Update:**
   - "Report incorrect" Button
   - Formular für korrektes Label
   - Feedback senden

4. **Retraining-Pipeline:**
   - `backend/app/services/retraining.py`
   - Funktion: `retrain_model(feedback_data: list)`
   - Lädt alte Daten + Feedback
   - Trainiert neues Modell
   - Validiert vor Deployment

### Lernpunkte:
- **Feedback-Loop:** Warum wichtig?
- **Active Learning:** Wie nutze ich Feedback?
- **Data Quality:** Wie filtere ich schlechtes Feedback?
- **Retraining:** Wann retrainen? Wie oft?

## Schritt 4: Security & Auth

### Was du lernen wirst:
- JWT (JSON Web Tokens)
- Authentication & Authorization
- Role-based Access Control
- Password Hashing

### Aufgaben:

1. **Auth-Service:**
   - `backend/app/services/auth.py`
   - Funktionen:
     - `hash_password(password: str) -> str`
     - `verify_password(password: str, hash: str) -> bool`
     - `create_jwt_token(user_id: int) -> str`
     - `verify_jwt_token(token: str) -> dict`

2. **User-Model:**
   - `backend/app/models/user.py`
   - SQLAlchemy Model
   - Felder: id, username, email, password_hash, role

3. **Auth-Endpoints:**
   - POST `/auth/login`
   - POST `/auth/register` (optional)
   - GET `/auth/me`

4. **Protected Routes:**
   - `@require_auth` Decorator
   - `@require_role(role: str)` Decorator
   - Admin-Route für Feedback-Review

5. **Frontend-Auth:**
   - Login-Formular
   - Token-Speicherung (localStorage)
   - Protected Routes

### Lernpunkte:
- **JWT:** Wie funktioniert es?
- **Password Hashing:** Warum nicht plaintext?
- **Authorization:** Unterschied zu Authentication?
- **Security Best Practices:** Was ist wichtig?

## Schritt 5: Tests

### Was du lernen wirst:
- Unit Tests (pytest)
- Integration Tests
- E2E Tests (optional)
- Test Coverage

### Aufgaben:

1. **Unit Tests:**
   - `tests/unit/`
   - Tests für:
     - Preprocessing
     - Feature Extraction
     - Model Prediction
     - Auth Functions

2. **Integration Tests:**
   - `tests/integration/`
   - Tests für:
     - API Endpoints
     - Database Operations
     - Model Loading

3. **E2E Tests (optional):**
   - `tests/e2e/`
   - Playwright oder Cypress
   - Tests für Frontend-Flows

4. **Test Coverage:**
   - `pytest-cov` für Coverage
   - Ziel: >80% Coverage

### Lernpunkte:
- **Testing:** Warum wichtig?
- **Unit vs Integration:** Unterschied?
- **Test Coverage:** Was ist es? Warum wichtig?
- **TDD:** Test-Driven Development?

## Nächste Schritte

Nach Phase C solltest du haben:
✅ Explainability (LIME/SHAP)
✅ Transformer-Option (optional)
✅ Feedback-Loop
✅ Auth & Security
✅ Tests

**Phase D:** Dann kommt Deployment & Production!

