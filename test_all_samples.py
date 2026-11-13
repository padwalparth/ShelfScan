import base64
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("NVIDIA_API_KEY", "").strip()

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json"
}

for img_name in ["RPI1.jpeg", "RPI2.jpeg", "RPI3.jpeg"]:
    img_path = os.path.join("images", img_name)
    if not os.path.exists(img_path):
        continue
    with open(img_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    
    payload = {
        "model": "meta/llama-3.2-90b-vision-instruct",
        "messages": [
            {
                "role": "system",
                "content": "You are an expert OCR & pharmaceutical/packaged product label extraction AI. Extract all printed details accurately into strict JSON format with keys: batch_number, mfg_date, exp_date, mrp, product_name, manufacturer, full_text, notes."
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Extract all label text and details for image {img_name}."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
                ]
            }
        ],
        "max_tokens": 1024,
        "temperature": 0.1
    }
    res = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=25)
    print(f"--- Result for {img_name} (Status: {res.status_code}) ---")
    if res.status_code == 200:
        print(res.json()["choices"][0]["message"]["content"])
    else:
        print("Error:", res.text)
