import os
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL", "").strip()
key = os.getenv("SUPABASE_KEY", "").strip()

print(f"Testing Supabase connection to: {url}")
if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_KEY in .env")
    exit(1)

try:
    from supabase import create_client
    client = create_client(url, key)
    print("Supabase client initialized successfully.")
    
    try:
        r1 = client.table("batch_scans").select("id").limit(1).execute()
        print("[batch_scans table]: OK! Current records count:", len(r1.data))
    except Exception as e:
        print("[batch_scans table] Notice/Error:", e)
        
    try:
        r2 = client.table("inventory_batches").select("id").limit(1).execute()
        print("[inventory_batches table]: OK! Current records count:", len(r2.data))
    except Exception as e:
        print("[inventory_batches table] Notice/Error:", e)

except Exception as e:
    print("Supabase connection exception:", e)
