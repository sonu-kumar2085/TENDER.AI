import os
import hashlib
import tempfile
import cv2
import fitz  # PyMuPDF
import numpy as np
import pdfplumber
import pytesseract
from typing import Dict, Any, List

# If Tesseract is not in PATH on Windows, you might need to set it here.
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def generate_md5(file_bytes: bytes) -> str:
    return hashlib.md5(file_bytes).hexdigest()

def deskew_image(image: np.ndarray) -> np.ndarray:
    coords = np.column_stack(np.where(image > 0))
    if len(coords) == 0:
        return image
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated

def process_scanned_image(image_bytes: bytes) -> str:
    # Decode image from bytes
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    
    # Pre-process: grayscale -> fastNlMeansDenoising -> Otsu thresholding -> deskew
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    # Invert before thresholding and deskewing
    inverted = cv2.bitwise_not(denoised)
    _, thresh = cv2.threshold(inverted, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    
    deskewed = deskew_image(thresh)
    # Re-invert back for OCR
    final_img = cv2.bitwise_not(deskewed)
    
    custom_config = r'--psm 6 --oem 3 -l eng'
    text = pytesseract.image_to_string(final_img, config=custom_config)
    return text

def process_pdf(file_path: str, file_bytes: bytes, filename: str) -> Dict[str, Any]:
    file_hash = generate_md5(file_bytes)
    
    pages_output = []
    doc_type = "DIGITAL"
    
    # We will use pdfplumber to detect page type and extract digital text/tables
    # and fitz for rendering images for scanned pages.
    with pdfplumber.open(file_path) as pdf:
        fitz_doc = fitz.open(file_path)
        
        for i, page in enumerate(pdf.pages):
            text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
            tables = page.extract_tables() or []
            
            page_type = "DIGITAL"
            ocr_confidence = 1.0
            
            if len(text.strip()) < 50:
                # Fallback to Scanned PDF path
                page_type = "SCANNED"
                doc_type = "HYBRID" if doc_type == "DIGITAL" and i > 0 else "SCANNED"
                
                # Render page as image using fitz at 300 DPI
                fitz_page = fitz_doc[i]
                pix = fitz_page.get_pixmap(dpi=300)
                img_bytes = pix.tobytes("png")
                
                extracted_text = process_scanned_image(img_bytes)
                text = extracted_text
                ocr_confidence = 0.85 # Approximation, can be calculated via pytesseract data
                
            pages_output.append({
                "text": text,
                "tables": tables,
                "ocr_confidence": ocr_confidence,
                "page_type": page_type
            })
            
        fitz_doc.close()

    return {
        "pages": pages_output,
        "doc_type": doc_type,
        "hash": file_hash,
        "metadata": {
            "filename": filename,
            "size": len(file_bytes),
            "page_count": len(pages_output)
        }
    }

def process_pdf_bytes(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    # Write to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
        temp_pdf.write(file_bytes)
        temp_path = temp_pdf.name
        
    try:
        result = process_pdf(temp_path, file_bytes, filename)
    finally:
        os.remove(temp_path)
        
    return result

# Dummy Data Generator
def generate_dummy_pdfs(output_dir: str):
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    import os
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate Tender
    tender_path = os.path.join(output_dir, "dummy_tender.pdf")
    c = canvas.Canvas(tender_path, pagesize=letter)
    c.drawString(100, 750, "CRPF Procurement Tender Document")
    c.drawString(100, 730, "Eligibility Conditions:")
    c.drawString(100, 710, "1. Minimum Turnover: Rs. 2 Crore per annum.")
    c.drawString(100, 690, "2. Minimum Experience: 5 years in similar projects.")
    c.drawString(100, 670, "3. EMD Value: 5,00,000 INR.")
    c.drawString(100, 650, "4. Valid ISO Certification: ISO 9001:2015.")
    c.drawString(100, 630, "5. Registered GSTIN and MSME (UDYAM).")
    c.save()
    
    # Generate Bidders
    bidders_info = [
        {"name": "Bidder_A", "turnover": "₹2.5 Cr", "exp": "Established 2015", "emd": "500000", "iso": "ISO 9001:2015", "msme": "UDYAM-MH-00-1234567"},
        {"name": "Bidder_B", "turnover": "1,50,00,000", "exp": "Established 2020", "emd": "500000", "iso": "ISO 9001:2015", "msme": "UDYAM-DL-00-7654321"},
        {"name": "Bidder_C", "turnover": "3 Crore", "exp": "Established 2010", "emd": "500000", "iso": "ISO 9001:2015", "msme": "UDYAM-MH-00-1234567"}, # Duplicate MSME for fraud
        {"name": "Bidder_D", "turnover": "Rs. 2 Crore", "exp": "Established 2018", "emd": "400000", "iso": "ISO 14001:2015", "msme": "UDYAM-KA-00-9999999"},
    ]
    
    for b in bidders_info:
        path = os.path.join(output_dir, f"{b['name']}.pdf")
        c = canvas.Canvas(path, pagesize=letter)
        c.drawString(100, 750, f"Bid Proposal: {b['name']}")
        c.drawString(100, 730, f"Annual Turnover: {b['turnover']}")
        c.drawString(100, 710, f"Company History: {b['exp']}")
        c.drawString(100, 690, f"EMD Paid: INR {b['emd']}")
        c.drawString(100, 670, f"Certifications: {b['iso']}")
        c.drawString(100, 650, f"Registration: {b['msme']}")
        c.save()

if __name__ == "__main__":
    generate_dummy_pdfs("dummy_data")
    print("Dummy PDFs generated.")
