import os
import re
from typing import Optional, Dict, Any, List
from PIL import Image, ImageEnhance, ImageOps
import cv2
import numpy as np

# Country prefix dictionary for GS1 EAN/UPC prefixes
GS1_COUNTRY_PREFIXES = {
    "000-019": ("000", "019", "USA & Canada"),
    "020-029": ("020", "029", "In-Store / Restricted"),
    "030-039": ("030", "039", "USA Drugs (NDC)"),
    "040-049": ("040", "049", "In-Store / Restricted"),
    "050-059": ("050", "059", "Coupons"),
    "060-139": ("060", "139", "USA & Canada"),
    "300-379": ("300", "379", "France"),
    "380": ("380", "380", "Bulgaria"),
    "383": ("383", "383", "Slovenia"),
    "385": ("385", "385", "Croatia"),
    "400-440": ("400", "440", "Germany"),
    "450-459": ("450", "459", "Japan"),
    "460-469": ("460", "469", "Russia"),
    "471": ("471", "471", "Taiwan"),
    "489": ("489", "489", "Hong Kong"),
    "490-499": ("490", "499", "Japan"),
    "500-509": ("500", "509", "United Kingdom"),
    "520-521": ("520", "521", "Greece"),
    "535": ("535", "535", "Malta"),
    "539": ("539", "539", "Ireland"),
    "540-549": ("540", "549", "Belgium & Luxembourg"),
    "570-579": ("570", "579", "Denmark"),
    "590": ("590", "590", "Poland"),
    "600-601": ("600", "601", "South Africa"),
    "690-699": ("690", "699", "China"),
    "700-709": ("700", "709", "Norway"),
    "730-739": ("730", "739", "Sweden"),
    "750": ("750", "750", "Mexico"),
    "760-769": ("760", "769", "Switzerland"),
    "770-771": ("770", "771", "Colombia"),
    "773": ("773", "773", "Uruguay"),
    "775": ("775", "775", "Peru"),
    "777": ("777", "777", "Bolivia"),
    "778-779": ("778", "779", "Argentina"),
    "780": ("780", "780", "Chile"),
    "784": ("784", "784", "Paraguay"),
    "786": ("786", "786", "Ecuador"),
    "789-790": ("789", "790", "Brazil"),
    "800-839": ("800", "839", "Italy"),
    "840-849": ("840", "849", "Spain"),
    "850": ("850", "850", "Cuba"),
    "858": ("858", "858", "Slovakia"),
    "859": ("859", "859", "Czech Republic"),
    "860": ("860", "860", "Serbia"),
    "867": ("867", "867", "North Korea"),
    "868-869": ("868", "869", "Turkey"),
    "870-879": ("870", "879", "Netherlands"),
    "880": ("880", "880", "South Korea"),
    "884": ("884", "884", "Cambodia"),
    "885": ("885", "885", "Thailand"),
    "888": ("888", "888", "Singapore"),
    "890": ("890", "890", "India (GS1 India)"),
    "893": ("893", "893", "Vietnam"),
    "896": ("896", "896", "Pakistan"),
    "899": ("899", "899", "Indonesia"),
    "900-919": ("900", "919", "Austria"),
    "930-939": ("930", "939", "Australia"),
    "940-949": ("940", "949", "New Zealand"),
    "955": ("955", "955", "Malaysia")
}

def get_country_from_barcode(code: str) -> Optional[str]:
    clean = re.sub(r"\D", "", code)
    if len(clean) < 3:
        return None
    prefix3 = clean[:3]
    try:
        val = int(prefix3)
    except ValueError:
        return None

    for key, (start, end, country) in GS1_COUNTRY_PREFIXES.items():
        if int(start) <= val <= int(end):
            return country
    return None

def validate_ean13_checksum(code: str) -> bool:
    clean = re.sub(r"\D", "", code)
    if len(clean) != 13:
        return False
    digits = [int(c) for c in clean]
    checksum = digits[-1]
    # Sum of odd position digits (index 0, 2, 4...) * 1 + even position (index 1, 3, 5...) * 3
    total = sum(digits[i] for i in range(0, 12, 2)) + sum(digits[i] * 3 for i in range(1, 12, 2))
    calculated = (10 - (total % 10)) % 10
    return calculated == checksum

