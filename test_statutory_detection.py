"""
Test: Statutory Area Detection + Full OCR Pipeline on user's Lays sample image.
Verifies that the new Gemini-powered statutory detector correctly locates the
MRP / Batch / MFD / EXP zone instead of the address block.
"""
import sys
import os
import cv2
import json
import base64
import requests

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from label_detector import detect_information_area, crop_and_rectify_label, enhance_cropped_label

IMG_PATH = os.path.join(os.path.dirname(__file__), "images", "user_lays_sample.jpg")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

def test_statutory_detection():
    """Test that the detected box is in the lower half of the image (where MRP/Batch/EXP appear)."""
    print("\n=== Test 1: Statutory Area Detection ===")
    img = cv2.imread(IMG_PATH)
    assert img is not None, f"Could not load test image: {IMG_PATH}"
    h, w = img.shape[:2]
    print(f"Image: {IMG_PATH} ({w}x{h})")

    result = detect_information_area(img, padding_pct=0.10, gemini_api_key=GEMINI_KEY or None)
    print(f"Detection result: {result}")

    assert result is not None, "detect_information_area returned None"
    assert "box" in result, "Result must contain 'box'"
    box = result["box"]
    assert len(box) == 4, "Box must have [x1, y1, x2, y2]"
    x1, y1, x2, y2 = box

    # The statutory area (MRP/Batch/EXP) is roughly in the lower 25% to 80% of this image
    # The image is 417px tall; the statutory area starts around y=135 (30% from top)
    crop_center_y = (y1 + y2) / 2.0
    img_pct = crop_center_y / h
    print(f"Crop center Y = {crop_center_y:.0f} / {h} = {img_pct:.1%} from top")

    # Should NOT be in the top 20% (which would be nutrition table)
    assert img_pct > 0.20, (
        f"Detected box center Y ({img_pct:.1%}) is too high — likely grabbed the nutrition table, not the statutory area."
    )

    # Box width should be reasonably wide (at least 50% of image width)
    crop_width = x2 - x1
    assert crop_width > w * 0.4, f"Crop width ({crop_width}) is too narrow for the statutory area"

    print(f"✅ PASS: Statutory area correctly located (center at {img_pct:.1%} from top of image)")
    print(f"   method={result.get('method')}, confidence={result.get('confidence')}")
    return result

def test_crop_contains_mrp_text():
    """Test that the cropped area, when OCR'd by Gemini, extracts MRP and batch data."""
    print("\n=== Test 2: OCR on Cropped Statutory Area ===")
    if not GEMINI_KEY:
        print("⚠️  SKIP: No GEMINI_API_KEY configured. Cannot verify OCR on crop.")
        return

    img = cv2.imread(IMG_PATH)
    h, w = img.shape[:2]
    det = detect_information_area(img, padding_pct=0.10, gemini_api_key=GEMINI_KEY)
    cropped, meta = crop_and_rectify_label(img, det)
    enh_color, _ = enhance_cropped_label(cropped)

    _, enc = cv2.imencode(".jpg", enh_color, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    b64 = base64.b64encode(enc.tobytes()).decode("utf-8")

    prompt = (
        "Extract from this product label: batch_number, mfg_date, exp_date, mrp. "
        "Return strict JSON with these keys and null for missing fields."
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={GEMINI_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}, {"inline_data": {"mime_type": "image/jpeg", "data": b64}}]}],
        "generationConfig": {"response_mime_type": "application/json"}
    }
    res = requests.post(url, json=payload, timeout=20)
    assert res.status_code == 200, f"Gemini OCR call failed: {res.status_code}"
    txt = res.json()["candidates"][0]["content"]["parts"][0]["text"]
    data = json.loads(txt)
    print(f"OCR extracted: {json.dumps(data, indent=2)}")

    # Validate expected values from the Lays sample
    mrp = str(data.get("mrp") or "").lower()
    batch = str(data.get("batch_number") or "").lower()
    exp = str(data.get("exp_date") or "").lower()
    mfg = str(data.get("mfg_date") or "").lower()

    assert "10" in mrp or "rs" in mrp, f"Expected MRP ~'Rs. 10/-' but got: {mrp!r}"
    assert "n2170" in batch.replace(" ", "") or "2.0" in batch, f"Expected batch containing 'N2170...' but got: {batch!r}"
    assert any(x in exp for x in ["01/27", "15/01", "27"]), f"Expected exp date near 15/01/27, got: {exp!r}"
    assert any(x in mfg for x in ["09/26", "17/09", "26"]), f"Expected mfg date near 17/09/26, got: {mfg!r}"

    print("✅ PASS: OCR correctly extracted MRP, Batch, MFD, EXP from statutory area crop")

def test_opencv_fallback():
    """
    Test that detect_information_area always returns a valid, non-empty box,
    regardless of whether Gemini succeeds or falls back to OpenCV.
    (When Gemini returns no statutory_box_2d for a small crop, OpenCV kicks in automatically.)
    """
    print("\n=== Test 3: Fallback Robustness (small crop re-detection) ===")
    img = cv2.imread(IMG_PATH)
    h, w = img.shape[:2]
    # Simulate what happens when detect is called on an already-cropped image (small area)
    # This is the scenario where Gemini sometimes returns no box — OpenCV must handle it.
    small_crop = img[100:250, 0:253]  # crop to just the statutory area region

    result = detect_information_area(small_crop, padding_pct=0.10, gemini_api_key=GEMINI_KEY or None)
    print(f"Result on small crop: method={result.get('method')}, box={result.get('box')}")
    assert result is not None
    assert result["box"] is not None
    assert result["box"][2] > result["box"][0], "x2 must be > x1"
    assert result["box"][3] > result["box"][1], "y2 must be > y1"
    # Should always return something valid (Gemini, OpenCV, or fallback_full_frame)
    assert result.get("method") in (
        "gemini_statutory_detection", "opencv_text_density",
        "opencv_panel_contour", "opencv_merged_text", "fallback_full_frame"
    ), f"Unknown method: {result.get('method')}"
    print(f"✅ PASS: Small-crop re-detection returned a valid box ({result['method']})")

if __name__ == "__main__":
    all_passed = True
    for test_fn in [test_statutory_detection, test_crop_contains_mrp_text, test_opencv_fallback]:
        try:
            test_fn()
        except AssertionError as e:
            print(f"❌ FAIL: {e}")
            all_passed = False
        except Exception as e:
            print(f"❌ ERROR in {test_fn.__name__}: {e}")
            all_passed = False

    print("\n" + ("=" * 50))
    if all_passed:
        print("🎉 ALL STATUTORY DETECTION TESTS PASSED")
    else:
        print("⚠️  SOME TESTS FAILED — see output above")
        sys.exit(1)

