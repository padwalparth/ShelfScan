import base64
import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("NVIDIA_API_KEY", "").strip()

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json"
}

with open("images/RPI1.jpeg", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")

candidate_models = [
    "meta/llama-3.2-11b-vision-instruct",
    "meta/llama-3.2-90b-vision-instruct",
    "mistralai/pixtral-large-2411",
    "nvidia/llama-3.2-nv-embedqa-1b-v1"
]

for model in candidate_models:
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": [
                {"type": "text", "text": "Extract batch number, mfg date, exp date, mrp as JSON"},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
            ]}
        ],
        "max_tokens": 512,
        "temperature": 0.1
    }
    try:
        res = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=60)
        print(f"Model {model} -> Status: {res.status_code}")
        if res.status_code == 200:
            print("Response:", res.json()["choices"][0]["message"]["content"])
    except Exception as e:
        print(f"Error {model}: {e}")
