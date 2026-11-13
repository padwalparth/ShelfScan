import os
import sys
import json
import asyncio

# Set utf-8 stdout for Windows console
sys.stdout.reconfigure(encoding='utf-8')

from app import extract_label, process_and_encode_image

async def run_test():
    for img_name in ["RPI1.jpeg", "RPI2.jpeg", "RPI3.jpeg"]:
        img_path = os.path.join("images", img_name)
        with open(img_path, "rb") as f:
            img_bytes = f.read()

        b64 = process_and_encode_image(img_bytes)
        result = await extract_label(
            image_base64=b64,
            sample_name=img_name,
            provider="gemini",
            model="gemini-3.5-flash-lite"
        )
        print(f"\n==========================================")
        print(f"Result for: {img_name}")
        print(f"Model Used: {result['model_used']}")
        d = result['data']
        print(f"Batch Number : {d.get('batch_number')}")
        print(f"Mfg Date     : {d.get('mfg_date')}")
        print(f"Exp Date     : {d.get('exp_date')}")
        print(f"MRP          : {d.get('mrp')}")
        print(f"Expiry Status: {result['expiry_analysis'].get('label')}")
        gt = result.get('ground_truth_comparison')
        if gt:
            print(f"Batch Match  : {'MATCH' if gt.get('batch_match') else 'MISMATCH'} (Expected: {gt.get('expected_batch')})")

if __name__ == "__main__":
    asyncio.run(run_test())
