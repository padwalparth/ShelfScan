import os
import time
import base64
import requests

gemini_key = os.getenv("GEMINI_API_KEY", "")

system_prompt = """You are an expert OCR & pharmaceutical/packaged product label extraction AI.
Extract all printed details accurately into strict JSON format with keys:
batch_number, mfg_date, exp_date, mrp, product_name, manufacturer, full_text, notes."""

models_to_test = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.8-flash", "gemini-2.5-flash-lite"]

for model_name in models_to_test:
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
            res = requests.post(url, headers=headers, json=payload, timeout=20)
            elapsed = time.time() - t0
            print(f"[{img_name}] Status: {res.status_code} | Latency: {elapsed:.2f}s")
            if res.status_code == 200:
                text_out = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                print("Output:", text_out.replace("\n", " ")[:250])
            else:
                print("Error:", res.text[:200])
        except Exception as e:
            print(f"[{img_name}] Exception: {e}")
