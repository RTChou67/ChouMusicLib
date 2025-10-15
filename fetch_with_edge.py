import time
import os
import subprocess
from playwright.sync_api import sync_playwright


def force_close_edge():
    """
    Finds and forcibly terminates all running msedge.exe processes.
    """
    print("Attempting to close all running Microsoft Edge processes...")
    # 使用 Windows 的 taskkill 命令，/F 表示强制，/IM 表示通过镜像名（进程名）
    # os.system 会执行命令，但为了更好地处理输出，我们使用 subprocess
    try:
        # 使用 subprocess.run 可以更好地控制输出，避免在终端打印不必要的信息
        subprocess.run(
            ["taskkill", "/F", "/IM", "msedge.exe"],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        print("All Edge processes have been terminated successfully.")
        # 等待一小会儿，确保所有进程都已完全退出
        time.sleep(2)
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        # 如果没有找到进程，taskkill 会返回一个非零退出码，导致 CalledProcessError
        # 这说明 Edge 本来就是关闭的，是正常情况，所以我们忽略这个错误
        print("No running Edge processes found, or an error occurred. Continuing...")
        pass


def fetch_with_real_profile(url: str, user_data_dir: str):
    """
    Uses a persistent, real user profile to launch the Edge browser.
    """
    with sync_playwright() as p:
        print("Launching Edge with your real browser profile...")

        # This will load your user directory, including all cookies and login states.
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


# --- Main Program ---
if __name__ == "__main__":
    # 步骤 1: 脚本会自动关闭所有正在运行的 Edge 进程
    force_close_edge()

    # 步骤 2: 脚本会使用你的个人配置启动一个新的 Edge 实例
    my_edge_user_data_dir = r"C:\Users\arthurzcz\AppData\Local\Microsoft\Edge\User Data"
    target_url = "https://www.metal-archives.com/albums/Megadeth/Rust_in_Peace/487"

    html = fetch_with_real_profile(target_url, my_edge_user_data_dir)

    if html:
        with open("output_from_real_profile.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("\nSource code saved to output_from_real_profile.html")
