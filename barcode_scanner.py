"""
BatchScan AI · Barcode & 2D Matrix Intelligence Engine
High-performance decoding for EAN-13, UPC, GS1-128, QR Code, DataMatrix with GS1 Application Identifiers parsing.
"""

import io
import re
from typing import Optional, Dict, Any, List
from PIL import Image, ImageEnhance
import cv2
import numpy as np

# GS1 Country Prefix Table
GS1_PREFIX_MAPPING = [
    (0, 19, "United States & Canada"),
    (20, 29, "In-Store / Restricted Distribution"),
    (30, 39, "United States (National Drug Code NDC)"),
    (40, 49, "In-Store / Restricted Distribution"),
    (50, 59, "Coupons"),
    (60, 139, "United States & Canada"),
    (300, 379, "France"),
    (380, 380, "Bulgaria"),
    (383, 383, "Slovenia"),
    (385, 385, "Croatia"),
    (387, 387, "Bosnia and Herzegovina"),
    (400, 440, "Germany"),
    (450, 459, "Japan"),
    (460, 469, "Russia"),
    (470, 470, "Kyrgyzstan"),
    (471, 471, "Taiwan"),
    (474, 474, "Estonia"),
    (475, 475, "Latvia"),
    (476, 476, "Azerbaijan"),
    (477, 477, "Lithuania"),
    (478, 478, "Uzbekistan"),
    (479, 479, "Sri Lanka"),
    (480, 480, "Philippines"),
    (481, 481, "Belarus"),
    (482, 482, "Ukraine"),
    (484, 484, "Moldova"),
    (485, 485, "Armenia"),
    (486, 486, "Georgia"),
    (487, 487, "Kazakhstan"),
    (488, 488, "Tajikistan"),
    (489, 489, "Hong Kong"),
    (490, 499, "Japan"),
    (500, 509, "United Kingdom"),
    (520, 521, "Greece"),
    (528, 528, "Lebanon"),
    (529, 529, "Cyprus"),
    (530, 530, "Albania"),
    (531, 531, "North Macedonia"),
    (535, 535, "Malta"),
    (539, 539, "Ireland"),
    (540, 549, "Belgium & Luxembourg"),
    (560, 560, "Portugal"),
    (569, 569, "Iceland"),
    (570, 579, "Denmark, Faroe Islands, Greenland"),
    (590, 590, "Poland"),
    (594, 594, "Romania"),
    (599, 599, "Hungary"),
    (600, 601, "South Africa"),
    (603, 603, "Ghana"),
    (604, 604, "Senegal"),
    (608, 608, "Bahrain"),
    (609, 609, "Mauritius"),
    (611, 611, "Morocco"),
    (613, 613, "Algeria"),
    (615, 615, "Nigeria"),
    (616, 616, "Kenya"),
    (618, 618, "Ivory Coast"),
    (619, 619, "Tunisia"),
    (621, 621, "Syria"),
    (622, 622, "Egypt"),
    (624, 624, "Libya"),
    (625, 625, "Jordan"),
    (626, 626, "Iran"),
    (627, 627, "Kuwait"),
    (628, 628, "Saudi Arabia"),
    (629, 629, "United Arab Emirates"),
    (640, 649, "Finland"),
    (690, 699, "China"),
    (700, 709, "Norway"),
    (729, 729, "Israel"),
    (730, 739, "Sweden"),
    (740, 740, "Guatemala"),
    (741, 741, "El Salvador"),
    (742, 742, "Honduras"),
    (743, 743, "Nicaragua"),
    (744, 744, "Costa Rica"),
    (745, 745, "Panama"),
    (746, 746, "Dominican Republic"),
    (750, 750, "Mexico"),
    (754, 755, "Canada"),
    (759, 759, "Venezuela"),
    (760, 769, "Switzerland & Liechtenstein"),
    (770, 771, "Colombia"),
    (773, 773, "Uruguay"),
    (775, 775, "Peru"),
    (777, 777, "Bolivia"),
    (778, 779, "Argentina"),
    (780, 780, "Chile"),
    (784, 784, "Paraguay"),
    (786, 786, "Ecuador"),
    (789, 790, "Brazil"),
    (800, 839, "Italy, San Marino, Vatican City"),
    (840, 849, "Spain & Andorra"),
    (850, 850, "Cuba"),
    (858, 858, "Slovakia"),
    (859, 859, "Czech Republic"),
    (860, 860, "Serbia"),
    (865, 865, "Mongolia"),
    (867, 867, "North Korea"),
    (868, 869, "Turkey"),
    (870, 879, "Netherlands"),
    (880, 880, "South Korea"),
    (884, 884, "Cambodia"),
    (885, 885, "Thailand"),
    (888, 888, "Singapore"),
    (890, 890, "India (GS1 India)"),
    (893, 893, "Vietnam"),
    (896, 896, "Pakistan"),
    (899, 899, "Indonesia"),
    (900, 919, "Austria"),
    (930, 939, "Australia"),
    (940, 949, "New Zealand"),
    (955, 955, "Malaysia"),
    (958, 958, "Macau")
]

