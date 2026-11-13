import os
import base64
import requests

gemini_key = os.getenv("GEMINI_API_KEY", "")

with open("images/RPI1.jpeg", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")

prompt = "Extract batch_number, mfg_date, exp_date, mrp as JSON strictly matching keys: batch_number, mfg_date, exp_date, mrp"

models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash", "gemini-1.5-pro"]

for m in models:
    print(f"\n--- Testing Gemini model: {m} ---")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={gemini_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64}}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.0,
            "response_mime_type": "application/json"
        }
    }
    try:
        res = requests.post(url, headers={"Content-Type": "application/json"}, json=payload, timeout=20)
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            print("Output:\n", res.json()["candidates"][0]["content"]["parts"][0]["text"])
        else:
            print("Error response:\n", res.text[:300])
    except Exception as e:
        print("Exception:", e)
