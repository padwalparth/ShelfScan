import os
import time
import json
import base64
import requests

gemini_key = os.getenv("GEMINI_API_KEY", "")

system_prompt = """You are an expert OCR & pharmaceutical/packaged product label extraction AI.
Extract all printed details accurately into strict JSON format with keys:
batch_number, mfg_date, exp_date, mrp, product_name, manufacturer, full_text, notes."""

models = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash", "gemini-3.8-flash"]

for model_name in models:
    print(f"\n=======================================================")
    print(f"Testing Model: {model_name}")
    print(f"=======================================================")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
    headers = {"Content-Type": "application/json"}
    
    for img_name in ["RPI1.jpeg", "RPI2.jpeg", "RPI3.jpeg"]:
        img_path = os.path.join("images", img_name)
        with open(img_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{
                "parts": [
                    {"text": f"Extract all label text and details for image {img_name} into strict JSON."},
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64}}
                ]
            }],
            "generationConfig": {
                "temperature": 0.0,
                "response_mime_type": "application/json"
            }
        }
        
        t0 = time.time()
        try:
            res = requests.post(url, headers=headers, json=payload, timeout=25)
            elapsed = time.time() - t0
            print(f"[{img_name}] Status: {res.status_code} | Latency: {elapsed:.2f}s")
            if res.status_code == 200:
                data = res.json()
                text_out = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text_out)
                print(f"   Batch: {parsed.get('batch_number')}, Mfg: {parsed.get('mfg_date')}, Exp: {parsed.get('exp_date')}, MRP: {parsed.get('mrp')}")
            else:
                print("   Error:", res.text[:200].replace("\n", " "))
        except Exception as e:
            print(f"[{img_name}] Exception: {e}")
