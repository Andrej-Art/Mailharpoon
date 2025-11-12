# Phase D: Deployment & Production

## Übersicht
In dieser Phase dockerisieren wir die Anwendung, richten CI/CD ein und deployen sie in die Cloud.

## Schritt 1: Dockerize

### Was du lernen wirst:
- Docker Basics
- Dockerfile erstellen
- Docker Compose
- Multi-Stage Builds

### Aufgaben:

1. **Backend-Dockerfile:**
   - `backend/Dockerfile`
   - Multi-Stage Build:
     - Stage 1: Dependencies installieren
     - Stage 2: App kopieren
     - Stage 3: Production Image
   - Expose Port 8000

2. **Frontend-Dockerfile:**
   - `frontend/Dockerfile`
   - Build React-App
   - Serve mit Nginx
   - Expose Port 80

3. **Docker Compose:**
   - `docker-compose.yml`
   - Services:
     - `backend` (FastAPI)
     - `frontend` (React + Nginx)
     - `db` (PostgreSQL)
   - Volumes für Daten
   - Networks für Kommunikation

4. **Environment-Variables:**
   - `.env.example` (Template)
   - `.env` (gitignored)
   - Variablen: DB_URL, JWT_SECRET, MODEL_PATH

### Lernpunkte:
- **Docker:** Was ist es? Warum nützlich?
- **Multi-Stage Builds:** Warum kleiner?
- **Docker Compose:** Wann verwenden?
- **Environment Variables:** Warum wichtig?

## Schritt 2: CI/CD

### Was du lernen wirst:
- GitHub Actions
- Automated Testing
- Automated Building
- Automated Deployment

### Aufgaben:

1. **GitHub Actions Workflow:**
   - `.github/workflows/ci.yml`
   - Steps:
     - Lint (flake8, black, eslint)
     - Tests (pytest, npm test)
     - Build Images
     - Push to Container Registry
     - Deploy (optional)

2. **Linting:**
   - Backend: `flake8`, `black`, `mypy`
   - Frontend: `eslint`, `prettier`
   - Pre-commit Hooks (optional)

3. **Testing:**
   - Run Tests auf jedem Push
   - Coverage Report
   - Fail bei fehlgeschlagenen Tests

4. **Build & Push:**
   - Build Docker Images
   - Push zu Docker Hub / GitHub Container Registry
   - Tag mit Version/Git-SHA

### Lernpunkte:
- **CI/CD:** Was ist es? Warum wichtig?
- **GitHub Actions:** Wie funktioniert es?
- **Automated Testing:** Warum automatisch?
- **Container Registry:** Was ist es?

## Schritt 3: Deployment

### Was du lernen wirst:
- Cloud-Provider auswählen
- Deployment-Strategien
- Secrets Management
- Monitoring & Logging

### Cloud-Provider-Optionen:

1. **Render:**
   - Einfach zu nutzen
   - Kostenlos für kleine Projekte
   - Automatisches Deployment

2. **Railway:**
   - Einfach zu nutzen
   - Gute Developer Experience
   - Automatisches Deployment

3. **DigitalOcean:**
   - Mehr Kontrolle
   - Günstig
   - Droplet-Management

4. **AWS/GCP:**
   - Enterprise-Grade
   - Mehr Features
   - Komplexer

### Aufgaben:

1. **Deployment-Konfiguration:**
   - `render.yaml` oder `railway.json`
   - Environment Variables setzen
   - Build Commands
   - Start Commands

2. **Secrets Management:**
   - Secrets in Cloud-Provider speichern
   - Nicht in Git committen
   - Rotate regelmäßig

3. **Database Setup:**
   - Managed Database (Render, Railway)
   - Oder eigene PostgreSQL-Instance
   - Migrations beim Start

4. **Domain & SSL:**
   - Custom Domain einrichten
   - SSL-Zertifikat (automatisch)
   - HTTPS erzwingen

### Lernpunkte:
- **Deployment:** Was bedeutet es?
- **Secrets Management:** Warum wichtig?
- **SSL/HTTPS:** Warum notwendig?
- **Database Migrations:** Was sind sie?

## Schritt 4: Monitoring & Logging

### Was du lernen wirst:
- Logging (Structured Logging)
- Monitoring (Metrics, Alerts)
- Error Tracking (Sentry)
- Performance Monitoring

### Aufgaben:

1. **Logging:**
   - `backend/app/services/logger.py`
   - Structured Logging (JSON)
   - Log Levels (DEBUG, INFO, WARNING, ERROR)
   - Log Rotation

2. **Monitoring:**
   - Prometheus Metrics (optional)
   - Health Check Endpoint
   - Metrics: Requests, Errors, Latency

3. **Error Tracking:**
   - Sentry Integration
   - Error Alerts
   - Stack Traces

4. **Performance Monitoring:**
   - Response Time Tracking
   - Database Query Time
   - Model Inference Time

### Lernpunkte:
- **Logging:** Warum wichtig?
- **Monitoring:** Was überwachen?
- **Error Tracking:** Wie nutzen?
- **Performance:** Wie messen?

## Schritt 5: Production-Ready Features

### Was du lernen wirst:
- Rate Limiting
- Caching
- Load Balancing
- Backup & Recovery

### Aufgaben:

1. **Rate Limiting:**
   - `slowapi` oder `fastapi-limiter`
   - Limit: X Requests pro Minute
   - IP-basiert oder User-basiert

2. **Caching:**
   - Redis für Caching
   - Cache häufig verwendete Anfragen
   - Cache-Invalidation

3. **Load Balancing:**
   - Mehrere Backend-Instanzen
   - Load Balancer (Nginx, Cloudflare)
   - Health Checks

4. **Backup & Recovery:**
   - Database Backups
   - Model Backups
   - Disaster Recovery Plan

### Lernpunkte:
- **Rate Limiting:** Warum wichtig?
- **Caching:** Wann nützlich?
- **Load Balancing:** Wann notwendig?
- **Backup:** Warum kritisch?

## Nächste Schritte

Nach Phase D solltest du haben:
✅ Dockerisierte Anwendung
✅ CI/CD Pipeline
✅ Deployed Application
✅ Monitoring & Logging
✅ Production-Ready Features

**Fertig!** 🎉 Du hast einen vollständigen Phishing-Detector gebaut!

