import requests
import json

base = "http://127.0.0.1:8000"

print("Triggering OCR extraction on sample image (sample1.jpg)...")
r_extract = requests.post(base + "/api/extract", data={
    "sample_name": "RPI1.jpeg",
    "provider": "gemini",
    "model": "gemini-3.5-flash-lite"
})

print("Extract Status Code:", r_extract.status_code)
res = r_extract.json()
print("Extract Response Summary:")
print("  - Success:", res.get("success"))
print("  - Batch Number:", res.get("data", {}).get("batch_number"))
print("  - Expiry Date:", res.get("data", {}).get("exp_date"))
print("  - Expiry Status:", res.get("expiry_analysis", {}).get("status"))
print("  - Saved to Cloud (Supabase):", res.get("saved_to_cloud"))
print("  - Supabase Scan ID:", res.get("supabase_id"))

# Check Supabase scans list & stats
r_scans = requests.get(base + "/api/supabase/scans")
print("\nSupabase Scans in Cloud DB:", r_scans.json().get("total"))
r_stats = requests.get(base + "/api/supabase/stats")
print("Supabase Stats:", json.dumps(r_stats.json().get("stats", {}), indent=2))
r_inv = requests.get(base + "/api/supabase/inventory")
print("Supabase Inventory Batches:", len(r_inv.json().get("inventory", [])))
print("First batch in inventory:", r_inv.json().get("inventory", [])[0] if r_inv.json().get("inventory") else "None")
