# imports
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from enum import Enum


class Label(str, Enum):
    """Enum für Phishing-Labels"""
    PHISH = "phish"
    LEGIT = "legit"


class PredictRequest(BaseModel):
    """Request Schema für Phishing-Detection"""
    text: Optional[str] = Field(None, description="E-Mail-Text (optional)")
    url: Optional[str] = Field(None, description="URL (optional)")
    
    @field_validator('text')
    @classmethod
    def text_must_not_be_empty_if_provided(cls, v):
        """Validiert, dass Text nicht leer ist, wenn angegeben"""
        if v is not None and not v.strip():
            raise ValueError('Text darf nicht leer sein, wenn angegeben')
        return v
    
    @model_validator(mode='after')
    def at_least_one_must_be_provided(self):
        """Validiert, dass mindestens Text oder URL angegeben wird"""
        text = self.text
        url = self.url
        
        # Prüfe, ob Text vorhanden und nicht leer
        has_text = text is not None and text.strip()
        # Prüfe, ob URL vorhanden und nicht leer
        has_url = url is not None and url.strip()
        
        if not has_text and not has_url:
            raise ValueError('Mindestens E-Mail-Text oder URL muss angegeben werden')
        
        return self


class PredictResponse(BaseModel):
    """Response Schema für Phishing-Detection"""
    label: str  # "phish" oder "legit"
    score: float  # Confidence Score (0.0 - 1.0)
    explanation: str  # Erklärung, warum klassifiziert
