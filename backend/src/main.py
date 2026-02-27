# the fastapi framework will handle url predictions for the bakend api

import uvicorn
from fastapi import FastAPI 
from pydantic import BaseModel



# create fastapi app
app = FastAPI(
    title="Mailharpoon",
    description = "Phishing Detection API",
    version = "1.0.0"
)

@app.get("/")
def read_root():
    return {"Hello": "World"}

