import unittest
from src.security.tls_checks import check_ssl_certificate

class TestTlsChecks(unittest.TestCase):

    def test_http_url(self):
        """Case 3: http://example.com -> return 1 (Phishing)"""
        status, meta = check_ssl_certificate("http://example.com")
        self.assertEqual(status, 1)
        self.assertIn("No HTTPS scheme", meta["error"])

    def test_valid_https(self):
        """Case 1: Valid HTTPS -> return -1 (Legitimate)"""
        status, meta = check_ssl_certificate("https://www.google.com")
        self.assertEqual(status, -1)
        self.assertIsNotNone(meta["issuer"])
        self.assertIsNotNone(meta["expiry"])

    def test_expired_ssl(self):
        """Case 2: Expired SSL -> return 1 (Phishing)"""
        status, meta = check_ssl_certificate("https://expired.badssl.com")
        self.assertEqual(status, 1)
        self.assertIn("SSL Error", meta["error"])

    def test_wrong_host_ssl(self):
        """Case 2: Wrong Host SSL -> return 1 (Phishing)"""
        status, meta = check_ssl_certificate("https://wrong.host.badssl.com")
        self.assertEqual(status, 1)
        self.assertIn("SSL Error", meta["error"])

    def test_self_signed_ssl(self):
        """Case 2: Self-signed SSL -> return 1 (Phishing)"""
        status, meta = check_ssl_certificate("https://self-signed.badssl.com")
        self.assertEqual(status, 1)
        self.assertIn("SSL Error", meta["error"])

    def test_ssrf_blocking(self):
        """SSRF Protection: Private IPs -> return 1 (Phishing)"""
        status_ip, meta_ip = check_ssl_certificate("https://127.0.0.1")
        self.assertEqual(status_ip, 1)
        self.assertIn("Private IP blocked", meta_ip["error"])
        
        status_priv, meta_priv = check_ssl_certificate("https://192.168.1.1")
        self.assertEqual(status_priv, 1)
        self.assertIn("Private IP blocked", meta_priv["error"])

if __name__ == "__main__":
    unittest.main()
