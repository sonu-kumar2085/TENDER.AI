import re
import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

from groq import Groq

# =========================================================
# LOGGING
# =========================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)

# =========================================================
# GROQ CLIENT
# =========================================================

groq_client = Groq(
    api_key=os.getenv("GROQ_API_KEY", "")
)

# =========================================================
# REGEX PATTERNS
# =========================================================

PATTERNS = {
    "iso": r"ISO[\s\-:]*(9001|14001|27001|13485|22000|45001|22301)(?::\d{4})?",

    "gstin": r"\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b",

    "msme": r"\bUDYAM-[A-Z]{2}-\d{2}-\d{7}\b",

    "pan": r"\b[A-Z]{5}\d{4}[A-Z]\b",

    "currency_amount": (
        r"(?:Rs\.?|INR|₹)\s*"
        r"([\d,]+(?:\.\d+)?)\s*/?-?\s*"
        r"(Crore|Cr|Lakhs?|Lakh)?"
    ),

    "emd": (
        r"(?:EMD|Earnest\s+Money\s+Deposit)"
        r".{0,80}?"
        r"(?:Rs\.?|INR|₹)\s*"
        r"([\d,]+(?:\.\d+)?)\s*/?-?\s*"
        r"(Crore|Cr|Lakhs?|Lakh)?"
    ),

    "turnover": (
        r"(?:annual\s+turnover|average\s+turnover|turnover)"
        r".{0,80}?"
        r"(?:Rs\.?|INR|₹)\s*"
        r"([\d,]+(?:\.\d+)?)\s*/?-?\s*"
        r"(Crore|Cr|Lakhs?|Lakh)?"
    ),

    "experience": (
        r"(?:minimum\s+)?(\d+)\+?\s+years?"
    ),

    "year_established": (
        r"(?:established|incorporated|founded|since|from)\s+(?:in\s+)?(\d{4})"
    ),

    "blacklisting": (
        r"(?:not\s+(?:been?\s+)?blacklisted|non[- ]?blacklist|no\s+blacklist|"
        r"never\s+(?:been?\s+)?blacklisted|not\s+debarred|"
        r"self[- ]?declaration|not\s+banned)"
    ),

    "compliance": (
        r"(?:complied|confirmed|enclosed|attached|submitted|provided|met|fulfilled)"
    ),
}

# =========================================================
# HELPERS
# =========================================================

def clean_text_lines(text: str) -> str:
    """
    Preserves line structure for TenderExtractor.
    """
    if not text:
        return ""

    lines = text.split("\n")
    cleaned = []
    for line in lines:
        line = re.sub(r"\s+", " ", line).strip()
        line = line.replace("lSO", "ISO")
        line = line.replace("1SO", "ISO")
        line = line.replace("GSTlN", "GSTIN")
        if line:
            cleaned.append(line)
    return "\n".join(cleaned)


def clean_text_flat(text: str) -> str:
    """
    Flattens text for BidderExtractor regex search.
    """
    if not text:
        return ""

    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    text = text.replace("lSO", "ISO")
    text = text.replace("1SO", "ISO")
    text = text.replace("GSTlN", "GSTIN")
    return text.strip()


def parse_currency(value_str: str, unit_str: Optional[str]) -> float:
    """
    Converts Indian currency text into numeric INR value.
    """
    if not value_str:
        return 0.0

    try:
        value = float(value_str.replace(",", ""))
    except Exception:
        return 0.0

    unit = (unit_str or "").lower()

    if "crore" in unit or "cr" in unit:
        value *= 10000000
    elif "lakh" in unit:
        value *= 100000

    return round(value, 2)


def extract_any_currency(text: str) -> Optional[float]:
    """
    Extract any currency value from a text line.
    """
    match = re.search(PATTERNS["currency_amount"], text, re.IGNORECASE)
    if match:
        return parse_currency(match.group(1), match.group(2))
    return None


