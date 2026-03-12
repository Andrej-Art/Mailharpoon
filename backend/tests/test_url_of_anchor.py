import unittest
from bs4 import BeautifulSoup
from src.http_features import extract_features_from_html

class TestUrlOfAnchor(unittest.TestCase):

    def test_suspicious_anchors(self):
        html_content = """
        <html><body>
            <a href="#">Empty hash</a>
            <a href="javascript:void(0)">JS link</a>
            <a href="https://external.com/login">Login (CTA to external)</a>
            <a href="/internal/path">Internal link</a>
        </body></html>
        """
        feats, meta = extract_features_from_html(html_content, "https://example.com", "https://example.com")
        self.assertEqual(meta["empty_hash_anchors"], 1)
        self.assertEqual(meta["javascript_anchors"], 1)
        self.assertEqual(meta["external_anchors"], 1)
        self.assertEqual(meta["cta_anchors"], 1)
        self.assertEqual(meta["total_anchors"], 4)
        self.assertTrue(meta["url_of_anchor_available"])

    def test_no_anchors(self):
        html_content = "<html><body><h1>No links here</h1></body></html>"
        feats, meta = extract_features_from_html(html_content, "https://example.com", "https://example.com")
        self.assertEqual(meta["total_anchors"], 0)
        self.assertEqual(feats["url_of_anchor"], 0)

if __name__ == '__main__':
    unittest.main()
