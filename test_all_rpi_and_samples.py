import os
import sys
import time
import requests
import json

# Ensure UTF-8 output on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

base_url = "http://127.0.0.1:8000"
images_dir = os.path.join(os.path.dirname(__file__), "images")

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

print("=" * 80)
print(f"BATCHSCAN AI · COMPREHENSIVE RPI & IMAGE SAMPLES BENCHMARK ({len(images)} Images)")
print("=" * 80)

results = []

for idx, img_name in enumerate(images, 1):
    img_path = os.path.join(images_dir, img_name)
    if not os.path.exists(img_path):
        print(f"[{idx}/{len(images)}] SKIP: {img_name} (File not found)")
        continue
    
    print(f"\n[{idx}/{len(images)}] Testing: {img_name} ({os.path.getsize(img_path) // 1024} KB)...")
    start = time.time()
    
    try:
        res = requests.post(f"{base_url}/api/extract", data={
            "sample_name": img_name,
            "provider": "gemini",
            "model": "gemini-3.5-flash-lite",
            "enhance": "false"
        }, timeout=30)
        
        elapsed = round(time.time() - start, 2)
        
        if res.status_code == 200:
            data = res.json()
            extracted = data.get("data", {})
            expiry = data.get("expiry_analysis", {})
            gt = data.get("ground_truth_comparison")
            
            b_no = extracted.get("batch_number") or "N/A"
            mfg = extracted.get("mfg_date") or "N/A"
            exp = extracted.get("exp_date") or "N/A"
            mrp = extracted.get("mrp") or "N/A"
            p_name = extracted.get("product_name") or "N/A"
            status = expiry.get("status", "UNKNOWN")
            cloud_id = data.get("supabase_id")
            
            gt_status = "N/A"
            if gt and gt.get("has_ground_truth"):
                gt_status = "MATCH" if gt.get("batch_match") else f"DIFF (exp: {gt.get('expected_batch')})"
            
            print(f"  [OK] Processed in {elapsed}s")
            print(f"  - Batch No:      {b_no}")
            print(f"  - Mfg Date:      {mfg}")
            print(f"  - Expiry Date:   {exp} (Status: {status})")
            print(f"  - M.R.P.:        {mrp}")
            print(f"  - Product Name:  {p_name}")
            print(f"  - Ground Truth:  {gt_status}")
            print(f"  - Supabase ID:   {cloud_id}")
            
            results.append({
                "file": img_name,
                "batch": b_no,
                "mfg": mfg,
                "exp": exp,
                "mrp": mrp,
                "product": p_name,
                "status": status,
                "time": elapsed,
                "cloud": bool(cloud_id),
                "success": True
            })
        else:
            print(f"  [FAIL] Status {res.status_code} - {res.text}")
            results.append({
                "file": img_name,
                "error": res.text,
                "success": False
            })
    except Exception as e:
        print(f"  [FAIL] Exception: {e}")
        results.append({
            "file": img_name,
            "error": str(e),
            "success": False
        })

print("\n" + "=" * 95)
print("BENCHMARK SUMMARY TABLE")
print("=" * 95)
print(f"{'Image File':<18} | {'Batch No':<16} | {'Mfg Date':<12} | {'Exp Date':<12} | {'Status':<12} | {'Time (s)':<8} | {'Supabase'}")
print("-" * 95)
for r in results:
    if r.get("success"):
        cloud_mark = "Synced" if r.get("cloud") else "No"
        print(f"{r['file']:<18} | {r['batch']:<16} | {r['mfg']:<12} | {r['exp']:<12} | {r['status']:<12} | {r['time']:<8} | {cloud_mark}")
    else:
        print(f"{r['file']:<18} | FAILED: {r.get('error')}")

print("-" * 95)

# Verify Supabase database aggregation
print("\nVerifying Supabase Cloud Database records...")
r_scans = requests.get(f"{base_url}/api/supabase/scans")
r_stats = requests.get(f"{base_url}/api/supabase/stats")
r_inv = requests.get(f"{base_url}/api/supabase/inventory")

scans_count = r_scans.json().get("total", 0)
stats = r_stats.json().get("stats", {})
inv_count = len(r_inv.json().get("inventory", []))

print(f"Total Scans in Supabase Cloud:    {scans_count}")
print(f"Unique Batches in Inventory:       {inv_count}")
print(f"Cloud Stats Summary:              {json.dumps(stats, indent=2)}")
print("=" * 95)
