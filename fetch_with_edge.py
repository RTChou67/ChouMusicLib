import time
import os
import subprocess
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
            print(f"An error occurred: {e}")
            source_code = ""
        finally:
            context.close()
            print("Browser closed.")

    return source_code


if __name__ == "__main__":
    force_close_edge()

    my_edge_user_data_dir = r"C:\Users\arthurzcz\AppData\Local\Microsoft\Edge\User Data"
    target_url = "https://www.metal-archives.com/albums/Megadeth/Rust_in_Peace/487"

    html = fetch_with_real_profile(target_url, my_edge_user_data_dir)

    if html:
        with open("output_from_real_profile.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("\nSource code saved to output_from_real_profile.html")
