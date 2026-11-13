import os
import time
import base64
import requests
from dotenv import load_dotenv

load_dotenv()
nvidia_key = os.getenv("NVIDIA_API_KEY", "").strip()
gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

print(f"NVIDIA Key: {'Present' if nvidia_key else 'Missing'}")
print(f"Gemini Key: {'Present' if gemini_key else 'Missing'}")

# Read RPI1.jpeg
with open("images/RPI1.jpeg", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")

prompt = "Extract batch_number, mfg_date, exp_date, mrp as a JSON object: {\"batch_number\": \"...\", \"mfg_date\": \"...\", \"exp_date\": \"...\", \"mrp\": \"...\"}. Output strictly JSON."

# Test NVIDIA models
nvidia_models = [
    "meta/llama-3.2-11b-vision-instruct",
    "meta/llama-3.2-90b-vision-instruct",
    "mistralai/pixtral-large-2411"
]

if nvidia_key:
    headers = {
        "Authorization": f"Bearer {nvidia_key}",
        "Accept": "application/json"
    }
    for model in nvidia_models:
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
            res = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=20)
            elapsed = time.time() - t0
            print(f"[NVIDIA] {model}: Status {res.status_code}, Time: {elapsed:.2f}s")
            if res.status_code == 200:
                print("   Output:", res.json()["choices"][0]["message"]["content"][:200].replace("\n", " "))
            else:
                print("   Error:", res.text[:200])
        except Exception as e:
            print(f"[NVIDIA] {model} Error: {e}")

# Test Gemini models if key exists
if gemini_key:
    gemini_models = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-3.7-flash"]
    for model in gemini_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64}}
                ]
            }],
            "generationConfig": {"temperature": 0.0, "response_mime_type": "application/json"}
        }
        t0 = time.time()
        try:
            res = requests.post(url, headers={"Content-Type": "application/json"}, json=payload, timeout=20)
            elapsed = time.time() - t0
            print(f"[Gemini] {model}: Status {res.status_code}, Time: {elapsed:.2f}s")
            if res.status_code == 200:
                data = res.json()
                print("   Output:", data["candidates"][0]["content"]["parts"][0]["text"][:200].replace("\n", " "))
            else:
                print("   Error:", res.text[:200])
        except Exception as e:
            print(f"[Gemini] {model} Error: {e}")
