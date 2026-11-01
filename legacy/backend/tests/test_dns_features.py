import unittest
from unittest.mock import patch, MagicMock
import dns.resolver
from features.dns_features import check_dns_record, dns_cache

class TestDnsFeatures(unittest.TestCase):
    def setUp(self):
        dns_cache.clear()

    @patch('dns.resolver.resolve')
    def test_dns_record_success_a(self, mock_resolve):
        # Mock successful A record lookup
        mock_resolve.return_value = MagicMock()
        
        status, metadata = check_dns_record("google.com")
        self.assertEqual(status, -1)
        self.assertTrue(metadata["a_record"])
        self.assertEqual(metadata["resolution"], "Successful")
        self.assertIn("google.com", dns_cache)

    @patch('dns.resolver.resolve')
    def test_dns_record_cname_only(self, mock_resolve):
        # Mock only CNAME success
        def side_effect(domain, rdtype, **kwargs):
            if rdtype == 'CNAME':
                mock_answer = MagicMock()
                mock_answer.target = "cdn.example.com"
                return [mock_answer]
            raise dns.resolver.NoAnswer()
            
        mock_resolve.side_effect = side_effect
        
        status, metadata = check_dns_record("www.example.com")
        self.assertEqual(status, -1)
        self.assertFalse(metadata["a_record"])
        self.assertTrue(metadata["cname_record"])
        self.assertEqual(metadata["cname_target"], "cdn.example.com")

    @patch('dns.resolver.resolve')
    def test_dns_record_nxdomain(self, mock_resolve):
        # Mock NXDOMAIN
        mock_resolve.side_effect = dns.resolver.NXDOMAIN()
        
        status, metadata = check_dns_record("nonexistent-domain-12345.com")
        self.assertEqual(status, 1)
        self.assertFalse(metadata["a_record"])
        self.assertEqual(metadata["error"], "NXDOMAIN (Does not exist)")

    @patch('dns.resolver.resolve')
    def test_dns_record_timeout(self, mock_resolve):
        # Mock Timeout
        mock_resolve.side_effect = dns.resolver.Timeout()
        
        status, metadata = check_dns_record("timeout.com")
        self.assertEqual(status, 0)
        self.assertEqual(metadata["error"], "Timeout")
        # Timeouts should not be cached
        self.assertNotIn("timeout.com", dns_cache)

    def test_dns_record_empty(self):
        status, metadata = check_dns_record("")
        self.assertEqual(status, 1)
        self.assertEqual(metadata["error"], "Empty domain")

if __name__ == "__main__":
    unittest.main()