def parse_gs1_data(barcode_text: str) -> Dict[str, Any]:
    """Parse GS1-128 or GS1 DataMatrix Application Identifiers."""
    parsed = {
        "is_gs1": False,
        "gtin": None,
        "batch_number": None,
        "exp_date": None,
        "mfg_date": None,
        "serial_number": None
    }
    # Pattern for (01) GTIN, (10) Batch, (17) Expiry YYMMDD, (11) Mfg YYMMDD, (21) Serial
    ai_patterns = {
        "gtin": r"(?:\(01\)|01)(\d{14})",
        "batch_number": r"(?:\(10\)|10)([A-Za-z0-9]{1,20})(?:\x1d|\(|$)",
        "exp_date": r"(?:\(17\)|17)(\d{6})",
        "mfg_date": r"(?:\(11\)|11)(\d{6})",
        "serial_number": r"(?:\(21\)|21)([A-Za-z0-9]{1,20})(?:\x1d|\(|$)"
    }
    found_any = False
    for key, pat in ai_patterns.items():
        m = re.search(pat, barcode_text)
        if m:
            val = m.group(1).strip()
            if key in ["exp_date", "mfg_date"] and len(val) == 6:
                # Format YYMMDD into DD/MM/20YY
                yy, mm, dd = val[0:2], val[2:4], val[4:6]
                if dd == "00":
                    dd = "01"
                val = f"{dd}/{mm}/20{yy}"
            parsed[key] = val
            found_any = True
            
    if found_any:
        parsed["is_gs1"] = True
    return parsed

def scan_barcodes_from_image(image: Image.Image) -> List[Dict[str, Any]]:
    """Scan 1D and 2D barcodes using zxingcpp and cv2 fallback with multi-angle and contrast search."""
    results = []
    seen_texts = set()

    import zxingcpp

    # Try angles: 0, 90, 180, 270 degrees and enhanced contrast
    rotations = [0, 90, 180, 270]
    
    for rot in rotations:
        work_img = image.rotate(rot, expand=True) if rot != 0 else image
        
        # 1. Standard scan
        barcodes = zxingcpp.read_barcodes(work_img)
        for b in barcodes:
            t = (b.text or "").strip()
            if t and t not in seen_texts:
                seen_texts.add(t)
                fmt = str(b.format).split(".")[-1]
                results.append(build_barcode_result(t, fmt, b.content_type))
                
        # 2. Contrast enhanced scan if not found
        if not results:
            enh = ImageEnhance.Contrast(work_img).enhance(1.8)
            sharp = ImageEnhance.Sharpness(enh).enhance(1.5)
            barcodes = zxingcpp.read_barcodes(sharp)
            for b in barcodes:
                t = (b.text or "").strip()
                if t and t not in seen_texts:
                    seen_texts.add(t)
                    fmt = str(b.format).split(".")[-1]
                    results.append(build_barcode_result(t, fmt, b.content_type))
                    
        if results:
            break

    # OpenCV fallback if zxingcpp found nothing
    if not results:
        try:
            cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            # Try 1D Barcode detector
            detector = cv2.barcode.BarcodeDetector()
            dec_info, dec_type, _ = detector.detectAndDecode(cv_img)
            if dec_info and dec_info.strip():
                t = dec_info.strip()
                if t not in seen_texts:
                    results.append(build_barcode_result(t, dec_type or "BARCODE", None))
            # Try QR Code detector
            qr_detector = cv2.QRCodeDetector()
            qr_val, _, _ = qr_detector.detectAndDecode(cv_img)
            if qr_val and qr_val.strip() and qr_val.strip() not in seen_texts:
                results.append(build_barcode_result(qr_val.strip(), "QR_CODE", None))
        except Exception:
            pass

    return results

def build_barcode_result(text: str, format_name: str, content_type: Any) -> Dict[str, Any]:
    country = get_country_from_barcode(text)
    is_valid_ean = validate_ean13_checksum(text) if len(re.sub(r"\D", "", text)) == 13 else None
    gs1 = parse_gs1_data(text)

    # Determine type category
    is_2d = format_name.upper() in ["QR_CODE", "DATAMATRIX", "AZTEC", "PDF417", "MAXICODE"]
    symbology_family = "2D Matrix / QR" if is_2d else "1D Linear Barcode"

    return {
        "text": text,
        "format": format_name,
        "symbology_family": symbology_family,
        "country": country,
        "is_valid_checksum": is_valid_ean,
        "gs1_data": gs1,
        "content_type": str(content_type) if content_type else "Text"
    }

if __name__ == "__main__":
    for fname in sorted(os.listdir("images")):
        if fname.lower().endswith((".jpg", ".jpeg", ".png")):
            p = os.path.join("images", fname)
            im = Image.open(p)
            res = scan_barcodes_from_image(im)
            if res:
                codes = [f"{r['format']}: {r['text']} (Origin: {r['country']})" for r in res]
                print(f"[FOUND] {fname} -> {codes}")
            else:
                print(f"[NONE ] {fname}")

