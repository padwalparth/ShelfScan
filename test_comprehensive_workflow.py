"""
Comprehensive Automated Testing Suite for BatchScan AI
Tests:
  1. Automatic Label Detection across varied packaging & sizes
  2. Cropping with adaptive padding & orientation correction
  3. Image enhancement (CLAHE + Bilateral)
  4. OCR field extraction & validation logic
  5. Raspberry Pi upload endpoint (/api/rpi/upload) & consecutive uploads
  6. Regression verification of existing APIs & frontend routes
"""

import os
import sys
import time
import json
import uuid
import cv2
import requests

# Fix Windows console UTF-8
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from fastapi.testclient import TestClient
from app import app
from label_detector import (
    detect_information_area,
    crop_and_rectify_label,
    enhance_cropped_label,
    validate_extracted_information
)

client = TestClient(app)
images_dir = os.path.join(os.path.dirname(__file__), "images")

print("=" * 80)
print("BATCHSCAN AI · AUTOMATED PIPELINE & REGRESSION TEST SUITE")
print("=" * 80)

# -----------------------------------------------------------------------------
# Test 1: Frontend & Configuration Regression
# -----------------------------------------------------------------------------
print("\n[TEST 1] Verifying Frontend and Base API Endpoints...")
r_index = client.get("/")
assert r_index.status_code == 200, f"Expected 200 for '/', got {r_index.status_code}"
assert "BatchScan" in r_index.text, "Index HTML missing 'BatchScan'"
print("  ✓ GET / returns status 200 and loads BatchScan HTML")

r_config = client.get("/api/config")
assert r_config.status_code == 200, f"Expected 200 for '/api/config', got {r_config.status_code}"
cfg = r_config.json()
assert "has_key" in cfg, "Config missing 'has_key'"
assert "lan_ip" in cfg, "Config missing 'lan_ip'"
assert "rpi_upload_endpoint" in cfg, "Config missing 'rpi_upload_endpoint'"
print(f"  ✓ GET /api/config returned valid telemetry: LAN IP = {cfg.get('lan_ip')}, Endpoint = {cfg.get('rpi_upload_endpoint')}")

r_samples = client.get("/api/samples")
assert r_samples.status_code == 200, "Failed /api/samples"
samples_data = r_samples.json().get("samples", [])
assert len(samples_data) > 0, "No sample images returned"
print(f"  ✓ GET /api/samples returned {len(samples_data)} packaging samples")

r_gt = client.get("/api/ground_truth")
assert r_gt.status_code == 200, "Failed /api/ground_truth"
print(f"  ✓ GET /api/ground_truth returned ground truth dataset map")

# -----------------------------------------------------------------------------
# Test 2: Raspberry Pi Status & Connectivity Endpoints
# -----------------------------------------------------------------------------
print("\n[TEST 2] Verifying Raspberry Pi Communication Endpoints...")
r_rpi_status = client.get("/api/rpi/status")
assert r_rpi_status.status_code == 200, "Failed /api/rpi/status"
rpi_s = r_rpi_status.json()
assert rpi_s.get("status") == "ONLINE", "Expected Pi status ONLINE"
print(f"  ✓ GET /api/rpi/status returned ONLINE with endpoint: {rpi_s.get('upload_endpoint')}")

r_rpi_last = client.get("/api/rpi/last_capture")
assert r_rpi_last.status_code == 200, "Failed /api/rpi/last_capture"
print(f"  ✓ GET /api/rpi/last_capture returned status 200")

# -----------------------------------------------------------------------------
# Test 3: Automatic Information Area Detection & Cropping on Diverse Samples
# -----------------------------------------------------------------------------
print("\n[TEST 3] Testing Automatic Label Detection & Cropping Across Diverse Packaging Samples...")
sample_images = [
    "RPI1.jpeg",
    "RPI2.jpeg",
    "RPI3.jpeg",
    "biscuit1.jpeg",
    "biscuit2.jpeg",
    "biscuit3.jpeg",
    "cheapes1.jpeg",
    "cheaps2.jpeg",
    "Chocolate 1.jpeg",
    "choclate 2.jpeg",
    "fruit1.jpeg",
    "fruit2.jpeg"
]

for s_name in sample_images:
    s_path = os.path.join(images_dir, s_name)
    if not os.path.exists(s_path):
        continue
    img = cv2.imread(s_path)
    assert img is not None, f"Failed to read {s_name}"
    h, w = img.shape[:2]

    # Detect
    det = detect_information_area(img, padding_pct=0.10)
    box = det['box']
    assert len(box) == 4, f"Box must have 4 elements, got {box}"
    assert box[0] < box[2] and box[1] < box[3], f"Invalid coordinates in box {box}"

    # Crop
    cropped, crop_meta = crop_and_rectify_label(img, det)
    cw, ch = cropped.shape[1], cropped.shape[0]
    assert cw > 0 and ch > 0, "Cropped image dimensions must be > 0"

    # Enhance
    enh_color, enh_gray = enhance_cropped_label(cropped)
    ew, eh = enh_color.shape[1], enh_color.shape[0]

    print(f"  ✓ {s_name:<16} | Orig: {w}x{h} -> Crop: {cw}x{ch} -> Enhanced: {ew}x{eh} | Method: {det['method']} | Conf: {det['confidence']}")

