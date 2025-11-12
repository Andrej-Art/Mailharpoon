from schemas import PredictRequest, PredictResponse

request = PredictRequest(text="test email", url="https://example.com")
print(request.text)  # "test email"
print(request.url)   # "https://example.com"

response = PredictResponse(
    label="phish",
    score=0.87,
    explanation="Suspicious patterns detected"
)
print(response.label)  # "phish"
