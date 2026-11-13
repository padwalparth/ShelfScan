"""
BatchScan AI · Raspberry Pi Camera Client
==========================================
Transfers captured packaging images from Raspberry Pi camera to the laptop's
BatchScan AI processing pipeline over Wi-Fi.

Features:
  - Picamera2 support (Raspberry Pi OS Bullseye & Bookworm).
  - Graceful fallback to legacy picamera, USB webcam (cv2.VideoCapture), or file simulation.
  - Automatic Wi-Fi reconnection retries with exponential backoff.
  - Local backup of all captured frames on the Pi (prevents data loss).
  - Interactive capture mode (Press Enter) or automated interval capture mode.
  - Returns real-time server OCR, detected label coordinates, and expiry status.
"""

import os
import sys
import time
import argparse
import datetime
import requests
from typing import Optional, Tuple

# Local storage on Raspberry Pi
PI_CAPTURE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pi_captures")
os.makedirs(PI_CAPTURE_DIR, exist_ok=True)


class PiCameraManager:
    """Manages Raspberry Pi camera hardware with multi-backend fallbacks."""

    def __init__(self, resolution: Tuple[int, int] = (1920, 1080)):
        self.resolution = resolution
        self.backend = None
        self.camera_obj = None
        self._init_camera()

    def _init_camera(self):
        # 1. Try Picamera2 (modern libcamera on Raspberry Pi OS Bookworm/Bullseye)
        try:
            from picamera2 import Picamera2
            picam2 = Picamera2()
            config = picam2.create_still_configuration(main={"size": self.resolution})
            picam2.configure(config)
            picam2.start()
            self.camera_obj = picam2
            self.backend = "picamera2"
            print(f"[PiCamera] Initialized official Picamera2 at {self.resolution[0]}x{self.resolution[1]}")
            return
        except Exception as e:
            # Not on Pi or picamera2 not installed
            pass

        # 2. Try legacy picamera (Raspberry Pi OS Buster and earlier)
        try:
            import picamera
            cam = picamera.PiCamera()
            cam.resolution = self.resolution
            time.sleep(1.0)  # Camera warm-up
            self.camera_obj = cam
            self.backend = "picamera_legacy"
            print(f"[PiCamera] Initialized legacy picamera at {self.resolution[0]}x{self.resolution[1]}")
            return
        except Exception as e:
            pass

        # 3. Try USB webcam or OpenCV VideoCapture
        try:
            import cv2
            cap = cv2.VideoCapture(0)
            if cap.isOpened():
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.resolution[0])
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.resolution[1])
                self.camera_obj = cap
                self.backend = "opencv_v4l2"
                print("[PiCamera] Initialized USB webcam via OpenCV VideoCapture(0)")
                return
            else:
                cap.release()
        except Exception as e:
            pass

        # 4. Fallback simulation mode (for testing on laptops/development machines)
        self.backend = "simulation"
        print("[PiCamera] Notice: Physical Pi camera not detected. Operating in simulation/test-image mode.")

    def capture_image(self, save_path: str) -> bool:
        """Captures a still frame and saves it to save_path."""
        try:
            if self.backend == "picamera2":
                self.camera_obj.capture_file(save_path)
                return True
            elif self.backend == "picamera_legacy":
                self.camera_obj.capture(save_path)
                return True
            elif self.backend == "opencv_v4l2":
                import cv2
                ret, frame = self.camera_obj.read()
                if ret and frame is not None:
                    cv2.imwrite(save_path, frame)
                    return True
                return False
            elif self.backend == "simulation":
                # Find an existing sample image from images/ if available
                sample_dirs = [
                    os.path.join(os.path.dirname(os.path.abspath(__file__)), "images"),
                    "."
                ]
                sample_found = None
                for d in sample_dirs:
                    if os.path.exists(d):
                        for f in os.listdir(d):
                            if f.lower().startswith("rpi") and f.lower().endswith((".jpg", ".jpeg", ".png")):
                                sample_found = os.path.join(d, f)
                                break
                    if sample_found:
                        break

                if sample_found:
                    with open(sample_found, "rb") as sf, open(save_path, "wb") as df:
                        df.write(sf.read())
                    print(f"[PiCamera] Simulated capture using existing sample: {os.path.basename(sample_found)}")
                    return True
                else:
                    # Create synthetic test pattern
                    import cv2
                    import numpy as np
                    synthetic = np.zeros((720, 1280, 3), dtype=np.uint8)
                    cv2.rectangle(synthetic, (150, 150), (1130, 570), (240, 240, 240), -1)
                    cv2.putText(synthetic, "BATCH NO: RPI-SIM-2026", (200, 260), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (10, 10, 10), 2)
                    cv2.putText(synthetic, "MFG DATE: 15/08/2026", (200, 340), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (10, 10, 10), 2)
                    cv2.putText(synthetic, "EXP DATE: 14/08/2027", (200, 420), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (10, 10, 10), 2)
                    cv2.putText(synthetic, "MRP: Rs. 150.00", (200, 500), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (10, 10, 10), 2)
                    cv2.imwrite(save_path, synthetic)
                    return True
        except Exception as e:
            print(f"[PiCamera Error] Capture failed: {e}")
            return False

    def close(self):
        try:
            if self.backend == "picamera2":
                self.camera_obj.stop()
            elif self.backend == "picamera_legacy":
                self.camera_obj.close()
            elif self.backend == "opencv_v4l2":
                self.camera_obj.release()
        except Exception:
            pass


