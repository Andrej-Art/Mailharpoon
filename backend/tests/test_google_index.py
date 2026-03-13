import unittest
from src.features.google_index_features import is_domain_indexed

class TestGoogleIndex(unittest.TestCase):
    
    def test_major_domain_indexed(self):
        # Known major domains should return Indexed (-1 risk)
        res = is_domain_indexed("https://google.com/search")
        self.assertTrue(res["is_indexed"])
        self.assertEqual(res["risk_score"], -1)
        self.assertEqual(res["status"], "Indexed")
        self.assertEqual(res["domain_analyzed"], "google.com")

    def test_unknown_domain(self):
        # Unknown domains should return Unknown (0 risk)
        res = is_domain_indexed("https://suspicious-new-site-123.xyz")
        self.assertFalse(res["is_indexed"])
        self.assertEqual(res["risk_score"], 0)
        self.assertEqual(res["status"], "Unknown")
        self.assertEqual(res["domain_analyzed"], "suspicious-new-site-123.xyz")

    def test_api_key_placeholder(self):
        # Providing an API key (placeholder logic)
        res = is_domain_indexed("https://example.com", api_key="test-key")
        self.assertFalse(res["is_indexed"])
        self.assertEqual(res["risk_score"], 0)
        self.assertEqual(res["status"], "Lookup skip (API not implemented yet)")

if __name__ == '__main__':
    unittest.main()
