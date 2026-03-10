import unittest
from unittest.mock import patch, MagicMock
import dns.resolver
from features.dns_features import check_dns_record, dns_cache

class TestDnsFeatures(unittest.TestCase):
    def setUp(self):
        dns_cache.clear()

    @patch('dns.resolver.resolve')
    def test_dns_record_success(self, mock_resolve):
        # Mock successful A record lookup
        mock_resolve.return_value = MagicMock()
        
        result = check_dns_record("google.com")
        self.assertEqual(result, -1)
        self.assertIn("google.com", dns_cache)

    @patch('dns.resolver.resolve')
    def test_dns_record_nxdomain(self, mock_resolve):
        # Mock NXDOMAIN
        mock_resolve.side_effect = dns.resolver.NXDOMAIN()
        
        result = check_dns_record("nonexistent-domain-12345.com")
        self.assertEqual(result, 1)

    @patch('dns.resolver.resolve')
    def test_dns_record_timeout(self, mock_resolve):
        # Mock Timeout
        mock_resolve.side_effect = dns.resolver.Timeout()
        
        result = check_dns_record("timeout.com")
        self.assertEqual(result, 0)
        # Timeouts should not be cached
        self.assertNotIn("timeout.com", dns_cache)

    def test_dns_record_empty(self):
        result = check_dns_record("")
        self.assertEqual(result, 1)

if __name__ == "__main__":
    unittest.main()