# Curated catalog mapping for demonstration and fast verification
KNOWN_BARCODE_CATALOG = {
    "8908017753204": {
        "product_name": "Raspberry Pi Pico H (Pre-soldered Headers)",
        "brand": "Raspberry Pi",
        "category": "Electronics / Microcontrollers",
        "manufacturer": "Raspberry Pi Foundation / Indian Distributor",
        "packaging": "Protective Blister Pack / Carton"
    },
    "8904293725881": {
        "product_name": "Balaji Savouries & Packaged Snacks",
        "brand": "Balaji Wafers Pvt. Ltd.",
        "category": "Food & Snacks",
        "manufacturer": "Balaji Wafers Pvt. Ltd., Vajdi (Vad), Gujarat, India",
        "packaging": "Flexible Nitrogen-Flushed Pouch"
    }
}


def get_country_of_origin(code_str: str) -> Optional[str]:
    """Determine country of origin from EAN/UPC GS1 country prefix."""
    digits = re.sub(r"\D", "", code_str)
    if len(digits) < 3:
        return None
    try:
        val = int(digits[:3])
        for start, end, country in GS1_PREFIX_MAPPING:
            if start <= val <= end:
                return country
    except Exception:
        pass
    return None


def calculate_ean_checksum(digits_str: str) -> int:
    """Calculate standard GS1 Modulo-10 check digit."""
    # For a 12-digit string to calculate 13th digit, or 7-digit to calculate 8th
    total = 0
    reverse_digits = [int(c) for c in digits_str[::-1]]
    for idx, d in enumerate(reverse_digits):
        weight = 3 if idx % 2 == 0 else 1
        total += d * weight
    return (10 - (total % 10)) % 10


def validate_checksum(code_str: str) -> Optional[bool]:
    """Verify check digit for EAN-13, EAN-8, or UPC-A."""
    clean = re.sub(r"\D", "", code_str)
    if len(clean) not in [8, 12, 13, 14]:
        return None
    check_digit = int(clean[-1])
    computed = calculate_ean_checksum(clean[:-1])
    return computed == check_digit


def parse_gs1_application_identifiers(raw_text: str) -> Dict[str, Any]:
    """
    Parse GS1 Application Identifiers (AI) from 1D (GS1-128) or 2D (GS1 DataMatrix/QR).
    Common AIs:
      (01) GTIN (14 digits)
      (10) Batch / Lot Number (up to 20 chars)
      (17) Expiry Date (YYMMDD)
      (11) Production Date (YYMMDD)
      (21) Serial Number (up to 20 chars)
      (310x) Net Weight
    """
    data = {
        "is_gs1": False,
        "gtin": None,
        "batch_number": None,
        "exp_date": None,
        "mfg_date": None,
        "serial_number": None,
        "parsed_fields": {}
    }

    text = raw_text.strip()
    # Check if text has explicit AI parentheses e.g. (01)08908017753204(10)F28H97(17)270813
    has_parens = bool(re.search(r"\(\d{2,4}\)", text))

    if has_parens:
        # Match parenthesized AIs
        ai_matches = re.finditer(r"\((\d{2,4})\)([^()]+)", text)
        for m in ai_matches:
            ai_code = m.group(1)
            ai_val = m.group(2).strip()
            data["parsed_fields"][ai_code] = ai_val
            data["is_gs1"] = True

            if ai_code == "01":
                data["gtin"] = ai_val
            elif ai_code == "10":
                data["batch_number"] = ai_val
            elif ai_code == "17" and len(ai_val) == 6:
                # YYMMDD -> DD/MM/20YY
                yy, mm, dd = ai_val[0:2], ai_val[2:4], ai_val[4:6]
                if dd == "00": dd = "01"
                data["exp_date"] = f"{dd}/{mm}/20{yy}"
            elif ai_code == "11" and len(ai_val) == 6:
                yy, mm, dd = ai_val[0:2], ai_val[2:4], ai_val[4:6]
                if dd == "00": dd = "01"
                data["mfg_date"] = f"{dd}/{mm}/20{yy}"
            elif ai_code == "21":
                data["serial_number"] = ai_val
    else:
        # Check standard 13-digit EAN as GTIN
        clean_digits = re.sub(r"\D", "", text)
        if len(clean_digits) in [12, 13, 14]:
            data["gtin"] = clean_digits
            data["parsed_fields"]["01"] = clean_digits

    return data


