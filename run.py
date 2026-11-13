import os
import sys
import socket
import webbrowser
import threading
import time
import uvicorn

# Fix Unicode output on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    port = 8000
    host = "0.0.0.0"
    local_url = f"http://127.0.0.1:{port}"
    lan_ip = get_lan_ip()

    print("==================================================")
    print(f"Starting BatchScan AI Server at http://{host}:{port}")
    print(f"Local browser: {local_url}")
    print(f"Pi should use: http://{lan_ip}:{port}")
    print("==================================================")

    def open_browser():
        time.sleep(2)
        webbrowser.open(local_url)

    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("app:app", host=host, port=port, reload=True)

