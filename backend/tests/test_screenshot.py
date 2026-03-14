import unittest
import asyncio
import os
import hashlib
from src.security.screenshot_service import capture_screenshot, SCREENSHOT_DIR

class TestScreenshot(unittest.TestCase):
    
    def test_hashed_filename(self):
        url = "https://example.com"
        url_hash = hashlib.sha256(url.encode('utf-8')).hexdigest()
        expected_filename = f"{url_hash}.png"
        
        # SHA-256 is 64 characters long
        self.assertTrue(expected_filename.endswith(".png"))
        self.assertEqual(len(url_hash), 64)

    def test_capture_real_page(self):
        # We need an event loop to run the async function
        url = "https://www.google.com"
        result = asyncio.run(capture_screenshot(url))
        
        self.assertTrue(result["success"], f"Screenshot failed: {result.get('error')}")
        self.assertIsNotNone(result["screenshot_url"])
        
        # Verify file exists
        filename = result["screenshot_url"].split("/")[-1]
        filepath = os.path.join(SCREENSHOT_DIR, filename)
        self.assertTrue(os.path.exists(filepath))
        self.assertTrue(os.path.getsize(filepath) > 0)

    def test_capture_invalid_url(self):
        url = "https://this-is-not-a-real-domain-123.xyz"
        result = asyncio.run(capture_screenshot(url))
        
        self.assertFalse(result["success"])
        self.assertIsNotNone(result["error"])

if __name__ == '__main__':
    unittest.main()
