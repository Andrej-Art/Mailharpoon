import unittest
from unittest.mock import patch
from src.features.reputation_features import check_domain_reputation

class TestReputation(unittest.TestCase):
    
    @patch('requests.post')
    def test_domain_clean(self, mock_post):
        # Mocking URLHaus 'no_results' response
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"query_status": "no_results"}
        
        res = check_domain_reputation("https://google.com")
        self.assertEqual(res["risk_score"], -1)
        self.assertFalse(res["urlhaus_match"])
        self.assertEqual(res["status"], "Clean")

    @patch('requests.post')
    def test_domain_malicious_single(self, mock_post):
        # Mocking URLHaus 'ok' response with 1 URL
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "query_status": "ok",
            "urls": [{"url": "http://evil.com/phish"}]
        }
        
        # Clear cache for testing
        from src.features.reputation_features import reputation_cache
        reputation_cache.clear()
        
        res = check_domain_reputation("https://evil.com")
        self.assertEqual(res["risk_score"], 0) # Moderate
        self.assertTrue(res["urlhaus_match"])
        self.assertEqual(res["urlhaus_detections"], 1)

    @patch('requests.post')
    def test_domain_malicious_multiple(self, mock_post):
        # Mocking URLHaus 'ok' response with multiple URLs
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "query_status": "ok",
            "urls": [
                {"url": "http://evil.com/phish1"},
                {"url": "http://evil.com/phish2"}
            ]
        }
        
        from src.features.reputation_features import reputation_cache
        reputation_cache.clear()
        
        res = check_domain_reputation("https://evil.com")
        self.assertEqual(res["risk_score"], 1) # High Risk
        self.assertTrue(res["urlhaus_match"])
        self.assertEqual(res["urlhaus_detections"], 2)

if __name__ == '__main__':
    unittest.main()
