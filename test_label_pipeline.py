"""
Test script for Automatic Label Detection, Cropping, and Enhancement Pipeline
"""

import os
import sys
import cv2
import numpy as np

# Ensure utf-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from label_detector import (
    detect_information_area,
    crop_and_rectify_label,
    enhance_cropped_label,
    validate_extracted_information
)

images_dir = os.path.join(os.path.dirname(__file__), "images")
output_dir = os.path.join(images_dir, "test_output")
os.makedirs(output_dir, exist_ok=True)

test_files = [
    "RPI1.jpeg",
    "RPI2.jpeg",
    "RPI3.jpeg",
    "biscuit1.jpeg",
    "biscuit2.jpeg",
    "cheapes1.jpeg",
    "Chocolate 1.jpeg",
    "fruit1.jpeg"
]

print("=" * 80)
print("TESTING AUTOMATIC INFORMATION AREA DETECTION & CROPPING PIPELINE")
print("=" * 80)

for fname in test_files:
    fpath = os.path.join(images_dir, fname)
    if not os.path.exists(fpath):
        print(f"[-] {fname}: NOT FOUND")
        continue

    img = cv2.imread(fpath)
    if img is None:
        print(f"[-] {fname}: FAILED TO LOAD")
        continue

    h, w = img.shape[:2]
    # 1. Detect
    det = detect_information_area(img, padding_pct=0.10)
    box = det['box']
    conf = det['confidence']
    method = det['method']

    # 2. Crop
    cropped, crop_meta = crop_and_rectify_label(img, det)

    # 3. Enhance
    enh_color, enh_gray = enhance_cropped_label(cropped)

    # Save outputs for inspection
    base_name = os.path.splitext(fname)[0]
    crop_out = os.path.join(output_dir, f"{base_name}_crop.jpg")
    enh_out = os.path.join(output_dir, f"{base_name}_enhanced.jpg")
    cv2.imwrite(crop_out, cropped)
    cv2.imwrite(enh_out, enh_color)

    cw, ch = cropped.shape[1], cropped.shape[0]
    ew, eh = enh_color.shape[1], enh_color.shape[0]

    print(f"[+] {fname:<15} | Orig: {w}x{h} -> Box: {box} | Crop: {cw}x{ch} | Conf: {conf:.2f} | Method: {method} | Enhanced: {ew}x{eh}")

# 4. Test Validation Engine
print("\n" + "=" * 80)
print("TESTING VALIDATION ENGINE")
print("=" * 80)

val_cases = [
    {
        "name": "Valid Normal Dates",
        "data": {"batch_number": "F28H97", "mfg_date": "14/08/2026", "exp_date": "13/08/2027", "mrp": "Rs. 300.00", "confidence_score": 0.95}
    },
    {
        "name": "Invalid Inverted Dates (Exp before Mfg)",
        "data": {"batch_number": "B123", "mfg_date": "14/08/2027", "exp_date": "13/08/2026", "mrp": "Rs. 100", "confidence_score": 0.90}
    },
    {
        "name": "Partial Dates (MM/YYYY)",
        "data": {"batch_number": "LOT-99", "mfg_date": "08/2026", "exp_date": "08/2028", "mrp": "Rs. 250", "confidence_score": 0.92}
    },
    {
        "name": "Missing Batch Number",
        "data": {"batch_number": None, "mfg_date": "01/01/2026", "exp_date": "01/01/2027", "mrp": "Rs. 50", "confidence_score": 0.80}
    }
]

for vc in val_cases:
    res = validate_extracted_information(vc['data'])
    print(f"\nCase: {vc['name']}")
    print(f"  Valid: {res['is_valid']}, Needs Review: {res['needs_manual_review']}")
    print(f"  Date Order Valid: {res['date_order_valid']}")
    print(f"  Normalized Dates: MFG={res['mfg_normalized']} (Partial={res['mfg_is_partial']}), EXP={res['exp_normalized']} (Partial={res['exp_is_partial']})")
    print(f"  Warnings: {res['warnings']}")
    print(f"  Adjusted Confidence: {res['adjusted_confidence']}")

print("\nPipeline tests completed successfully!")

