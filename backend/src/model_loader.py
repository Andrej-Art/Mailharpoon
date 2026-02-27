# this script is for loading the suitable model, features and threshold

import joblib 
import json
from pathlib import Path

base_directory = Path(__file__).resolve().parents[1]


# defining paths 
model_path = base_directory /"models"/ "rf_full_final.joblib"
feature_path = base_directory/"models"/ "rf_full_features.json"
threshold_path = base_directory/"models"/ "rf_threshold.json"


model = joblib.load(model_path)

with open(feature_path, "r") as f:
    feature_columns = json.load(f)

with open(threshold_path, "r") as f:
    threshold = float(json.load(f)["threshold"])
