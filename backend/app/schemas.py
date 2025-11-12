# imports
from pydantic import BaseModel, Field, validator
from typing import Optional
from enum import Enum


class Label(str, Enum):
    """Enum für Phishing-Labels"""
    PHISH = "phish"
    LEGIT = "legit"


class PredictRequest(BaseModel):
    """Request Schema für Phishing-Detection"""
    text: str = Field(..., min_length=1, description="E-Mail-Text")
    url: Optional[str] = Field(None, description="URL (optional)")
    
    @validator('text')
    def text_must_not_be_empty(cls, v):
        """Validiert, dass Text nicht leer ist"""
        if not v.strip():
            raise ValueError('Text darf nicht leer sein')
        return v


class PredictResponse(BaseModel):
    """Response Schema für Phishing-Detection"""
    label: str  # "phish" oder "legit"
    score: float  # Confidence Score (0.0 - 1.0)
    explanation: str  # Erklärung, warum klassifiziert
