import unittest
from bs4 import BeautifulSoup
from src.http_features import extract_features_from_html

class TestSFH(unittest.TestCase):
    
    def test_internal_handlers(self):
        html = """
        <html>
            <body>
                <form action="/login"></form>
                <form action="https://example.com/submit"></form>
            </body>
        </html>
        """
        # All internal -> -1
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        
        self.assertEqual(res["sfh"], -1)
        self.assertEqual(meta["sfh_metadata"]["total"], 2)
        self.assertEqual(meta["sfh_metadata"]["internal"], 2)
        self.assertEqual(meta["sfh_metadata"]["external"], 0)
        self.assertEqual(meta["sfh_metadata"]["empty"], 0)

    def test_empty_handlers(self):
        html = """
        <html>
            <body>
                <form></form>
                <form action=""></form>
                <form action="about:blank"></form>
                <form action="#"></form>
                <form action="javascript:void(0)"></form>
            </body>
        </html>
        """
        # All empty / js handlers -> 0
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        
        self.assertEqual(res["sfh"], 0)
        self.assertEqual(meta["sfh_metadata"]["total"], 5)
        self.assertEqual(meta["sfh_metadata"]["internal"], 0)
        self.assertEqual(meta["sfh_metadata"]["external"], 0)
        self.assertEqual(meta["sfh_metadata"]["empty"], 5)

    def test_external_handlers(self):
        html = """
        <html>
            <body>
                <form action="/search"></form>
                <form action="https://evil-server.ru/collect"></form>
            </body>
        </html>
        """
        # One external handler -> 1
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        
        self.assertEqual(res["sfh"], 1)
        self.assertEqual(meta["sfh_metadata"]["total"], 2)
        self.assertEqual(meta["sfh_metadata"]["internal"], 1)
        self.assertEqual(meta["sfh_metadata"]["external"], 1)
        self.assertIn("https://evil-server.ru/collect", meta["sfh_metadata"]["external_urls"])

    def test_no_forms(self):
        html = "<html><body></body></html>"
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["sfh"], -1)
        self.assertEqual(meta["sfh_metadata"]["total"], 0)

if __name__ == '__main__':
    unittest.main()
