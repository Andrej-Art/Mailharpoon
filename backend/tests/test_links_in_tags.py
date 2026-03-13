import unittest
from bs4 import BeautifulSoup
from src.http_features import extract_features_from_html

class TestLinksInTags(unittest.TestCase):
    
    def test_legitimate_ratio(self):
        html = """
        <html>
            <head>
                <link rel="stylesheet" href="/style.css">
                <link rel="icon" href="favicon.ico">
                <script src="main.js"></script>
                <script src="https://google-analytics.com/analytics.js"></script>
            </head>
            <body></body>
        </html>
        """
        # 3 internal, 1 external -> 25% external -> -1
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        
        self.assertEqual(res["links_in_tags"], -1)
        self.assertEqual(meta["links_in_tags_metadata"]["total"], 4)
        self.assertEqual(meta["links_in_tags_metadata"]["internal"], 3)
        self.assertEqual(meta["links_in_tags_metadata"]["external"], 1)
        self.assertEqual(meta["links_in_tags_metadata"]["ratio"], 0.25)

    def test_suspicious_ratio(self):
        html = """
        <html>
            <head>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/style.css">
                <script src="https://paypal.com/login.js"></script>
                <script src="https://paypal.com/tracking.js"></script>
                <meta http-equiv="refresh" content="5;url=https://evil.com/redirect">
                <script src="/local.js"></script>
            </head>
            <body></body>
        </html>
        """
        # 1 internal (local.js), 4 external -> 80% external -> 1
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        
        self.assertEqual(res["links_in_tags"], 1)
        self.assertEqual(meta["links_in_tags_metadata"]["total"], 5)
        self.assertEqual(meta["links_in_tags_metadata"]["internal"], 1)
        self.assertEqual(meta["links_in_tags_metadata"]["external"], 4)
        self.assertEqual(meta["links_in_tags_metadata"]["ratio"], 0.8)

    def test_empty_tags(self):
        html = """
        <html>
            <head>
                <script></script>
                <link>
                <meta charset="utf-8">
            </head>
            <body></body>
        </html>
        """
        # 0 valid tags -> ratio 0 -> -1
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        
        self.assertEqual(res["links_in_tags"], -1)
        self.assertEqual(meta["links_in_tags_metadata"]["total"], 0)
        self.assertEqual(meta["links_in_tags_metadata"]["ratio"], 0.0)

if __name__ == '__main__':
    unittest.main()
