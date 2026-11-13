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

models_from_catalog = [
    "deepseek-ai/deepseek-v4.1-flash",
    "moonshotai/kimi-k3",
    "meta/muse-glimmer-30b",
    "google/gemma-3-12b-it",
    "meta/llama-3.2-11b-vision-instruct"
]

prompt = "Analyze this packaging image and extract the following into strict JSON: batch_number, mfg_date, exp_date, mrp. Ground truth expected: batch F28H97, mfg 14/08/2026, exp 13/08/2027, mrp 300."

for model in models_from_catalog:
    print(f"\n==========================================")
    print(f"Testing NIM Model: {model}")
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
        res = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=25)
        dt = time.time() - t0
        print(f"Status: {res.status_code} | Time: {dt:.2f}s")
        if res.status_code == 200:
            content = res.json()["choices"][0]["message"]["content"]
            print("Response:\n", content)
        else:
            print("Error details:", res.text[:300])
    except Exception as e:
        print(f"Exception for {model}: {e}")
