import os
import sys
import time
import requests
import json

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

base_url = "http://127.0.0.1:8000"
images_dir = os.path.join(os.path.dirname(__file__), "images")

# Check if server is alive
try:
    r = requests.get(f"{base_url}/api/config", timeout=5)
    print(f"Server is LIVE: {r.status_code}", flush=True)
except Exception as e:
    print(f"Server connection error: {e}", flush=True)
    sys.exit(1)

images = [
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

print("=" * 85, flush=True)
print(f"TESTING RPI CAMERA & SAMPLE IMAGES ({len(images)} total)", flush=True)
print("=" * 85, flush=True)

for i, img_name in enumerate(images, 1):
    img_path = os.path.join(images_dir, img_name)
    if not os.path.exists(img_path):
        print(f"[{i:02d}/{len(images)}] {img_name}: NOT FOUND ON DISK", flush=True)
        continue
        
    t0 = time.time()
    try:
        res = requests.post(f"{base_url}/api/extract", data={
            "sample_name": img_name,
            "provider": "gemini",
            "model": "gemini-3.5-flash-lite",
            "enhance": "false"
        }, timeout=25)
        
        t_elapsed = round(time.time() - t0, 2)
        if res.status_code == 200:
            res_data = res.json()
            d = res_data.get("data", {})
            exp_info = res_data.get("expiry_analysis", {})
            cloud_id = res_data.get("supabase_id")
            
            b_no = d.get("batch_number") or "-"
            mfg = d.get("mfg_date") or "-"
            exp = d.get("exp_date") or "-"
            mrp = d.get("mrp") or "-"
            prod = d.get("product_name") or "-"
            status = exp_info.get("status", "UNKNOWN")
            
            print(f"[{i:02d}/{len(images)}] {img_name:<16} | Batch: {b_no:<14} | EXP: {exp:<12} | Status: {status:<12} | MRP: {mrp:<10} | {t_elapsed}s | Cloud ID: {cloud_id}", flush=True)
        else:
            print(f"[{i:02d}/{len(images)}] {img_name:<16} | HTTP {res.status_code}: {res.text[:100]}", flush=True)
    except Exception as err:
        print(f"[{i:02d}/{len(images)}] {img_name:<16} | Exception: {err}", flush=True)

# Supabase stats check
print("\n" + "=" * 85, flush=True)
print("SUPABASE CLOUD DATABASE SYNC STATUS", flush=True)
print("=" * 85, flush=True)
try:
    r_stats = requests.get(f"{base_url}/api/supabase/stats", timeout=5).json()
    r_scans = requests.get(f"{base_url}/api/supabase/scans?limit=5", timeout=5).json()
    r_inv = requests.get(f"{base_url}/api/supabase/inventory", timeout=5).json()
    
    print("Cloud Analytics Stats:", json.dumps(r_stats.get("stats", {}), indent=2), flush=True)
    print(f"Total Cloud Scans Logged: {r_scans.get('total', 0)}", flush=True)
    print(f"Total Unique Batches in Master Inventory: {len(r_inv.get('inventory', []))}", flush=True)
except Exception as e:
    print(f"Error checking Supabase stats: {e}", flush=True)
