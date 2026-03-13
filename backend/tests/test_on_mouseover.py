import unittest
from bs4 import BeautifulSoup
from src.http_features import extract_features_from_html

class TestOnMouseover(unittest.TestCase):
    
    def test_legitimate_hover(self):
        html = """
        <html>
            <body>
                <div onmouseover="showTooltip()" onmouseenter="this.classList.add('active')">Hover me</div>
                <button onmouseover="playAnimation()">Click</button>
            </body>
        </html>
        """
        # Legitimate UI handlers -> -1
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        
        self.assertEqual(res["on_mouseover"], -1)
        self.assertEqual(meta["on_mouseover_metadata"]["total_hover_handlers"], 3)
        self.assertFalse(meta["on_mouseover_metadata"]["is_suspicious"])
        self.assertEqual(len(meta["on_mouseover_metadata"]["malicious_scripts_found"]), 0)

    def test_malicious_status_manipulation(self):
        html = """
        <html>
            <body>
                <a href="http://evil.com/login" onmouseover="window.status='https://paypal.com'; return true;">Login</a>
            </body>
        </html>
        """
        # Status bar manipulation -> 1
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        
        self.assertEqual(res["on_mouseover"], 1)
        self.assertTrue(meta["on_mouseover_metadata"]["is_suspicious"])
        self.assertIn("window.status='https://paypal.com'; return true;", meta["on_mouseover_metadata"]["malicious_scripts_found"])

    def test_malicious_location_redirection(self):
        html = '<div onmouseenter="location.href=\'http://phish.net\'">Surprise</div>'
        # Redirect on hover -> 1
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        
        self.assertEqual(res["on_mouseover"], 1)
        self.assertTrue(meta["on_mouseover_metadata"]["is_suspicious"])

    def test_no_hover_events(self):
        html = "<html><body><p>Hello World</p></body></html>"
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        
        self.assertEqual(res["on_mouseover"], -1)
        self.assertEqual(meta["on_mouseover_metadata"]["total_hover_handlers"], 0)

if __name__ == '__main__':
    unittest.main()
