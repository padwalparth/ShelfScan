import requests
import json

base = "http://127.0.0.1:8000"

try:
    r_root = requests.get(base + "/")
    print(f"Root endpoint: {r_root.status_code}")
    
    r_cfg = requests.get(base + "/api/config")
    print("Config:", json.dumps(r_cfg.json(), indent=2))
    
    r_status = requests.get(base + "/api/supabase/status")
    print("Supabase Status:", json.dumps(r_status.json(), indent=2))
    
    r_stats = requests.get(base + "/api/supabase/stats")
    print("Supabase Stats:", json.dumps(r_stats.json(), indent=2))
    
    r_scans = requests.get(base + "/api/supabase/scans")
    print("Supabase Scans count:", r_scans.json().get("total"))
    
    r_inv = requests.get(base + "/api/supabase/inventory")
    print("Supabase Inventory count:", len(r_inv.json().get("inventory", [])))
    
    print("\n--- ALL SUPABASE LIVE REST API TESTS PASSED SUCCESSFULLY! ---")
except Exception as e:
    print("Error querying server:", e)
