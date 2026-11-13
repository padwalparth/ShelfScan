import base64
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("NVIDIA_API_KEY", "").strip()

print(f"API key loaded, length: {len(api_key)}")

image_path = os.path.join("images", "RPI1.jpeg")
if not os.path.exists(image_path):
    print("Image not found:", image_path)
    exit(1)

with open(image_path, "rb") as f:
    b64_img = base64.b64encode(f.read()).decode("utf-8")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json"
}

models_to_test = [
    "meta/llama-3.2-11b-vision-instruct",
    "meta/llama-3.2-90b-vision-instruct",
    "mistralai/pixtral-12b",
    "google/gemma-3-27b-it",
    "google/gemma-4-31b-it",
    "nvidia/neva-22b"
]

for model in models_to_test:
    print(f"Testing model: {model} ...")
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract all text and batch information from this product label. Specifically extract: Batch Number (B.No/Lot), Manufacturing Date (Mfg Date), Expiry Date (Exp Date), MRP / Price, and Full Raw OCR Text. Return as JSON with keys: batch_number, mfg_date, exp_date, mrp, full_text, other_details."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}}
                ]
            }
        ],
        "max_tokens": 1024,
        "temperature": 0.1
    }
    try:
        res = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=25)
        print(f"Model {model} -> Status: {res.status_code}")
        if res.status_code == 200:
            content = res.json()["choices"][0]["message"]["content"]
            print("SUCCESS! Output:")
            print(content)
            break
        else:
            print("Error response:", res.text[:300])
    except Exception as e:
        print(f"Exception: {e}")
