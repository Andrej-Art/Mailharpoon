import unittest
from main import analyze_subdomains

class TestSubdomainDetection(unittest.TestCase):
    def test_no_subdomain(self):
        res = analyze_subdomains("https://medium.com")
        self.assertEqual(res["subdomain_count"], 0)
        self.assertEqual(res["domain"], "medium")
        self.assertEqual(res["suffix"], "com")

    def test_single_subdomain(self):
        res = analyze_subdomains("https://mail.google.com")
        self.assertEqual(res["subdomain_count"], 1)
        self.assertEqual(res["subdomains"], ["mail"])

    def test_multi_level_tld(self):
        # Naive split(":") would find 'amazon' as a subdomain of 'co.uk'
        res = analyze_subdomains("https://bbc.co.uk")
        self.assertEqual(res["subdomain_count"], 0)
        self.assertEqual(res["domain"], "bbc")
        self.assertEqual(res["suffix"], "co.uk")

    def test_nested_subdomain_with_multi_tld(self):
        res = analyze_subdomains("https://login.secure.amazon.co.uk")
        self.assertEqual(res["subdomain_count"], 2)
        self.assertEqual(res["subdomains"], ["login", "secure"])
        self.assertEqual(res["domain"], "amazon")
        self.assertEqual(res["suffix"], "co.uk")

    def test_ignore_paths_and_auth(self):
        res = analyze_subdomains("https://medium.com/@username/article-title")
        self.assertEqual(res["subdomain_count"], 0)
        
    def test_phishing_pattern(self):
        res = analyze_subdomains("http://secure-login.paypal.account-update.xyz")
        self.assertEqual(res["subdomain_count"], 2)
        self.assertEqual(res["subdomains"], ["secure-login", "paypal"])
        self.assertEqual(res["domain"], "account-update")

if __name__ == "__main__":
    unittest.main()
