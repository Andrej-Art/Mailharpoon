import unittest
from unittest.mock import patch
from src.main import extract_features_rf_full

class TestHttpsToken(unittest.TestCase):
    
    @patch('src.main.check_dns_record')
    def test_legitimate_urls(self, mock_dns):
        mock_dns.return_value = (1, {"note": "mock"})
        res, meta, _ = extract_features_rf_full("https://medium.com")
        self.assertEqual(res["https_token"], -1)
        self.assertFalse(meta["https_token_metadata"]["has_token"])
        
        # HTTPS in the path should be ignored
        res2, meta2, _ = extract_features_rf_full("https://example.com/https-guide")
        self.assertEqual(res2["https_token"], -1)
        self.assertFalse(meta2["https_token_metadata"]["has_token"])

    @patch('src.main.check_dns_record')
    def test_suspicious_domain(self, mock_dns):
        mock_dns.return_value = (1, {"note": "mock"})
        # Token in the registered domain
        res, meta, _ = extract_features_rf_full("http://https-paypal.com")
        self.assertEqual(res["https_token"], 0)
        self.assertTrue(meta["https_token_metadata"]["has_token"])
        self.assertTrue(meta["https_token_metadata"]["in_domain"])
        self.assertFalse(meta["https_token_metadata"]["in_subdomain"])

    @patch('src.main.check_dns_record')
    def test_suspicious_subdomain(self, mock_dns):
        mock_dns.return_value = (1, {"note": "mock"})
        # Token in the subdomain
        res, meta, _ = extract_features_rf_full("http://secure-https.example.com")
        self.assertEqual(res["https_token"], 0)
        self.assertTrue(meta["https_token_metadata"]["has_token"])
        self.assertFalse(meta["https_token_metadata"]["in_domain"])
        self.assertTrue(meta["https_token_metadata"]["in_subdomain"])


if __name__ == '__main__':
    unittest.main()
