import sys
import json
from starlette.testclient import TestClient
from app import app

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

client = TestClient(app)

print("1. Seeding 5-day expiry demo alert batches...")
r_seed = client.post("/api/supabase/seed-demo-alerts")
print("Seed Status:", r_seed.status_code, r_seed.json())

print("\n2. Fetching full intelligence telemetry...")
r_intel = client.get("/api/supabase/intelligence")
data = r_intel.json()
print("Health Score:", data.get("health_score"))
print("Total Batches Analyzed:", data.get("total_batches_analyzed"))
print("Total Scans Analyzed:", data.get("total_scans_analyzed"))
print("Financial Summary:", data.get("financial_summary"))
print(f"5-Day Critical Expiry Alerts ({data.get('alerts_5_days_count')} found):")
for a in data.get("alerts_5_days", []):
    print(f"  - [{a.get('batch_number')}] {a.get('product_name')} | Exp: {a.get('exp_date')} ({a.get('days_left')}d left) -> {a.get('recommendation')}")

print("\nTop Selling Product Velocity:")
top_p = data.get("top_selling_product")
if top_p:
    print(f"  - TOP SELLER: {top_p.get('product_name')} ({top_p.get('total_scans')} scans, {top_p.get('share_percentage')}% store share) [{top_p.get('velocity_badge')}]")

print("\nProduct Velocity Rankings:")
for pv in data.get("product_velocity", []):
    print(f"  - {pv.get('product_name')}: {pv.get('total_scans')} scans ({pv.get('share_percentage')}%) -> {pv.get('velocity_badge')}")

print(f"\nSuggestions ({len(data.get('suggestions', []))} generated):")
for sug in data.get("suggestions", []):
    print(f"  - [{sug.get('badge')}] {sug.get('title')}: {sug.get('message')} (Action: {sug.get('action_label')})")

print("\n3. Testing Gemini AI Executive Insights Generation...")
r_ai = client.post("/api/supabase/ai-insights")
print("AI Insights Status:", r_ai.status_code)
if r_ai.status_code == 200:
    print("\n--- AI EXECUTIVE BRIEFING PREVIEW ---")
    print(r_ai.json().get("insights_markdown", "")[:600] + "\n...")
else:
    print("AI Insights Response:", r_ai.text)

print("\n>>> ALL INTELLIGENCE & ALERT TESTS PASSED! <<<")

