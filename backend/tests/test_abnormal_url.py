import unittest
from unittest.mock import patch, MagicMock
from src.main import extract_features_rf_full

class TestAbnormalURL(unittest.TestCase):
    
    @patch('src.main.check_ssl_certificate')
    @patch('src.main.safe_fetch_html')
    @patch('src.main.get_ip_geolocation')
    @patch('src.main.get_domain_dates')
    def test_consistent_google(self, mock_dates, mock_geo, mock_fetch, mock_ssl):
        # Mocking google.com
        mock_ssl.return_value = (-1, {
            "subject_cn": "*.google.com",
            "sans": ["google.com", "*.google.com"],
            "issuer": "Google Trust Services",
            "expiry": "2025-01-01"
        })
        mock_fetch.return_value = {
            "allowed": True,
            "status_code": 200,
            "redirect_count": 0,
            "final_url": "https://www.google.com/",
            "resolved_ip": "142.250.1.1",
            "html": "<html></html>",
            "error": None
        }
        mock_geo.return_value = {"status": "success", "org": "Google LLC", "isp": "Google LLC"}
        mock_dates.return_value = {}

        res, meta, fetch = extract_features_rf_full("https://www.google.com", extended=True)
        
        # Should be consistent
        self.assertEqual(res["abnormal_url"], -1)
        self.assertTrue(meta["abnormal_url_metadata"]["is_consistent"])
        self.assertEqual(meta["abnormal_url_metadata"]["detected_infrastructure"], "Google Cloud / CDN")

    @patch('src.main.check_ssl_certificate')
    @patch('src.main.safe_fetch_html')
    @patch('src.main.get_ip_geolocation')
    def test_inconsistent_mismatch(self, mock_geo, mock_fetch, mock_ssl):
        # Mocking a mismatch: Hostname paypal.com on a cheap server with unrelated cert
        mock_ssl.return_value = (-1, {
            "subject_cn": "cheap-hosting.ru",
            "sans": ["cheap-hosting.ru"],
            "issuer": "Let's Encrypt",
            "expiry": "2025-01-01"
        })
        mock_fetch.return_value = {
            "allowed": True,
            "status_code": 200,
            "redirect_count": 0,
            "final_url": "https://paypal-secure-check.com/",
            "resolved_ip": "1.2.3.4",
            "html": "<html></html>",
            "error": None
        }
        mock_geo.return_value = {"status": "success", "org": "Cheap Hosting Ltd", "isp": "Cheap ISP"}

        res, meta, fetch = extract_features_rf_full("https://paypal-secure-check.com", extended=True)
        
        # Should be INCONSISTENT
        self.assertEqual(res["abnormal_url"], 1)
        self.assertFalse(meta["abnormal_url_metadata"]["is_consistent"])

    @patch('src.main.check_ssl_certificate')
    @patch('src.main.safe_fetch_html')
    @patch('src.main.get_ip_geolocation')
    def test_cdn_consistency(self, mock_geo, mock_fetch, mock_ssl):
        # Even if cert CN differs (common with some CDN setups), CDN in infra should pass as consistent
        mock_ssl.return_value = (-1, {
            "subject_cn": "sni.cloudflare.com",
            "sans": ["sni.cloudflare.com"],
            "issuer": "Cloudflare",
            "expiry": "2025-01-01"
        })
        mock_fetch.return_value = {
            "allowed": True,
            "status_code": 200,
            "redirect_count": 0,
            "final_url": "https://example-on-cloudflare.com/",
            "resolved_ip": "104.16.1.1",
            "html": "<html></html>",
            "error": None
        }
        mock_geo.return_value = {"status": "success", "org": "Cloudflare, Inc.", "isp": "Cloudflare"}

        res, meta, fetch = extract_features_rf_full("https://example-on-cloudflare.com", extended=True)
        
        # Should be CONSISTENT due to CDN detection
        self.assertEqual(res["abnormal_url"], -1)
        self.assertTrue(meta["abnormal_url_metadata"]["is_consistent"])

if __name__ == '__main__':
    unittest.main()
