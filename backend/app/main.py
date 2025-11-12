from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import PredictRequest, PredictResponse
from app.services.dummy_model import predict

# FastAPI App initialisieren
app = FastAPI(
    title="Phishing Detector API",
    version="1.0.0",
    description="API für Phishing-Detection mit ML-Modellen"
)

# CORS Middleware (für Frontend-Kommunikation)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In Production: spezifische Domains wie ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root Endpunkt"""
    return {
        "message": "Phishing Detector API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """Health Check Endpunkt"""
    return {"status": "healthy"}


@app.post("/predict", response_model=PredictResponse)
async def predict_phishing(request: PredictRequest):
    """Phishing-Detection Endpunkt
    
    Args:
        request: PredictRequest mit text und url
    
    Returns:
        PredictResponse mit label, score und explanation
    """
    # Dummy-Modell aufrufen
    result = predict(request.text, request.url)
    return PredictResponse(**result)