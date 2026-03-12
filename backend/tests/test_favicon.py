import unittest
from src.http_features import extract_features_from_html

class TestFavicon(unittest.TestCase):
    
    def test_local_favicon_absolute(self):
        html = """
        <html>
            <head>
                <link rel="icon" href="https://example.com/favicon.ico">
            </head>
            <body></body>
        </html>
        """
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["favicon"], -1)
        self.assertTrue(meta["favicon_metadata"]["is_same_domain"])

    def test_local_favicon_relative(self):
        html = """
        <html>
            <head>
                <link rel="shortcut icon" href="/static/logo.png">
            </head>
            <body></body>
        </html>
        """
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["favicon"], -1)
        self.assertTrue(meta["favicon_metadata"]["is_same_domain"])
        
    def test_external_favicon(self):
        html = """
        <html>
            <head>
                <link rel="apple-touch-icon" href="https://cdn.example.net/icon.png">
            </head>
            <body></body>
        </html>
        """
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["favicon"], 0)
        self.assertFalse(meta["favicon_metadata"]["is_same_domain"])

    def test_fallback_favicon(self):
        # No icon tag, so it should fallback to /favicon.ico and resolve to local domain.
        html = "<html><head></head><body></body></html>"
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["favicon"], -1)
        self.assertEqual(meta["favicon_url"], "https://example.com/favicon.ico")

if __name__ == '__main__':
    unittest.main()
