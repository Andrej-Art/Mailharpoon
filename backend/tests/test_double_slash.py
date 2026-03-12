import unittest
from src.main import extract_features_url_only

class TestDoubleSlash(unittest.TestCase):
    
    def test_legitimate_urls(self):
        # Normal
        res = extract_features_url_only("https://example.com/path")
        self.assertEqual(res["double_slash_redirecting"], -1)
        
        # Credentials but no extra double slashes
        res = extract_features_url_only("https://medium.com/@user/article")
        self.assertEqual(res["double_slash_redirecting"], -1)

    def test_suspicious_urls(self):
        # Basic extra double slash in path
        res = extract_features_url_only("http://example.com//login-update.ru")
        self.assertEqual(res["double_slash_redirecting"], 0)
        
        # Deep path double slash (treating as suspicious per heuristic)
        res = extract_features_url_only("https://example.com/images//logo.png")
        self.assertEqual(res["double_slash_redirecting"], 0)
        
        # Obfuscated
        res = extract_features_url_only("http://safe-site.com//secure-update.xyz")
        self.assertEqual(res["double_slash_redirecting"], 0)

if __name__ == '__main__':
    unittest.main()