def send_image_to_laptop(
    image_path: str,
    server_url: str,
    max_retries: int = 3,
    timeout: int = 30
) -> Optional[dict]:
    """
    Transfers captured image from Raspberry Pi to laptop OCR server.
    Implements retry with exponential backoff for Wi-Fi resilience.
    """
    upload_endpoint = server_url.rstrip("/") + "/api/rpi/upload"
    filename = os.path.basename(image_path)

    for attempt in range(1, max_retries + 1):
        try:
            print(f"[Upload] Sending {filename} to {upload_endpoint} (Attempt {attempt}/{max_retries})...")
            with open(image_path, "rb") as img_file:
                files = {"file": (filename, img_file, "image/jpeg")}
                data = {
                    "device_id": "RaspberryPi-CamModule",
                    "timestamp": datetime.datetime.now().isoformat()
                }
                response = requests.post(upload_endpoint, files=files, data=data, timeout=timeout)

            if response.status_code == 200:
                res_data = response.json()
                print(f"[Upload Success] HTTP 200 OK")
                return res_data
            else:
                print(f"[Upload Error] HTTP {response.status_code}: {response.text[:200]}")
        except requests.exceptions.ConnectionError as ce:
            print(f"[Network Error] Cannot reach laptop server at {server_url}: {ce}")
        except requests.exceptions.Timeout:
            print(f"[Network Timeout] Request timed out after {timeout} seconds.")
        except Exception as e:
            print(f"[Error] Unexpected exception: {e}")

        if attempt < max_retries:
            backoff_sec = attempt * 2
            print(f"[Retry] Backing off for {backoff_sec} seconds before re-attempting...")
            time.sleep(backoff_sec)

    return None


