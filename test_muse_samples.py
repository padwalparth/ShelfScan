import os
import time
import base64
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("NVIDIA_API_KEY", "").strip()

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json"
}

model = "meta/muse-glimmer-30b"
prompt = "Analyze this packaging image and extract the following into strict JSON: batch_number, mfg_date, exp_date, mrp."

for img_name in ["RPI1.jpeg", "RPI2.jpeg", "RPI3.jpeg"]:
    img_path = os.path.join("images", img_name)
    with open(img_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
            ]}
        ],
        "max_tokens": 512,
        "temperature": 0.0
    }
    t0 = time.time()
    try:
        res = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=35)
        dt = time.time() - t0
        print(f"\n--- {img_name} ({model}) [Status: {res.status_code}, Time: {dt:.2f}s] ---")
        if res.status_code == 200:
            print(res.json()["choices"][0]["message"]["content"])
        else:
            print("Error:", res.text)
    except Exception as e:
        print(f"Error for {img_name}: {e}")