def safe_json_loads(content: str) -> Dict[str, Any]:
    """
    Safely parse malformed LLM JSON responses.
    """
    if not content:
        return {}

    content = content.strip()
    content = content.replace("```json", "")
    content = content.replace("```", "")

    try:
        return json.loads(content)
    except Exception:
        try:
            match = re.search(r"\{.*\}", content, re.DOTALL)
            if match:
                return json.loads(match.group(0))
        except Exception:
            pass
    return {}


def build_condition(
    condition_id: str,
    field: str,
    operator: str,
    value: Any,
    unit: str,
    source_clause: str,
    confidence: float
) -> Dict[str, Any]:

    return {
        "condition_id": condition_id,
        "field": field,
        "operator": operator,
        "value": value,
        "unit": unit,
        "mandatory": True,
        "source_clause": source_clause,
        "confidence": round(confidence, 2)
    }


def split_into_clauses(text: str) -> List[str]:
    """
    Splits tender text into individual clauses/lines.
    Uses newlines and bullet markers, NOT periods.
    """
    lines = re.split(
        r'\n|(?:^|\s)[•·▪►■●]\s*|(?:^|\s)\d+[.)]\s+',
        text,
        flags=re.MULTILINE
    )

    result = []
    for line in lines:
        line = line.strip()
        if len(line) > 5:
            result.append(line)
    return result


# =========================================================
# GROQ FALLBACK
# =========================================================

def call_groq_fallback(text: str, role: str) -> Dict[str, Any]:

    if not text.strip():
        return {}

    if not os.getenv("GROQ_API_KEY"):
        return {}

    try:
        completion = groq_client.chat.completions.create(
            model="llama3-70b-8192",
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a tender extraction engine. "
                        "Return ONLY valid JSON."
                    )
                },
                {
                    "role": "user",
                    "content": (
                        f"Extract structured {role} data from:\n{text}"
                    )
                }
            ]
        )

        content = completion.choices[0].message.content
        return safe_json_loads(content)

    except Exception as e:
        logger.error(f"[Groq Error] {e}")
        return {}


# =========================================================
# TENDER EXTRACTOR
# =========================================================