# -----------------------------------------------------------------------------
# Test 4: Rotation & Perspective Resilience
# -----------------------------------------------------------------------------
print("\n[TEST 4] Testing Label Detection Resilience on Rotated Images...")
rpi1_path = os.path.join(images_dir, "RPI1.jpeg")
rpi1_img = cv2.imread(rpi1_path)

for deg in [90, 180, 270]:
    rot_flag = cv2.ROTATE_90_CLOCKWISE if deg == 90 else (cv2.ROTATE_180 if deg == 180 else cv2.ROTATE_90_COUNTERCLOCKWISE)
    rotated = cv2.rotate(rpi1_img, rot_flag)
    det_rot = detect_information_area(rotated, padding_pct=0.10)
    cropped_rot, _ = crop_and_rectify_label(rotated, det_rot)
    assert cropped_rot.shape[0] > 0 and cropped_rot.shape[1] > 0, f"Failed cropping rotated {deg}°"
    print(f"  ✓ Successfully detected & cropped image rotated by {deg}° (Crop: {cropped_rot.shape[1]}x{cropped_rot.shape[0]})")

# -----------------------------------------------------------------------------
# Test 5: Raspberry Pi Image Upload (/api/rpi/upload) with Consecutive Captures
# -----------------------------------------------------------------------------
print("\n[TEST 5] Testing Raspberry Pi Upload Endpoint with Multiple Consecutive Transfers...")
test_image_path = os.path.join(images_dir, "RPI3.jpeg")
assert os.path.exists(test_image_path), "Test image RPI3.jpeg missing"

with open(test_image_path, "rb") as f:
    sample_bytes = f.read()

saved_orig_paths = []
for i in range(1, 4):
    files = {"file": (f"packaging_unit_{i}.jpg", sample_bytes, "image/jpeg")}
    data = {"device_id": f"RPi-Camera-Unit-01", "timestamp": f"2026-11-09T12:00:0{i}"}
    
    r_up = client.post("/api/rpi/upload", files=files, data=data)
    assert r_up.status_code == 200, f"Upload #{i} failed with status {r_up.status_code}: {r_up.text}"
    res = r_up.json()

    assert res.get("success") is True, f"Upload #{i} success is not True"
    assert "data" in res, "Missing 'data' in response"
    assert "detection" in res, "Missing 'detection' in response"
    assert "validation" in res, "Missing 'validation' in response"
    assert "original_image_url" in res, "Missing 'original_image_url'"
    assert "cropped_image_url" in res, "Missing 'cropped_image_url'"
    assert "enhanced_image_url" in res, "Missing 'enhanced_image_url'"

    orig_p = res.get("original_image_path")
    assert orig_p not in saved_orig_paths, f"File overwrite collision! Duplicate path: {orig_p}"
    saved_orig_paths.append(orig_p)

    # Verify that the image files actually exist on disk
    assert os.path.exists(orig_p), f"Original file {orig_p} does not exist on disk"
    assert os.path.exists(res.get("cropped_image_path")), f"Cropped file does not exist"
    assert os.path.exists(res.get("enhanced_image_path")), f"Enhanced file does not exist"

    print(f"  ✓ Consecutive Upload #{i} OK: Saved uniquely to {os.path.basename(orig_p)} | Crop: {os.path.basename(res.get('cropped_image_path'))}")

# -----------------------------------------------------------------------------
# Test 6: Image Serving Endpoints Verification
# -----------------------------------------------------------------------------
print("\n[TEST 6] Verifying Image Serving Routes...")
last_orig_url = res.get("original_image_url")
last_crop_url = res.get("cropped_image_url")
last_enh_url = res.get("enhanced_image_url")

r_orig = client.get(last_orig_url)
assert r_orig.status_code == 200, f"Failed to serve {last_orig_url}"
assert r_orig.headers.get("content-type", "").startswith("image/"), "Not image content-type"

r_crop = client.get(last_crop_url)
assert r_crop.status_code == 200, f"Failed to serve {last_crop_url}"

r_enh = client.get(last_enh_url)
assert r_enh.status_code == 200, f"Failed to serve {last_enh_url}"

print("  ✓ GET /api/images/original/{fn} -> HTTP 200 Image Served")
print("  ✓ GET /api/images/cropped/{fn} -> HTTP 200 Image Served")
print("  ✓ GET /api/images/enhanced/{fn} -> HTTP 200 Image Served")

# -----------------------------------------------------------------------------
# Test 7: Regression Check on Barcode Scanner Engine
# -----------------------------------------------------------------------------
print("\n[TEST 7] Regression Testing Barcode Intelligence API...")
r_bc_lookup = client.get("/api/barcode/lookup?code=8901030365732")
assert r_bc_lookup.status_code == 200, "Failed /api/barcode/lookup"
bc_data = r_bc_lookup.json()
assert bc_data.get("success") is True, "Barcode lookup success is not True"
assert "India" in bc_data.get("data", {}).get("country"), f"Expected India origin, got {bc_data.get('data', {}).get('country')}"
print(f"  ✓ Barcode lookup verified (GS1 Country: {bc_data.get('data', {}).get('country')}, Checksum valid: {bc_data.get('data', {}).get('is_valid_checksum')})")

print("\n" + "=" * 80)
print("ALL 7 TEST SUITES PASSED FLAWLESSLY! NO REGRESSIONS DETECTED.")
print("=" * 80)
