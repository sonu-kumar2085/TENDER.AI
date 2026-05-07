import os
import re
import json
import hashlib
import tempfile
from typing import Dict, Any, List

import cv2
import fitz  # PyMuPDF
import numpy as np
import pdfplumber
import pytesseract
from langdetect import detect, LangDetectException

# Optional advanced table extraction
try:
    import camelot
    CAMELOT_AVAILABLE = True
except Exception:
    CAMELOT_AVAILABLE = False


# =========================
# CONFIG
# =========================

OCR_LANG = "eng+hin"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "cache"))
MAX_THREADS = 4  # kept for compatibility, currently unused

os.makedirs(CACHE_DIR, exist_ok=True)

# ── Auto-detect Tesseract on Windows ──────────────────────────────────────
if os.name == "nt":
    _win_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Users\Public\Tesseract-OCR\tesseract.exe",
    ]
    for _tp in _win_paths:
        if os.path.isfile(_tp):
            pytesseract.pytesseract.tesseract_cmd = _tp
            break


# =========================
# UTILS
# =========================

def generate_md5(file_bytes: bytes) -> str:
    return hashlib.md5(file_bytes).hexdigest()


def safe_detect_language(text: str) -> str:
    try:
        if len(text.strip()) < 10:
            return "unknown"
        return detect(text)
    except LangDetectException:
        return "unknown"


def calculate_text_quality(text: str) -> float:
    """
    Measures how readable extracted text is.
    """

    if not text:
        return 0.0

    alpha = sum(c.isalpha() for c in text)
    total = len(text)

    return alpha / max(total, 1)


def get_adaptive_dpi(page_count: int) -> int:
    if page_count > 100:
        return 150
    elif page_count > 50:
        return 200
    return 300


# =========================
# IMAGE PREPROCESSING
# =========================