def scan_barcodes_from_pil(image: Image.Image) -> List[Dict[str, Any]]:
    """
    Decodes 1D and 2D barcodes across multiple orientations and contrast levels.
    Uses zxingcpp (fast C++ library) with OpenCV fallback.
    """
    found_barcodes = []
    seen_texts = set()

    try:
        import zxingcpp
        has_zxing = True
    except ImportError:
        has_zxing = False

    # Multi-orientation scanning: 0, 180, 90, 270 degrees
    # Most packaging scans are either upright or upside down
    angles = [0, 180, 90, 270]

    for angle in angles:
        work_img = image.rotate(angle, expand=True) if angle != 0 else image

        if has_zxing:
            # 1. Normal contrast pass
            try:
                hits = zxingcpp.read_barcodes(work_img)
                for h in hits:
                    val = (h.text or "").strip()
                    if val and val not in seen_texts:
                        seen_texts.add(val)
                        fmt = str(h.format).split(".")[-1]
                        found_barcodes.append(format_barcode_hit(val, fmt, angle, False))
            except Exception:
                pass

            # 2. Enhanced contrast pass if none found in this angle
            if not found_barcodes:
                try:
                    enh = ImageEnhance.Contrast(work_img).enhance(1.8)
                    sharp = ImageEnhance.Sharpness(enh).enhance(1.5)
                    hits = zxingcpp.read_barcodes(sharp)
                    for h in hits:
                        val = (h.text or "").strip()
                        if val and val not in seen_texts:
                            seen_texts.add(val)
                            fmt = str(h.format).split(".")[-1]
                            found_barcodes.append(format_barcode_hit(val, fmt, angle, True))
                except Exception:
                    pass

        if found_barcodes:
            break

    # OpenCV fallback
    if not found_barcodes:
        try:
            cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            # Try 1D barcode detector
            barcode_det = cv2.barcode.BarcodeDetector()
            dec_info, dec_type, points = barcode_det.detectAndDecode(cv_img)
            if dec_info and dec_info.strip() and dec_info.strip() not in seen_texts:
                seen_texts.add(dec_info.strip())
                found_barcodes.append(format_barcode_hit(dec_info.strip(), dec_type or "BARCODE", 0, False))

            # Try QR code detector
            qr_det = cv2.QRCodeDetector()
            qr_text, points, _ = qr_det.detectAndDecode(cv_img)
            if qr_text and qr_text.strip() and qr_text.strip() not in seen_texts:
                seen_texts.add(qr_text.strip())
                found_barcodes.append(format_barcode_hit(qr_text.strip(), "QR_CODE", 0, False))
        except Exception:
            pass

    return found_barcodes


def format_barcode_hit(raw_text: str, format_name: str, orientation_deg: int, enhanced: bool) -> Dict[str, Any]:
    """Structure a decoded barcode hit with metadata, country, validation, and catalog lookup."""
    clean_fmt = format_name.upper().replace("-", "_")
    is_2d = clean_fmt in ["QR_CODE", "DATAMATRIX", "AZTEC", "PDF417", "MAXICODE"]
    symbology_family = "2D Matrix Code" if is_2d else "1D Linear Barcode"

    country = get_country_of_origin(raw_text)
    is_valid_chk = validate_checksum(raw_text)
    gs1_parsed = parse_gs1_application_identifiers(raw_text)

    # Catalog metadata check
    catalog_info = KNOWN_BARCODE_CATALOG.get(raw_text.strip()) or KNOWN_BARCODE_CATALOG.get(gs1_parsed.get("gtin") or "")

    return {
        "text": raw_text,
        "format": format_name,
        "symbology_family": symbology_family,
        "is_2d": is_2d,
        "country": country,
        "is_valid_checksum": is_valid_chk,
        "gs1": gs1_parsed,
        "catalog_info": catalog_info,
        "scan_meta": {
            "orientation_detected": orientation_deg,
            "contrast_enhanced": enhanced
        }
    }


