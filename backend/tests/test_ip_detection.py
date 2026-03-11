import unittest
from main import detect_ip_type

class TestIpDetection(unittest.TestCase):
    def test_ipv4(self):
        result, label = detect_ip_type("192.168.1.1")
        self.assertEqual(result, 1)
        self.assertEqual(label, "Direct IPv4 address")

    def test_ipv6(self):
        result, label = detect_ip_type("[2001:db8::1]")
        self.assertEqual(result, 1)
        self.assertEqual(label, "Direct IPv6 address")
        
        # Test without brackets too (just in case)
        result, label = detect_ip_type("2001:db8::1")
        self.assertEqual(result, 1)
        self.assertEqual(label, "Direct IPv6 address")

    def test_hex_ip(self):
        result, label = detect_ip_type("0xC0A80101")
        self.assertEqual(result, 1)
        self.assertEqual(label, "Obfuscated IP (Hexadecimal)")

    def test_int_ip(self):
        result, label = detect_ip_type("3232235777")
        self.assertEqual(result, 1)
        self.assertEqual(label, "Obfuscated IP (Integer)")

    def test_legit_domain(self):
        result, label = detect_ip_type("google.com")
        self.assertEqual(result, -1)
        self.assertEqual(label, "Registered domain")

    def test_legit_domain_with_numbers(self):
        result, label = detect_ip_type("3d-secure.com")
        self.assertEqual(result, -1)
        self.assertEqual(label, "Registered domain")

    def test_empty(self):
        result, label = detect_ip_type("")
        self.assertEqual(result, -1)
        self.assertEqual(label, "Empty")

if __name__ == "__main__":
    unittest.main()