def deskew_image(image: np.ndarray) -> np.ndarray:
    coords = np.column_stack(np.where(image > 0))

    if len(coords) == 0:
        return image

    angle = cv2.minAreaRect(coords)[-1]

    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    # Avoid false aggressive rotations
    if abs(angle) > 15:
        return image

    (h, w) = image.shape[:2]

    center = (w // 2, h // 2)

    M = cv2.getRotationMatrix2D(center, angle, 1.0)

    rotated = cv2.warpAffine(
        image,
        M,
        (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE
    )

    return rotated


def preprocess_image(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    denoised = cv2.fastNlMeansDenoising(
        gray,
        None,
        10,
        7,
        21
    )

    inverted = cv2.bitwise_not(denoised)

    thresh = cv2.adaptiveThreshold(
        inverted,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        2
    )

    deskewed = deskew_image(thresh)

    final_img = cv2.bitwise_not(deskewed)

    return final_img


def get_psm(image: np.ndarray) -> int:
    h, w = image.shape[:2]

    if w > h * 1.5:
        return 6

    return 4


# =========================
# OCR
# =========================

def perform_ocr(image: np.ndarray) -> Dict[str, Any]:
    psm = get_psm(image)

    custom_config = (
        f'--psm {psm} --oem 3 -l {OCR_LANG}'
    )

    text = pytesseract.image_to_string(
        image,
        config=custom_config
    )

    data = pytesseract.image_to_data(
        image,
        output_type=pytesseract.Output.DICT,
        config=custom_config
    )

    confidences = []

    for conf in data["conf"]:
        try:
            conf_val = float(conf)

            if conf_val >= 0:
                confidences.append(conf_val)

        except:
            continue

    ocr_confidence = (
        sum(confidences) / len(confidences)
        if confidences else 0
    ) / 100

    return {
        "text": text,
        "ocr_confidence": round(ocr_confidence, 3)
    }


def process_scanned_image(image_bytes: bytes) -> Dict[str, Any]:
    np_arr = np.frombuffer(image_bytes, np.uint8)

    image = cv2.imdecode(
        np_arr,
        cv2.IMREAD_COLOR
    )

    if image is None:
        return {
            "text": "",
            "ocr_confidence": 0.0
        }

    processed_img = preprocess_image(image)

    return perform_ocr(processed_img)


# =========================
# PAGE CLASSIFICATION
# =========================

def is_scanned_page(
    page,
    extracted_text: str
) -> bool:

    image_count = len(page.images)

    text_density = len(extracted_text.strip())

    quality = calculate_text_quality(
        extracted_text
    )

    if text_density < 30:
        return True

    if quality < 0.3:
        return True

    if image_count > 0 and text_density < 100:
        return True

    return False


# =========================
# TABLE EXTRACTION
# =========================

def extract_tables_with_camelot(
    file_path: str,
    page_num: int
) -> List:

    if not CAMELOT_AVAILABLE:
        return []

    try:
        tables = camelot.read_pdf(
            file_path,
            pages=str(page_num),
            flavor="stream"
        )

        return [
            table.df.values.tolist()
            for table in tables
        ]

    except Exception:
        return []


# =========================
# PAGE PROCESSOR
# =========================

def is_text_garbled(text: str) -> bool:
    """
    Detect if extracted text is garbled/corrupted
    by checking for common English words and
    readable character ratios.
    """
    if not text or len(text.strip()) < 20:
        return True

    # Check for common English words that should appear
    # in government tender/proposal documents
    common_words = [
        "the", "and", "for", "is", "in", "of", "to",
        "with", "that", "this", "from", "are", "was",
        "not", "all", "will", "have", "has", "been",
        "tender", "bid", "supply", "value", "date",
        "year", "crore", "lakh", "rupees",
    ]

    text_lower = text.lower()
    words_found = sum(
        1 for w in common_words
        if f" {w} " in f" {text_lower} "
    )

    # Check ratio of printable ASCII to total chars
    printable_ascii = sum(
        1 for c in text
        if 32 <= ord(c) <= 126
    )
    ascii_ratio = printable_ascii / max(len(text), 1)

    # Check for excessive control characters
    control_chars = sum(
        1 for c in text
        if ord(c) < 32 and c not in '\n\r\t'
    )
    control_ratio = control_chars / max(len(text), 1)

    # Text is garbled if:
    # - Very few common words found AND poor ASCII ratio
    # - OR excessive control characters
    if control_ratio > 0.05:
        return True

    if words_found < 2 and ascii_ratio < 0.85:
        return True

    return False


def process_page(
    page_index: int,
    page,
    fitz_doc,
    file_path: str,
    total_pages: int
) -> Dict[str, Any]:

    # ==============================
    # Strategy 1: pdfplumber
    # ==============================
    text = page.extract_text(
        x_tolerance=3,
        y_tolerance=3
    ) or ""

    tables = page.extract_tables() or []

    page_type = "DIGITAL"
    ocr_confidence = 1.0

    # ==============================
    # Strategy 2: PyMuPDF fallback
    # if pdfplumber text is garbled
    # ==============================
    if is_text_garbled(text):
        fitz_page = fitz_doc[page_index]
        fitz_text = fitz_page.get_text("text") or ""

        if not is_text_garbled(fitz_text):
            # PyMuPDF extracted clean text
            text = fitz_text
            page_type = "DIGITAL"
            ocr_confidence = 0.95
        else:
            # ==============================
            # Strategy 3: OCR fallback
            # ==============================
            page_type = "SCANNED"
            dpi = get_adaptive_dpi(total_pages)
            pix = fitz_page.get_pixmap(dpi=dpi)
            img_bytes = pix.tobytes("png")

            ocr_result = process_scanned_image(img_bytes)
            text = ocr_result["text"]
            ocr_confidence = ocr_result["ocr_confidence"]

    elif is_scanned_page(page, text):
        # Original scanned page path
        page_type = "SCANNED"
        dpi = get_adaptive_dpi(total_pages)

        fitz_page = fitz_doc[page_index]
        pix = fitz_page.get_pixmap(dpi=dpi)
        img_bytes = pix.tobytes("png")

        ocr_result = process_scanned_image(img_bytes)
        text = ocr_result["text"]
        ocr_confidence = ocr_result["ocr_confidence"]

    # Better table extraction fallback
    if not tables:
        tables = extract_tables_with_camelot(
            file_path,
            page_index + 1
        )

    language = safe_detect_language(text)

    page_hash = hashlib.md5(
        text.encode(errors="ignore")
    ).hexdigest()

    return {
        "page_number": page_index + 1,
        "page_type": page_type,
        "language": language,
        "ocr_confidence": ocr_confidence,
        "page_hash": page_hash,
        "text_quality": round(
            calculate_text_quality(text),
            3
        ),
        "text": text,
        "tables": tables
    }


# =========================
# MAIN PDF PROCESSOR
# =========================

def process_pdf(
    file_path: str,
    file_bytes: bytes,
    filename: str
) -> Dict[str, Any]:

    file_hash = generate_md5(file_bytes)

    # ======================
    # CACHE CHECK
    # ======================

    cache_path = os.path.join(
        CACHE_DIR,
        f"{file_hash}.json"
    )

    if os.path.exists(cache_path):

        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    try:

        with pdfplumber.open(file_path) as pdf:

            fitz_doc = fitz.open(file_path)
            try:
                metadata = fitz_doc.metadata
                total_pages = len(pdf.pages)
                pages_output = []
                scanned_pages = 0

                for i, page in enumerate(pdf.pages):
                    page_result = process_page(
                        i,
                        page,
                        fitz_doc,
                        file_path,
                        total_pages
                    )

                    if (
                        page_result["page_type"]
                        == "SCANNED"
                    ):
                        scanned_pages += 1

                    pages_output.append(page_result)

                pages_output.sort(
                    key=lambda x: x["page_number"]
                )

                # Determine document type

                if scanned_pages == 0:
                    doc_type = "DIGITAL"

                elif scanned_pages == total_pages:
                    doc_type = "SCANNED"

                else:
                    doc_type = "HYBRID"

                result = {
                    "status": "SUCCESS",

                    "document_type": doc_type,

                    "hash": file_hash,

                    "metadata": {
                        "filename": filename,
                        "size_bytes": len(file_bytes),
                        "page_count": total_pages,
                        "author": metadata.get("author"),
                        "creator": metadata.get("creator"),
                        "producer": metadata.get("producer"),
                        "creation_date": metadata.get("creationDate"),
                        "modification_date": metadata.get("modDate"),
                    },

                    "statistics": {
                        "scanned_pages": scanned_pages,
                        "digital_pages":
                            total_pages - scanned_pages
                    },

                    "pages": pages_output
                }

                # Save cache
                with open(
                    cache_path,
                    "w",
                    encoding="utf-8"
                ) as f:

                    json.dump(
                        result,
                        f,
                        ensure_ascii=False,
                        indent=2
                    )

                return result

            finally:
                fitz_doc.close()

    except Exception as e:

        return {
            "status": "FAILED",
            "error": str(e),
            "filename": filename
        }


# =========================
# PDF BYTES PROCESSOR
# =========================

def process_pdf_bytes(
    file_bytes: bytes,
    filename: str
) -> Dict[str, Any]:

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf"
    ) as temp_pdf:

        temp_pdf.write(file_bytes)

        temp_path = temp_pdf.name

    try:

        result = process_pdf(
            temp_path,
            file_bytes,
            filename
        )

    finally:

        os.remove(temp_path)

    return result


# =========================
# DUMMY PDF GENERATOR
# =========================

def generate_dummy_pdfs(output_dir: str):

    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    os.makedirs(output_dir, exist_ok=True)

    # Tender PDF
    tender_path = os.path.join(
        output_dir,
        "dummy_tender.pdf"
    )

    c = canvas.Canvas(
        tender_path,
        pagesize=letter
    )

    c.drawString(
        100,
        750,
        "CRPF Procurement Tender Document"
    )

    c.drawString(
        100,
        730,
        "Eligibility Conditions:"
    )

    c.drawString(
        100,
        710,
        "1. Minimum Turnover: Rs. 2 Crore per annum."
    )

    c.drawString(
        100,
        690,
        "2. Minimum Experience: 5 years in similar projects."
    )

    c.drawString(
        100,
        670,
        "3. EMD Value: 5,00,000 INR."
    )

    c.drawString(
        100,
        650,
        "4. Valid ISO Certification: ISO 9001:2015."
    )

    c.drawString(
        100,
        630,
        "5. Registered GSTIN and MSME (UDYAM)."
    )

    c.save()

    # Bidder PDFs
    bidders_info = [
        {
            "name": "Bidder_A",
            "turnover": "₹2.5 Cr",
            "exp": "Established 2015",
            "emd": "500000",
            "iso": "ISO 9001:2015",
            "msme": "UDYAM-MH-00-1234567"
        },

        {
            "name": "Bidder_B",
            "turnover": "1,50,00,000",
            "exp": "Established 2020",
            "emd": "500000",
            "iso": "ISO 9001:2015",
            "msme": "UDYAM-DL-00-7654321"
        },

        {
            "name": "Bidder_C",
            "turnover": "3 Crore",
            "exp": "Established 2010",
            "emd": "500000",
            "iso": "ISO 9001:2015",
            "msme": "UDYAM-MH-00-1234567"
        },

        {
            "name": "Bidder_D",
            "turnover": "Rs. 2 Crore",
            "exp": "Established 2018",
            "emd": "400000",
            "iso": "ISO 14001:2015",
            "msme": "UDYAM-KA-00-9999999"
        },
    ]

    for bidder in bidders_info:

        path = os.path.join(
            output_dir,
            f"{bidder['name']}.pdf"
        )

        c = canvas.Canvas(
            path,
            pagesize=letter
        )

        c.drawString(
            100,
            750,
            f"Bid Proposal: {bidder['name']}"
        )

        c.drawString(
            100,
            730,
            f"Annual Turnover: {bidder['turnover']}"
        )

        c.drawString(
            100,
            710,
            f"Company History: {bidder['exp']}"
        )

        c.drawString(
            100,
            690,
            f"EMD Paid: INR {bidder['emd']}"
        )

        c.drawString(
            100,
            670,
            f"Certifications: {bidder['iso']}"
        )

        c.drawString(
            100,
            650,
            f"Registration: {bidder['msme']}"
        )

        c.save()


# =========================
# MAIN
# =========================

if __name__ == "__main__":

    generate_dummy_pdfs("dummy_data")

    print("Dummy PDFs generated.")

    sample_path = "dummy_data/dummy_tender.pdf"

    with open(sample_path, "rb") as f:

        file_bytes = f.read()

    result = process_pdf_bytes(
        file_bytes,
        "dummy_tender.pdf"
    )

    print(json.dumps(
        result,
        indent=2,
        ensure_ascii=False
    )) 
