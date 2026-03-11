import unittest
from src.http_features import extract_features_from_html

class TestAssetRatio(unittest.TestCase):
    def test_internal_assets_only(self):
        html = """
        <html>
            <img src="/img/logo.png">
            <script src="js/app.js"></script>
            <link href="styles.css" rel="stylesheet">
            <iframe src="https://example.com/widget"></iframe>
        </html>
        """
        # 4 assets, 1 external (iframe) -> ratio = 1/4 = 0.25 (which maps to 0)
        base_url = "https://example.com"
        final_url = "https://example.com"
        feats, meta = extract_features_from_html(html, base_url, final_url)
        
        self.assertEqual(meta["total_assets"], 4)
        self.assertEqual(meta["external_assets"], 0) # wait, iframe src is example.com, so it's internal
        self.assertEqual(meta["request_url_ratio"], 0.0)
        self.assertEqual(feats["request_url"], -1) # < 0.22

    def test_external_cdn_assets(self):
        html = """
        <html>
            <img src="https://cdn.example.com/logo.png">
            <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
            <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
        </html>
        """
        base_url = "https://example.com"
        final_url = "https://example.com"
        # cdn.example.com is same registrable domain -> internal (not external)
        # googleapis.com x2 -> external
        # total 3, external 2 -> 66% => >0.61 -> 1
        feats, meta = extract_features_from_html(html, base_url, final_url)
        
        self.assertEqual(meta["total_assets"], 3)
        self.assertEqual(meta["external_assets"], 2)
        self.assertAlmostEqual(meta["request_url_ratio"], 0.6666, places=3)
        self.assertEqual(feats["request_url"], 1)
        
    def test_no_assets(self):
        html = "<html><body><h1>Hello World</h1></body></html>"
        base_url = "https://example.com"
        final_url = "https://example.com"
        feats, meta = extract_features_from_html(html, base_url, final_url)
        
        self.assertEqual(meta["total_assets"], 0)
        self.assertEqual(meta["external_assets"], 0)
        self.assertEqual(meta["request_url_ratio"], 0.0)
        self.assertEqual(feats["request_url"], 0) # Defaults to 0 since no assets found but page was fetched
        
    def test_relative_paths(self):
        html = """
        <html>
            <img src="../images/pic.jpg">
            <script src="./main.js"></script>
            <source src="video.mp4">
        </html>
        """
        feats, meta = extract_features_from_html(html, "http://test.com/a/b", "http://test.com/a/b")
        self.assertEqual(meta["total_assets"], 3)
        self.assertEqual(meta["external_assets"], 0)

if __name__ == '__main__':
    unittest.main()