class TenderExtractor:

    def __init__(self):
        self.condition_id_counter = 1

    def next_condition_id(self) -> str:
        cid = f"C{self.condition_id_counter}"
        self.condition_id_counter += 1
        return cid

    def extract_conditions(self, text: str) -> List[Dict[str, Any]]:

        text = clean_text_lines(text)

        conditions = []
        seen = set()

        lines = split_into_clauses(text)

        logger.info(f"[TenderExtractor] Processing {len(lines)} clauses")

        for raw_line in lines:

            line = raw_line.strip()

            if not line:
                continue

            line_lower = line.lower()
            condition = None

            # -------------------------------------------------
            # TURNOVER
            # -------------------------------------------------
            if "turnover" in line_lower:
                currency_val = extract_any_currency(line)
                if currency_val and currency_val > 0:
                    condition = build_condition(
                        self.next_condition_id(),
                        "turnover",
                        "greater_than_or_equal",
                        currency_val,
                        "INR",
                        line,
                        0.95
                    )

            # -------------------------------------------------
            # EMD
            # -------------------------------------------------
            elif re.search(r"\bemd\b|earnest\s+money", line_lower):
                currency_val = extract_any_currency(line)
                if currency_val and currency_val > 0:
                    condition = build_condition(
                        self.next_condition_id(),
                        "emd",
                        "greater_than_or_equal",
                        currency_val,
                        "INR",
                        line,
                        0.94
                    )

            # -------------------------------------------------
            # EXPERIENCE
            # -------------------------------------------------
            elif "experience" in line_lower or "year" in line_lower:
                exp_match = re.search(
                    PATTERNS["experience"],
                    line,
                    re.IGNORECASE
                )
                if exp_match:
                    condition = build_condition(
                        self.next_condition_id(),
                        "experience_years",
                        "greater_than_or_equal",
                        int(exp_match.group(1)),
                        "years",
                        line,
                        0.90
                    )

            # -------------------------------------------------
            # ISO / CERTIFICATION
            # -------------------------------------------------
            elif "iso" in line_lower or "certification" in line_lower:
                iso_match = re.search(
                    PATTERNS["iso"],
                    line,
                    re.IGNORECASE
                )
                if iso_match:
                    condition = build_condition(
                        self.next_condition_id(),
                        "iso_certification",
                        "string_contains",
                        iso_match.group(0),
                        "text",
                        line,
                        0.92
                    )

            # -------------------------------------------------
            # BLACKLISTING
            # -------------------------------------------------
            elif "blacklist" in line_lower or "debar" in line_lower:
                condition = build_condition(
                    self.next_condition_id(),
                    "not_blacklisted",
                    "equals",
                    True,
                    "boolean",
                    line,
                    0.90
                )

            # -------------------------------------------------
            # MSME / UDYAM
            # -------------------------------------------------
            elif "udyam" in line_lower or "msme" in line_lower:
                condition = build_condition(
                    self.next_condition_id(),
                    "msme_registration",
                    "present",
                    True,
                    "boolean",
                    line,
                    0.88
                )

            # -------------------------------------------------
            # LLM FALLBACK for mandatory language
            # -------------------------------------------------
            elif any(
                keyword in line_lower
                for keyword in [
                    "must", "shall", "required",
                    "minimum", "mandatory"
                ]
            ):
                llm_data = call_groq_fallback(
                    line, "tender eligibility condition"
                )
                if llm_data.get("field"):
                    llm_data.update({
                        "condition_id": self.next_condition_id(),
                        "mandatory": True,
                        "source_clause": line,
                        "confidence": 0.70
                    })
                    condition = llm_data

            # -------------------------------------------------
            # DUPLICATE FILTER
            # -------------------------------------------------
            if condition:
                unique_key = (
                    condition.get("field"),
                    str(condition.get("value"))
                )
                if unique_key not in seen:
                    seen.add(unique_key)
                    conditions.append(condition)
                    logger.info(
                        f"[TenderExtractor] Condition: "
                        f"{condition['field']}={condition['value']}"
                    )

        logger.info(
            f"[TenderExtractor] Total conditions extracted: "
            f"{len(conditions)}"
        )
        return conditions


# =========================================================
# BIDDER EXTRACTOR
# =========================================================

