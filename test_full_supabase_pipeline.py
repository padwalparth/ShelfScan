import json
from starlette.testclient import TestClient
from app import app, supabase_client

client = TestClient(app)

def test_full_supabase_pipeline():
    print("1. Checking config...")
    cfg = client.get("/api/config").json()
    print("Config has_supabase:", cfg.get("has_supabase"))
    assert cfg.get("has_supabase") is True, "Supabase should be configured"

    print("2. Checking Supabase status endpoint...")
    status = client.get("/api/supabase/status").json()
    print("Supabase status:", status)
    assert status.get("connected") is True

    print("3. Testing Batch extraction with automatic Supabase persistence...")
    res = client.post("/api/extract", data={
        "sample_name": "RPI1.jpeg",
        "provider": "gemini",
        "model": "gemini-3.5-flash-lite"
    })
    print("Extract status code:", res.status_code)
    data = res.json()
    print("Extract result success:", data.get("success"))
    print("Extracted Batch No:", data.get("data", {}).get("batch_number"))
    print("Saved to cloud:", data.get("saved_to_cloud"))
    print("Supabase Scan ID:", data.get("supabase_id"))

    print("4. Fetching Supabase Scans...")
    scans_res = client.get("/api/supabase/scans").json()
    print("Total scans returned:", scans_res.get("total"))
    if scans_res.get("scans"):
        latest = scans_res["scans"][0]
        print("Latest scan row in cloud:", {
            "id": latest.get("id"),
            "batch_number": latest.get("batch_number"),
            "expiry_status": latest.get("expiry_status"),
            "mrp": latest.get("mrp")
        })

    print("5. Fetching Supabase Stats...")
    stats_res = client.get("/api/supabase/stats").json()
    print("Stats:", json.dumps(stats_res.get("stats", {}), indent=2))

    print("6. Fetching Supabase Master Inventory Batches...")
    inv_res = client.get("/api/supabase/inventory").json()
    print("Master inventory count:", len(inv_res.get("inventory", [])))
    if inv_res.get("inventory"):
        print("First master batch:", inv_res["inventory"][0])

    print("\n>>> ALL SUPABASE PIPELINE INTEGRATION TESTS SUCCEEDED! <<<")

if __name__ == "__main__":
    test_full_supabase_pipeline()
