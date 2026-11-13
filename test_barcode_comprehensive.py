"""
Comprehensive test for /api/barcode/scan endpoint and state handling.
"""
import os
import io
import base64
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_barcode_scan_sample():
    print("Testing /api/barcode/scan with sample_name...")
    resp = client.post("/api/barcode/scan", data={"sample_name": "RPI1.jpeg"})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data.get("success") is True
    assert data.get("barcode", {}).get("detected") is True
    assert data["barcode"]["primary"]["text"] == "8908017753204"
    assert "data" in data
    assert "expiry_analysis" in data
    assert "barcode_verification" in data
    print("✓ Sample scan test passed!")

def test_barcode_scan_upload():
    print("Testing /api/barcode/scan with multipart file upload...")
    sample_path = os.path.join("images", "RPI1.jpeg")
    if os.path.exists(sample_path):
        with open(sample_path, "rb") as f:
            resp = client.post("/api/barcode/scan", files={"file": ("RPI1.jpeg", f, "image/jpeg")})
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        assert data.get("barcode", {}).get("detected") is True
        print("✓ Multipart file upload test passed!")

def test_barcode_scan_base64():
    print("Testing /api/barcode/scan with base64 data...")
    sample_path = os.path.join("images", "RPI1.jpeg")
    if os.path.exists(sample_path):
        with open(sample_path, "rb") as f:
            b64_str = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("utf-8")
        resp = client.post("/api/barcode/scan", data={"image_base64": b64_str})
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        assert data.get("barcode", {}).get("detected") is True
        print("✓ Base64 scan test passed!")

def test_barcode_scan_no_barcode():
    print("Testing /api/barcode/scan with an image with no optical barcode...")
    # Find any sample or create blank image
    from PIL import Image
    buf = io.BytesIO()
    img = Image.new("RGB", (200, 200), color=(255, 255, 255))
    img.save(buf, format="JPEG")
    resp = client.post("/api/barcode/scan", files={"file": ("blank.jpg", buf.getvalue(), "image/jpeg")})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("success") is True
    assert data.get("barcode", {}).get("detected") is False
    assert data.get("barcode_verification", {}).get("status") == "NO_BARCODE"
    print("✓ No-barcode fallback test passed!")

if __name__ == "__main__":
    test_barcode_scan_sample()
    test_barcode_scan_upload()
    test_barcode_scan_base64()
    test_barcode_scan_no_barcode()
    print("\nAll /api/barcode/scan tests passed successfully!")