def print_ocr_summary(res: dict):
    """Pretty prints the extraction results returned by the laptop server."""
    if not res:
        return
    data = res.get("data", {})
    exp_info = res.get("expiry_analysis", {})
    det = res.get("detection", {})
    val = res.get("validation", {})

    print("\n" + "=" * 65)
    print("  BATCHSCAN AI · EXTRACTION & VALIDATION RESULTS")
    print("=" * 65)
    print(f"  Source File      : {res.get('source', '-')}")
    print(f"  Label Detection  : Box={det.get('box')} (Conf={det.get('confidence', '-')}, Method={det.get('method')})")
    print(f"  Batch / Lot No   : {data.get('batch_number') or '-'}")
    print(f"  Manufacturing    : {data.get('mfg_date') or '-'}")
    print(f"  Expiry Date      : {data.get('exp_date') or '-'}")
    print(f"  Expiry Status    : {exp_info.get('status', 'UNKNOWN')} ({exp_info.get('label', '-')})")
    print(f"  Price / M.R.P.   : {data.get('mrp') or '-'}")
    print(f"  Product Name     : {data.get('product_name') or '-'}")
    print(f"  Validation Check : {'PASSED \u2713' if val.get('is_valid') else 'ATTENTION NEEDED \u26a0'}")
    if val.get("warnings"):
        for w in val.get("warnings", []):
            print(f"    Warning: {w}")
    print(f"  Cloud Saved      : {res.get('saved_to_cloud', False)} (ID: {res.get('supabase_id')})")
    print("=" * 65 + "\n")


def main():
    parser = argparse.ArgumentParser(description="BatchScan AI - Raspberry Pi Camera Client")
    parser.add_argument(
        "--server",
        default=os.getenv("BATCHSCAN_SERVER_URL", "http://127.0.0.1:8000"),
        help="Laptop server URL (e.g. http://192.168.1.15:8000)"
    )
    parser.add_argument(
        "--mode",
        choices=["interactive", "interval", "single"],
        default="interactive",
        help="Capture mode: interactive (press Enter), interval (auto timer), single (one shot)"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=10,
        help="Interval in seconds for interval mode"
    )
    parser.add_argument(
        "--test-image",
        default=None,
        help="Optional path to existing image to send without camera capture"
    )

    args = parser.parse_args()

    server_url = args.server.rstrip("/")
    print("=" * 65)
    print("BatchScan AI · Raspberry Pi Camera Client Starting")
    print(f"Laptop Server URL : {server_url}")
    print(f"Mode              : {args.mode}")
    print("=" * 65)

    # Check server availability
    try:
        ping = requests.get(f"{server_url}/api/config", timeout=4)
        if ping.status_code == 200:
            print(f"[Connected] Successfully reached laptop server at {server_url}")
        else:
            print(f"[Warning] Laptop server returned status code {ping.status_code}")
    except Exception as e:
        print(f"[Notice] Could not verify laptop server before starting: {e}")
        print("Will attempt transfers as captures occur.")

    # Initialize camera if not sending a test image
    camera = None
    if not args.test_image:
        camera = PiCameraManager()

    capture_count = 0
    try:
        while True:
            if args.test_image:
                if not os.path.exists(args.test_image):
                    print(f"Error: test image {args.test_image} does not exist.")
                    break
                image_path = args.test_image
            else:
                if args.mode == "interactive":
                    input("\n[Ready] Press [ENTER] to capture product packaging image (or Ctrl+C to exit)... ")

                ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]
                capture_count += 1
                local_filename = f"rpi_capture_{ts}_{capture_count}.jpg"
                image_path = os.path.join(PI_CAPTURE_DIR, local_filename)

                print(f"[Capturing] Taking photo #{capture_count}...")
                success = camera.capture_image(image_path)
                if not success:
                    print("[Error] Image capture failed. Retrying...")
                    time.sleep(1.0)
                    continue

                print(f"[Saved Locally] {image_path}")

            # Send to laptop
            result = send_image_to_laptop(image_path, server_url)
            if result:
                print_ocr_summary(result)
            else:
                print("[Failed] Transfer was not completed. Image remains saved locally on Pi.")

            if args.mode == "single" or args.test_image:
                break
            elif args.mode == "interval":
                print(f"[Waiting] Next capture in {args.interval} seconds (Ctrl+C to stop)...")
                time.sleep(args.interval)

    except KeyboardInterrupt:
        print("\n[Exiting] Raspberry Pi Camera Client stopped by user.")
    finally:
        if camera:
            camera.close()


if __name__ == "__main__":
    main()

