from app.services.dummy_model import predict

def test_predict():
    result = predict("test email", "https://example.com")
    assert "label" in result
    assert "score" in result
    assert "explanation" in result
    assert result["label"] in ["phish", "legit"]
    assert 0.0 <= result["score"] <= 1.0
    print("Dummy-Model Test: OK")

if __name__ == "__main__":
    test_predict()