class BidderExtractor:

    def extract_claims(self, text: str) -> Dict[str, Any]:

        flat_text = clean_text_flat(text)
        line_text = clean_text_lines(text)

        claims = {}

        # -------------------------------------------------
        # TURNOVER
        # -------------------------------------------------
        turnover_matches = re.findall(
            PATTERNS["turnover"],
            flat_text,
            re.IGNORECASE
        )

        if turnover_matches:
            values = [
                parse_currency(v[0], v[1])
                for v in turnover_matches
            ]
            values = [v for v in values if v > 0]
            if values:
                claims["turnover"] = max(values)

        # Fallback: any currency near "turnover" keyword
        if "turnover" not in claims:
            turnover_context = re.search(
                r"turnover.{0,100}",
                flat_text,
                re.IGNORECASE
            )
            if turnover_context:
                val = extract_any_currency(turnover_context.group(0))
                if val and val > 0:
                    claims["turnover"] = val

        # -------------------------------------------------
        # EMD
        # -------------------------------------------------
        emd_match = re.search(
            PATTERNS["emd"],
            flat_text,
            re.IGNORECASE
        )

        if emd_match:
            claims["emd"] = parse_currency(
                emd_match.group(1),
                emd_match.group(2)
            )

        # -------------------------------------------------
        # ISO
        # -------------------------------------------------
        iso_match = re.search(
            PATTERNS["iso"],
            flat_text,
            re.IGNORECASE
        )

        if iso_match:
            claims["iso_certification"] = iso_match.group(0)

        # -------------------------------------------------
        # MSME
        # -------------------------------------------------
        msme_match = re.search(
            PATTERNS["msme"],
            flat_text
        )

        if msme_match:
            claims["msme_registration"] = msme_match.group(0)

        # -------------------------------------------------
        # EXPERIENCE (multiple strategies)
        # -------------------------------------------------

        # Strategy 1: "since YYYY" / "established YYYY" / "from YYYY"
        est_match = re.search(
            PATTERNS["year_established"],
            flat_text,
            re.IGNORECASE
        )
        if est_match:
            current_year = datetime.now().year
            year_val = int(est_match.group(1))
            if 1900 < year_val <= current_year:
                claims["experience_years"] = current_year - year_val

        # Strategy 2: Direct "X years" near experience keyword
        if "experience_years" not in claims:
            exp_context = re.search(
                r"experience.{0,60}?(\d+)\+?\s*years?",
                flat_text,
                re.IGNORECASE
            )
            if exp_context:
                claims["experience_years"] = int(exp_context.group(1))

        # Strategy 3: "X years" anywhere
        if "experience_years" not in claims:
            exp_match = re.search(
                PATTERNS["experience"],
                flat_text,
                re.IGNORECASE
            )
            if exp_match:
                claims["experience_years"] = int(exp_match.group(1))

        # -------------------------------------------------
        # BLACKLISTING
        # -------------------------------------------------
        blacklist_match = re.search(
            PATTERNS["blacklisting"],
            flat_text,
            re.IGNORECASE
        )

        if blacklist_match:
            claims["not_blacklisted"] = True

        # Compliance/Confirmed statement for blacklisting
        if "not_blacklisted" not in claims:
            if re.search(
                r"(?:blacklist|debar).{0,60}?"
                r"(?:complied|confirmed|no|not|never|self.?declaration)",
                flat_text,
                re.IGNORECASE
            ):
                claims["not_blacklisted"] = True

        # Also check "Non-Blacklisting" + "Confirmed"
        if "not_blacklisted" not in claims:
            if re.search(
                r"non.?blacklist.{0,60}?(?:confirm|complied|attach|declar)",
                flat_text,
                re.IGNORECASE
            ):
                claims["not_blacklisted"] = True

        # -------------------------------------------------
        # GSTIN
        # -------------------------------------------------
        gstin_match = re.search(
            PATTERNS["gstin"],
            flat_text
        )

        if gstin_match:
            claims["gstin"] = gstin_match.group(0)

        # -------------------------------------------------
        # PAN
        # -------------------------------------------------
        pan_match = re.search(
            PATTERNS["pan"],
            flat_text
        )

        if pan_match:
            claims["pan"] = pan_match.group(0)

        # -------------------------------------------------
        # COMPLIANCE DETECTION (catch-all)
        # -------------------------------------------------
        # For fields that say "Complied" without providing
        # a numeric value, try to infer from context.

        lines = line_text.split("\n")
        for line in lines:
            line_lower = line.lower()

            has_compliance = bool(re.search(
                PATTERNS["compliance"],
                line_lower
            ))

            if not has_compliance:
                continue

            # Turnover compliance
            if "turnover" in line_lower and "turnover" not in claims:
                val = extract_any_currency(line)
                if val and val > 0:
                    claims["turnover"] = val

            # ISO compliance
            if ("iso" in line_lower or "certification" in line_lower) \
                    and "iso_certification" not in claims:
                iso_m = re.search(PATTERNS["iso"], line, re.IGNORECASE)
                if iso_m:
                    claims["iso_certification"] = iso_m.group(0)

            # Experience compliance
            if "experience" in line_lower and "experience_years" not in claims:
                yr_m = re.search(r"since\s+(\d{4})", line, re.IGNORECASE)
                if yr_m:
                    claims["experience_years"] = (
                        datetime.now().year - int(yr_m.group(1))
                    )

            # Blacklisting compliance
            if "blacklist" in line_lower and "not_blacklisted" not in claims:
                claims["not_blacklisted"] = True

        logger.info(f"[BidderExtractor] Extracted claims: {claims}")
        return claims
