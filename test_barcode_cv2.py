import cv2
import numpy as np

def test():
    img = cv2.imread("images/RPI1.jpeg")
    if img is None:
        print("Image not loaded")
        return
    detector = cv2.barcode.BarcodeDetector()
    res = detector.detectAndDecode(img)
    print("res length:", len(res))
    print("decoded_info:", res[0])
    print("decoded_type:", res[1])

if __name__ == "__main__":
    test()
