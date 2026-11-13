import os
import requests
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_endpoints():
    print("Testing /api/config...")
    r = client.get("/api/config")
    print("Config status:", r.status_code, r.json().get("model_options"))

    print("\nTesting /api/barcode/scan with RPI1.jpeg...")
    with open("images/RPI1.jpeg", "rb") as f:
        r = client.post("/api/barcode/scan", files={"file": ("RPI1.jpeg", f, "image/jpeg")})
    print("Barcode Scan Status:", r.status_code)
    data = r.json()
    print("Detected:", data.get("barcode", {}).get("detected"))
    primary = data.get("barcode", {}).get("primary")
    if primary:
        print(" -> Format:", primary.get("format"))
        print(" -> Text:", primary.get("text"))
        print(" -> Country:", primary.get("country"))
        print(" -> Catalog Product:", primary.get("catalog_info", {}).get("product_name"))

    print("\nTesting /api/barcode/lookup?code=8908017753204...")
    r = client.get("/api/barcode/lookup?code=8908017753204")
    print("Lookup Status:", r.status_code)
    print("Lookup Data:", r.json().get("data", {}).get("catalog_info"))

if __name__ == "__main__":
    test_endpoints()
