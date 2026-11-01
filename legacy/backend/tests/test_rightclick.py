import unittest
from src.http_features import extract_features_from_html

class TestRightClick(unittest.TestCase):
    
    def test_oncontextmenu_attribute_blocking(self):
        html = '<body oncontextmenu="return false;"></body>'
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["rightclick"], 0)
        self.assertTrue(meta["rightclick_metadata"]["is_blocked"])
        self.assertIn("oncontextmenu attribute", meta["rightclick_metadata"]["blocking_method"])

    def test_script_based_blocking(self):
        html = '<script>document.oncontextmenu = function() { return false; }</script>'
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["rightclick"], 0)
        self.assertTrue(meta["rightclick_metadata"]["is_blocked"])
        self.assertIn("Script-based", meta["rightclick_metadata"]["blocking_method"])

    def test_event_listener_blocking(self):
        html = """
        <script>
        document.addEventListener("contextmenu", function(e) {
            e.preventDefault();
        });
        </script>
        """
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["rightclick"], 0)
        self.assertTrue(meta["rightclick_metadata"]["is_blocked"])

    def test_legitimate_custom_menu(self):
        # This handler does NOT block default behavior
        html = '<script>document.addEventListener("contextmenu", showMyMenu);</script>'
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["rightclick"], -1)
        self.assertFalse(meta["rightclick_metadata"]["is_blocked"])

    def test_no_blocking(self):
        html = "<html><body></body></html>"
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["rightclick"], -1)
        self.assertFalse(meta["rightclick_metadata"]["is_blocked"])

if __name__ == '__main__':
    unittest.main()
