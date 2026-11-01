import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone
from features.domain_metadata_features import (
    get_domain_age, 
    get_domain_registration_length, 
    get_registrable_domain,
    whois_cache
)

class TestDomainMetadataFeatures(unittest.TestCase):
    def setUp(self):
        whois_cache.clear()

    def test_get_registrable_domain(self):
        self.assertEqual(get_registrable_domain("https://sub.example.co.uk/test"), "example.co.uk")
        self.assertEqual(get_registrable_domain("http://google.com"), "google.com")
        self.assertEqual(get_registrable_domain("https://127.0.0.1"), "127.0.0.1")

    @patch('whois.whois')
    def test_age_of_domain_old(self, mock_whois):
        # Mock old domain (2 years old)
        creation_date = datetime.now(timezone.utc) - timedelta(days=730)
        mock_whois.return_value = {"creation_date": creation_date}
        
        result = get_domain_age("old-domain.com")
        self.assertEqual(result, -1)

    @patch('whois.whois')
    def test_age_of_domain_new(self, mock_whois):
        # Mock new domain (1 month old)
        creation_date = datetime.now(timezone.utc) - timedelta(days=30)
        mock_whois.return_value = {"creation_date": creation_date}
        
        result = get_domain_age("new-domain.com")
        self.assertEqual(result, 1)

    @patch('whois.whois')
    def test_registration_length_long(self, mock_whois):
        # Mock long registration (2 years left)
        expiration_date = datetime.now(timezone.utc) + timedelta(days=730)
        mock_whois.return_value = {"expiration_date": expiration_date}
        
        result = get_domain_registration_length("long-reg.com")
        self.assertEqual(result, -1)

    @patch('whois.whois')
    def test_registration_length_short(self, mock_whois):
        # Mock short registration (3 months left)
        expiration_date = datetime.now(timezone.utc) + timedelta(days=90)
        mock_whois.return_value = {"expiration_date": expiration_date}
        
        result = get_domain_registration_length("short-reg.com")
        self.assertEqual(result, 1)

    @patch('whois.whois')
    def test_whois_error(self, mock_whois):
        mock_whois.side_effect = Exception("WHOIS Error")
        
        self.assertEqual(get_domain_age("error.com"), 0)
        self.assertEqual(get_domain_registration_length("error.com"), 0)

if __name__ == "__main__":
    unittest.main()
