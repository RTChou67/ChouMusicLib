import time
import subprocess
import sys
from playwright.sync_api import sync_playwright


def force_close_edge():
    print("Attempting to close all running Microsoft Edge processes...")
    try:
        subprocess.run(
            ["taskkill", "/F", "/IM", "msedge.exe"],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        print("All Edge processes have been terminated successfully.")
        time.sleep(2)
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print("No running Edge processes found, or an error occurred. Continuing...")
        pass


def fetch_with_real_profile(url: str, user_data_dir: str):
    with sync_playwright() as p:
        print("Launching Edge with your real browser profile...")
        context = p.chromium.launch_persistent_context(
            user_data_dir,
            channel="msedge",
            headless=False,
        )
        page = context.new_page()
        print(f"Navigating to: {url}")
        try:
            page.goto(url, timeout=60000)
            print("Page loaded. Waiting 5 seconds for stability...")
            time.sleep(5)
            print("Extracting source code...")
            source_code = page.content()
            print("Extraction successful!")
        except Exception as e:
            print(f"An error occurred: {e}", file=sys.stderr)
            source_code = ""
        finally:
            context.close()
            print("Browser closed.")
    return source_code


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fetch_with_edge.py <URL>", file=sys.stderr)
        sys.exit(1)

    target_url = sys.argv[1]

    force_close_edge()

    my_edge_user_data_dir = r"C:\Users\arthurzcz\AppData\Local\Microsoft\Edge\User Data"

    html = fetch_with_real_profile(target_url, my_edge_user_data_dir)

    if html:
        try:
            with open("temp.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("Source code successfully saved to temp.html")
            sys.exit(0)
        except Exception as e:
            print(f"Failed to write to temp.html: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print("Failed to fetch HTML, temp.html was not created.", file=sys.stderr)
        sys.exit(1)
