import unittest
from src.main import extract_features_rf_full

class TestPrefixSuffix(unittest.TestCase):
    
    def test_legitimate_no_hyphen(self):
        res, meta, _ = extract_features_rf_full("https://medium.com/@user")
        self.assertEqual(res["prefix_suffix"], -1)
        self.assertFalse(meta["prefix_suffix_metadata"]["has_hyphen_domain"])
        self.assertFalse(meta["prefix_suffix_metadata"]["has_hyphen_subdomain"])
        
    def test_legitimate_with_hyphen(self):
        # A hyphen exists, but no suspicious keywords.
        res, meta, _ = extract_features_rf_full("https://my-company.com")
        self.assertEqual(res["prefix_suffix"], 0)
        self.assertTrue(meta["prefix_suffix_metadata"]["has_hyphen_domain"])
        self.assertIn("company", meta["prefix_suffix_metadata"]["tokens"])
        
        res2, meta2, _ = extract_features_rf_full("https://open-data.org/report")
        self.assertEqual(res2["prefix_suffix"], 0)

    def test_hyphen_in_path_ignored(self):
        # Hyphen only in path, not domain.
        res, meta, _ = extract_features_rf_full("https://example.com/reset-password")
        self.assertEqual(res["prefix_suffix"], -1)

    def test_suspicious_patterns(self):
        # Suspicious keywords combined with hyphens
        res, meta, _ = extract_features_rf_full("http://paypal-security-login.com")
        self.assertEqual(res["prefix_suffix"], 1)
        self.assertIn("paypal", meta["prefix_suffix_metadata"]["tokens"])
        self.assertIn("security", meta["prefix_suffix_metadata"]["tokens"])
        
        res2, meta2, _ = extract_features_rf_full("http://microsoft-account-verify.net")
        self.assertEqual(res2["prefix_suffix"], 1)
        
        res3, meta3, _ = extract_features_rf_full("http://secure-login.apple-update.org")
        self.assertEqual(res3["prefix_suffix"], 1)
        self.assertTrue(meta3["prefix_suffix_metadata"]["has_hyphen_subdomain"])

if __name__ == '__main__':
    unittest.main()