def cross_verify_with_ocr(barcode_hit: Optional[Dict[str, Any]], ocr_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Cross-verifies barcode information with OCR extracted batch & product fields.
    Reconciles any discrepancies or supplements missing fields.
    """
    if not barcode_hit:
        return {
            "status": "NO_BARCODE",
            "badge_class": "badge-neutral",
            "message": "No barcode detected in packaging frame",
            "aligned": False,
            "suggestions": []
        }

    suggestions = []
    aligned = True
    messages = []

    # 1. Check GS1 Batch Number vs OCR Batch Number
    gs1 = barcode_hit.get("gs1", {})
    barcode_batch = gs1.get("batch_number")
    ocr_batch = ocr_data.get("batch_number")

    if barcode_batch:
        if ocr_batch:
            clean_b_bar = re.sub(r"[^A-Za-z0-9]", "", str(barcode_batch)).upper()
            clean_b_ocr = re.sub(r"[^A-Za-z0-9]", "", str(ocr_batch)).upper()
            if clean_b_bar == clean_b_ocr:
                messages.append(f"Barcode GS1 Batch ({barcode_batch}) matches OCR batch code perfectly.")
            else:
                aligned = False
                messages.append(f"Batch mismatch: Barcode GS1 has '{barcode_batch}' vs OCR printed '{ocr_batch}'.")
                suggestions.append({
                    "field": "batch_number",
                    "suggested_value": barcode_batch,
                    "reason": "Cryptographically encoded in GS1 Barcode"
                })
        else:
            messages.append(f"OCR missed batch code, but Barcode GS1 provided: '{barcode_batch}'.")
            suggestions.append({
                "field": "batch_number",
                "suggested_value": barcode_batch,
                "reason": "Direct GS1 Barcode Batch Extraction"
            })

    # 2. Check GS1 Expiry Date
    barcode_exp = gs1.get("exp_date")
    ocr_exp = ocr_data.get("exp_date")
    if barcode_exp:
        if ocr_exp:
            messages.append(f"Barcode GS1 Expiry ({barcode_exp}) available for cross-validation.")
        else:
            suggestions.append({
                "field": "exp_date",
                "suggested_value": barcode_exp,
                "reason": "Decoded from GS1 Expiration Tag"
            })

    # 3. Product Catalog Enrichment
    cat = barcode_hit.get("catalog_info")
    if cat:
        messages.append(f"GTIN verified in packaging catalog: {cat.get('product_name')}")
        if not ocr_data.get("product_name") or "label" in str(ocr_data.get("product_name")).lower():
            suggestions.append({
                "field": "product_name",
                "suggested_value": cat.get("product_name"),
                "reason": "Catalog lookup via verified Barcode GTIN"
            })
        if not ocr_data.get("manufacturer") or str(ocr_data.get("manufacturer")).lower() in ["none", "not specified"]:
            suggestions.append({
                "field": "manufacturer",
                "suggested_value": cat.get("manufacturer"),
                "reason": "Manufacturer registered to Barcode prefix"
            })

    # 4. Checksum and Country verification
    country = barcode_hit.get("country")
    if country:
        messages.append(f"GS1 Origin: {country}")

    chk = barcode_hit.get("is_valid_checksum")
    if chk is True:
        messages.append("Valid GS1 Modulo-10 checksum verified.")
    elif chk is False:
        aligned = False
        messages.append("Warning: Barcode check digit validation failed.")

    status = "VERIFIED_MATCH" if aligned else "DISCREPANCY_ALERT"
    badge_class = "badge-success" if aligned else "badge-warning"

    return {
        "status": status,
        "badge_class": badge_class,
        "message": " · ".join(messages) if messages else "Barcode scanned successfully",
        "aligned": aligned,
        "suggestions": suggestions
    }


def scan_barcode_bytes(image_bytes: bytes) -> Dict[str, Any]:
    """Entry point: decodes barcodes from raw image bytes and returns structured payload."""
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        # Convert RGBA or grayscale to RGB
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")
    except Exception as e:
        return {
            "detected": False,
            "count": 0,
            "barcodes": [],
            "error": f"Invalid image format: {str(e)}"
        }

    hits = scan_barcodes_from_pil(pil_img)

    if not hits:
        return {
            "detected": False,
            "count": 0,
            "primary": None,
            "barcodes": []
        }

    return {
        "detected": True,
        "count": len(hits),
        "primary": hits[0],
        "barcodes": hits
    }
