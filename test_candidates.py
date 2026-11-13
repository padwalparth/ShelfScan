import os
import time
import base64
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("NVIDIA_API_KEY", "").strip()

with open("images/RPI1.jpeg", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json"
}

vision_candidates = [
    "meta/llama-3.2-11b-vision-instruct",
    "microsoft/phi-3-vision-128k-instruct",
    "nvidia/neva-22b",
    "nvidia/vila",
    "meta/llama-3.2-90b-vision-instruct"
]

prompt = "Look closely at this packaging image. Extract the Batch No, Manufacturing Date (MFD/Mfg), Expiry Date (EXP), and MRP. Return valid JSON only: {\"batch_number\": \"...\", \"mfg_date\": \"...\", \"exp_date\": \"...\", \"mrp\": \"...\"}"

for model in vision_candidates:
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
                ]
            }
        ],
        "max_tokens": 512,
        "temperature": 0.1
    }
    t0 = time.time()
    try:
        res = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=20)
        dt = time.time() - t0
        print(f"\n--- Model: {model} (Status: {res.status_code}, Time: {dt:.2f}s) ---")
        if res.status_code == 200:
            print("Response:", res.json()["choices"][0]["message"]["content"])
        else:
            print("Error:", res.text[:200])
    except Exception as e:
        print(f"Failed {model}: {e}")
