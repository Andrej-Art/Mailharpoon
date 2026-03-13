import unittest
from src.http_features import is_public_ip, extract_features_from_html, is_safe_url

class TestHttpFeatures(unittest.TestCase):

    def test_is_public_ip(self):
        # Public IPs
        self.assertTrue(is_public_ip("8.8.8.8"))
        self.assertTrue(is_public_ip("1.1.1.1"))
        self.assertTrue(is_public_ip("104.26.10.228"))
        
        # Private / Loopback IPs
        self.assertFalse(is_public_ip("127.0.0.1"))
        self.assertFalse(is_public_ip("192.168.1.1"))
        self.assertFalse(is_public_ip("10.0.0.1"))
        self.assertFalse(is_public_ip("172.16.0.1"))
        self.assertFalse(is_public_ip("::1"))
        self.assertFalse(is_public_ip("169.254.1.1"))

    def test_is_safe_url_ssrf(self):
        # Should block local/private
        is_safe, _ = is_safe_url("http://127.0.0.1")
        self.assertFalse(is_safe)
        
        is_safe, _ = is_safe_url("http://localhost")
        self.assertFalse(is_safe)

    def test_extract_features_from_html(self):
        html = """
        <html>
            <head>
                <link rel="icon" href="/favicon.ico">
                <link rel="stylesheet" href="http://malicious.com/style.css">
            </head>
            <body>
                <a href="/login">Internal Link</a>
                <a href="http://external.com/test">External Link</a>
                <a href="#">Suspicious Link</a>
                <form action="http://phish-target.com/submit"></form>
                <div onmouseover="window.status='http://fake.com'">Hover me</div>
            </body>
        </html>
        """
        final_url = "http://my-legit-site.com/home"
        features, metadata = extract_features_from_html(html, final_url, final_url)
        
        # favicon: internal => -1 (Legit)
        self.assertEqual(features["favicon"], -1)
        
        # on_mouseover: found => 1 (Phish)
        self.assertEqual(features["on_mouseover"], 1)
        
        # iframe: not found => -1 (Legit)
        self.assertEqual(features["iframe"], -1)
        
        # sfh: external action => 1 (Phish)
        self.assertEqual(features["sfh"], 1)

    def test_extract_features_sfh_empty(self):
        html = '<html><body><form action=""></form></body></html>'
        features, metadata = extract_features_from_html(html, "http://test.com", "http://test.com")
        self.assertEqual(features["sfh"], 0)

    def test_extract_features_popup_click(self):
        html = '<html><body><script>window.open("...");</script></body></html>'
        features, metadata = extract_features_from_html(html, "http://test.com", "http://test.com")
        self.assertEqual(features["popupwidnow"], 0)

if __name__ == "__main__":
    unittest.main()
