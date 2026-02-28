# the fastapi framework will handle url predictions for the bakend api

import uvicorn
from fastapi import FastAPI 
from pydantic import BaseModel
from pathlib import Path
import joblib



# load the rf model 
base_directory = Path(__file__).resolve().parents[1]
model_path = base_directory /"models"/"rf_url_only"/ "rf_url_final.joblib"
model = joblib.load(model_path)

# load the features
feature_path = base_directory/"models"/"rf_url_only"/ "rf_url_features.json"
with open(feature_path, "r") as f:
    feature_columns = json.load(f)

# load the threshold
threshold_path = base_directory/"models"/"rf_url_only"/ "rf_url_only_threshold.json"
with open(threshold_path, "r") as f:
    threshold = float(json.load(f)["threshold"])

# create fastapi app
app = FastAPI(
    title="Mailharpoon",
    description = "Phishing Detection API",
    version = "1.0.0"
)



#define the input sheme using pydantic

class URLFeatures(BaseModel):
    having_ip_address: int
    url_length: int
    shortining_service: int
    having_at_symbol: int
    double_slash_redirecting: int
    prefix_suffix: int
    having_sub_domain: int
    https_token: int

    class Config:
    

@app.get("/")
def read_root():
    return {"Hello": "World"}

