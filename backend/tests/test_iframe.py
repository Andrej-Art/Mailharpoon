import unittest
from src.http_features import extract_features_from_html

class TestIframe(unittest.TestCase):
    
    def test_no_iframes(self):
        html = "<html><body><p>No iframes here</p></body></html>"
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["iframe"], -1)
        self.assertEqual(meta["iframe_metadata"]["total_iframes"], 0)
        self.assertFalse(meta["iframe_metadata"]["has_iframe"])

    def test_visible_internal_iframe(self):
        html = '<html><body><iframe src="internal.html" width="500" height="300"></iframe></body></html>'
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        # Visible iframe -> 0 (Informational)
        self.assertEqual(res["iframe"], 0)
        self.assertEqual(meta["iframe_metadata"]["total_iframes"], 1)
        self.assertEqual(meta["iframe_metadata"]["hidden_iframes"], 0)
        self.assertEqual(meta["iframe_metadata"]["external_iframes"], 0)

    def test_visible_external_iframe(self):
        html = '<html><body><iframe src="https://youtube.com/embed/video" width="500" height="300"></iframe></body></html>'
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        # Visible external iframe -> 0 (Informational)
        self.assertEqual(res["iframe"], 0)
        self.assertEqual(meta["iframe_metadata"]["total_iframes"], 1)
        self.assertEqual(meta["iframe_metadata"]["hidden_iframes"], 0)
        self.assertEqual(meta["iframe_metadata"]["external_iframes"], 1)
        self.assertIn("youtube.com", meta["iframe_metadata"]["external_iframe_domains"])

    def test_hidden_iframe_attributes(self):
        html = '<html><body><iframe src="http://phish.net" width="0" height="0"></iframe></body></html>'
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        # Hidden iframe -> 1 (Suspicious)
        self.assertEqual(res["iframe"], 1)
        self.assertEqual(meta["iframe_metadata"]["total_iframes"], 1)
        self.assertEqual(meta["iframe_metadata"]["hidden_iframes"], 1)

    def test_hidden_iframe_css(self):
        html = '<html><body><iframe src="http://phish.net" style="display:none"></iframe></body></html>'
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        # Hidden iframe -> 1 (Suspicious)
        self.assertEqual(res["iframe"], 1)
        self.assertEqual(meta["iframe_metadata"]["total_iframes"], 1)
        self.assertEqual(meta["iframe_metadata"]["hidden_iframes"], 1)

    def test_hidden_iframe_visibility(self):
        html = '<html><body><iframe src="http://phish.net" style="visibility:hidden; opacity:0"></iframe></body></html>'
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["iframe"], 1)
        self.assertEqual(meta["iframe_metadata"]["hidden_iframes"], 1)

if __name__ == '__main__':
    unittest.main()
