import unittest
from src.main import extract_features_url_only

class TestAtSymbol(unittest.TestCase):

    def test_at_in_path_is_not_suspicious(self):
        """medium.com/@user - @ in path should NOT be flagged"""
        feats = extract_features_url_only("https://medium.com/@duygujones/article")
        self.assertEqual(feats["having_at_symbol"], -1, "@ in path should be legitimate (-1)")

    def test_at_in_query_is_not_suspicious(self):
        """example.com/search?q=@admin - @ in query should NOT be flagged"""
        feats = extract_features_url_only("https://example.com/search?q=@admin")
        self.assertEqual(feats["having_at_symbol"], -1, "@ in query should be legitimate (-1)")

    def test_at_in_fragment_is_not_suspicious(self):
        """example.com/path#@section - @ in fragment should NOT be flagged"""
        feats = extract_features_url_only("https://example.com/path#@section")
        self.assertEqual(feats["having_at_symbol"], -1, "@ in fragment should be legitimate (-1)")

    def test_at_in_authority_is_suspicious(self):
        """paypal.com@evil.com - @ in netloc IS phishing-relevant"""
        feats = extract_features_url_only("http://paypal.com@evil.com/login")
        self.assertEqual(feats["having_at_symbol"], 1, "@ in authority should be phishing (1)")

    def test_at_with_credentials_is_suspicious(self):
        """user:pass@host.com - userinfo present IS phishing-relevant"""
        feats = extract_features_url_only("http://user:pass@host.com")
        self.assertEqual(feats["having_at_symbol"], 1, "Userinfo credentials should be phishing (1)")

    def test_at_authority_spoof_is_suspicious(self):
        """login.microsoft.com@bad-domain.ru - classic authority spoofing"""
        feats = extract_features_url_only("http://login.microsoft.com@bad-domain.ru/login")
        self.assertEqual(feats["having_at_symbol"], 1, "Authority spoofing must be phishing (1)")

    def test_no_at_everywhere(self):
        """No @ at all - should be legitimate -1"""
        feats = extract_features_url_only("https://example.com/login")
        self.assertEqual(feats["having_at_symbol"], -1)


if __name__ == '__main__':
    unittest.main()
