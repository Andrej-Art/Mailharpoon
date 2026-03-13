import unittest
from unittest.mock import patch
from src.main import extract_features_rf_full

class TestPort(unittest.TestCase):
    
    @patch('src.main.check_dns_record')
    def test_default_ports(self, mock_dns):
        mock_dns.return_value = (1, {"note": "mock"})
        res, meta, _ = extract_features_rf_full("https://medium.com")
        self.assertEqual(res["port"], -1)
        self.assertEqual(meta["port_metadata"]["detected_port"], 443)
        self.assertFalse(meta["port_metadata"]["is_explicit"])
        
        res2, meta2, _ = extract_features_rf_full("http://example.com")
        self.assertEqual(res2["port"], -1)
        self.assertEqual(meta2["port_metadata"]["detected_port"], 80)
        self.assertFalse(meta2["port_metadata"]["is_explicit"])

    @patch('src.main.check_dns_record')
    def test_explicit_standard_ports(self, mock_dns):
        mock_dns.return_value = (1, {"note": "mock"})
        # Even if explicit, if it's the standard port it should be completely fine.
        res, meta, _ = extract_features_rf_full("https://example.com:443")
        self.assertEqual(res["port"], -1)
        self.assertEqual(meta["port_metadata"]["detected_port"], 443)
        self.assertTrue(meta["port_metadata"]["is_explicit"])
        
        res2, meta2, _ = extract_features_rf_full("http://example.com:80")
        self.assertEqual(res2["port"], -1)
        self.assertEqual(meta2["port_metadata"]["detected_port"], 80)
        self.assertTrue(meta2["port_metadata"]["is_explicit"])

    @patch('src.main.check_dns_record')
    def test_explicit_non_standard_ports(self, mock_dns):
        mock_dns.return_value = (1, {"note": "mock"})
        res, meta, _ = extract_features_rf_full("http://example.com:8080")
        self.assertEqual(res["port"], 0)
        self.assertEqual(meta["port_metadata"]["detected_port"], 8080)
        self.assertTrue(meta["port_metadata"]["is_explicit"])
        
        res2, meta2, _ = extract_features_rf_full("https://example.com:4443")
        self.assertEqual(res2["port"], 0)
        self.assertEqual(meta2["port_metadata"]["detected_port"], 4443)
        
        res3, meta3, _ = extract_features_rf_full("http://localhost:3000")
        self.assertEqual(res3["port"], 0)
        self.assertEqual(meta3["port_metadata"]["detected_port"], 3000)

    @patch('src.main.check_dns_record')
    def test_ipv6_formatting(self, mock_dns):
        mock_dns.return_value = (1, {"note": "mock"})
        res, meta, _ = extract_features_rf_full("http://[2001:db8::1]:8080")
        self.assertEqual(res["port"], 0)
        self.assertEqual(meta["port_metadata"]["detected_port"], 8080)
        
        # Valid IPv6 without port
        res2, meta2, _ = extract_features_rf_full("https://[2001:db8::1]")
        self.assertEqual(res2["port"], -1)
        self.assertEqual(meta2["port_metadata"]["detected_port"], 443)


if __name__ == '__main__':
    unittest.main()
