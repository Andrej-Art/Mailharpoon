import unittest
from src.http_features import extract_features_from_html

class TestPopupWidnow(unittest.TestCase):
    
    def test_browser_popup_apis_in_scripts(self):
        html = """
        <html>
            <script>
                function login() {
                    window.open("login.html");
                    alert("Please login");
                }
                function reset() {
                    prompt("Enter email");
                    confirm("Are you sure?");
                }
            </script>
        </html>
        """
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["popupwidnow"], 0)
        self.assertTrue(meta["popupwidnow_metadata"]["is_detected"])
        self.assertEqual(meta["popupwidnow_metadata"]["counts"]["window.open"], 1)
        self.assertEqual(meta["popupwidnow_metadata"]["counts"]["alert"], 1)
        self.assertEqual(meta["popupwidnow_metadata"]["counts"]["prompt"], 1)
        self.assertEqual(meta["popupwidnow_metadata"]["counts"]["confirm"], 1)

    def test_browser_popup_apis_in_handlers(self):
        html = """
        <button onclick="alert('Hello')">Click Me</button>
        <a href="#" onmouseover="window.open('phish.html')">Hover</a>
        """
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["popupwidnow"], 0)
        self.assertEqual(meta["popupwidnow_metadata"]["counts"]["alert"], 1)
        self.assertEqual(meta["popupwidnow_metadata"]["counts"]["window.open"], 1)

    def test_legitimate_ui_modals_not_detected(self):
        # HTML/CSS based modals should NOT trigger browser-level detection
        html = """
        <div class="modal fade" id="myModal">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h4 class="modal-title">Legit Modal</h4>
              </div>
              <div class="modal-body">
                This is a Bootstrap modal, not a browser popup.
              </div>
            </div>
          </div>
        </div>
        """
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["popupwidnow"], -1)
        self.assertFalse(meta["popupwidnow_metadata"]["is_detected"])
        self.assertEqual(meta["popupwidnow_metadata"]["total_calls"], 0)

    def test_no_popups(self):
        html = "<html><body><p>Normal Page</p></body></html>"
        res, meta = extract_features_from_html(html, "https://example.com", "https://example.com")
        self.assertEqual(res["popupwidnow"], -1)
        self.assertFalse(meta["popupwidnow_metadata"]["is_detected"])

if __name__ == '__main__':
    unittest.main()
