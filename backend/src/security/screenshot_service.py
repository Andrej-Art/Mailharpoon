import asyncio
import hashlib
import os
import logging
from playwright.async_api import async_playwright
from datetime import datetime

logger = logging.getLogger(__name__)

# Base directory for screenshots
SCREENSHOT_DIR = "/tmp/mailharpoon_screenshots"

def cleanup_screenshots():
    """
    Clears the temporary screenshot directory.
    """
    if os.path.exists(SCREENSHOT_DIR):
        import shutil
        try:
            shutil.rmtree(SCREENSHOT_DIR)
            logger.info("Temporary screenshot directory cleared.")
        except Exception as e:
            logger.error(f"Failed to clear screenshot directory: {str(e)}")
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

async def capture_screenshot(url: str) -> dict:
    """
    Captures a full-page screenshot of the given URL using Playwright.
    Returns metadata about the capture including success status and file path.
    """
    if not os.path.exists(SCREENSHOT_DIR):
        os.makedirs(SCREENSHOT_DIR, exist_ok=True)

    # Generate a hashed filename based on the URL (SHA-256)
    url_hash = hashlib.sha256(url.encode('utf-8')).hexdigest()
    filename = f"{url_hash}.png"
    filepath = os.path.join(SCREENSHOT_DIR, filename)
    relative_path = f"/images/screenshots/{filename}"

    result = {
        "success": False,
        "screenshot_url": None,
        "final_url": url,
        "timestamp": datetime.now().isoformat(),
        "error": None
    }

    try:
        async with async_playwright() as p:
            # Launch browser
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            
            page = await context.new_page()
            
            # Navigate to the URL
            try:
                # wait_until="networkidle" is preferred for full rendering but "load" is safer for timeout
                response = await page.goto(url, wait_until="load", timeout=15000)
                
                # record final URL (after redirects)
                result["final_url"] = page.url
                
                if response and response.status >= 400:
                    logger.warning(f"Screenshot page returned status {response.status} for {url}")

                # Capture screenshot
                await page.screenshot(path=filepath, full_page=False) # standard view is often enough and faster
                
                result["success"] = True
                result["screenshot_url"] = relative_path
                
            except Exception as e:
                logger.error(f"Failed to navigate to {url} for screenshot: {str(e)}")
                result["error"] = str(e)
            
            await browser.close()
            
    except Exception as e:
        logger.error(f"Playwright error capturing screenshot for {url}: {str(e)}")
        result["error"] = str(e)

    return result
