import re
import os
import json
from datetime import datetime
from groq import Groq
from typing import List, Dict, Any

# Ensure groq API key is present
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", "dummy"))

# Regex Patterns
PATTERNS = {
    "iso": r"ISO\s+\d{4}:\d{4}",
    "gstin": r"\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}",
    "msme": r"UDYAM-[A-Z]{2}-\d{2}-\d{7}",
    "pan": r"[A-Z]{5}\d{4}[A-Z]{1}",
    "turnover": r"(?:Rs\.?|INR|₹)?\s*([\d,\.]+)\s*(Crore|Cr|Lakh)?",
    "emd": r"(?:EMD|Earnest Money Deposit).*?(?:Rs\.?|INR|₹)?\s*([\d,\.]+)\s*(Crore|Cr|Lakh)?",
    "experience": r"(\d+)\s+years?"
}

def parse_currency(value_str: str, unit_str: str) -> float:
    if not value_str:
        return 0.0
    val = float(value_str.replace(",", ""))
    unit = (unit_str or "").lower()
    if "cr" in unit or "crore" in unit:
        val *= 10000000
    elif "lakh" in unit:
        val *= 100000
    return val

def call_groq_fallback(text: str, role: str) -> dict:
    if not text.strip():
        return {}
    if groq_client.api_key == "dummy":
        # Return mock to avoid crash during hackathon if no key provided
        return {"field": "unknown", "value": "unknown"}
    try:
        completion = groq_client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": "You are an extraction assistant. Return ONLY valid JSON, no explanation, no markdown backticks."},
                {"role": "user", "content": f"Extract the {role} condition from: {text}"}
            ],
            temperature=0,
        )
        content = completion.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"Groq API Error: {e}")
        return {}

class TenderExtractor:
    def __init__(self):
        self.condition_id_counter = 1

    def extract_conditions(self, text: str) -> List[Dict[str, Any]]:
        conditions = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            condition = None
            
            # Turnover
            if "turnover" in line.lower():
                match = re.search(PATTERNS["turnover"], line, re.IGNORECASE)
                if match:
                    val = parse_currency(match.group(1), match.group(2))
                    condition = {"field": "turnover", "operator": "greater_than_or_equal", "value": val, "unit": "INR"}
            
            # EMD
            elif "emd" in line.lower() or "earnest" in line.lower():
                match = re.search(PATTERNS["emd"], line, re.IGNORECASE)
                if match:
                    val = parse_currency(match.group(1), match.group(2))
                    condition = {"field": "emd", "operator": "equals", "value": val, "unit": "INR"}
            
            # Experience
            elif "experience" in line.lower():
                match = re.search(PATTERNS["experience"], line, re.IGNORECASE)
                if match:
                    condition = {"field": "experience_years", "operator": "greater_than_or_equal", "value": int(match.group(1)), "unit": "years"}
            
            # ISO
            elif "iso" in line.lower():
                match = re.search(PATTERNS["iso"], line, re.IGNORECASE)
                if match:
                    condition = {"field": "iso_certification", "operator": "string_contains", "value": match.group(0), "unit": "text"}
            
            # MSME
            elif "msme" in line.lower() or "udyam" in line.lower():
                condition = {"field": "msme_registration", "operator": "present", "value": True, "unit": "bool"}
                
            if condition:
                condition.update({
                    "condition_id": f"C{self.condition_id_counter}",
                    "mandatory": True, # Assume mandatory by default
                    "source_clause": line,
                    "confidence": 0.9 # High for regex matches
                })
                conditions.append(condition)
                self.condition_id_counter += 1
            else:
                # Potential LLM Fallback if it seems like a requirement
                if any(kw in line.lower() for kw in ["must", "shall", "required", "minimum"]):
                    llm_data = call_groq_fallback(line, "tender eligibility")
                    if llm_data and "field" in llm_data:
                        llm_data.update({
                            "condition_id": f"C{self.condition_id_counter}",
                            "mandatory": True,
                            "source_clause": line,
                            "confidence": 0.7 # Lower confidence for LLM extraction
                        })
                        conditions.append(llm_data)
                        self.condition_id_counter += 1
                        
        return conditions

class BidderExtractor:
    def extract_claims(self, text: str) -> Dict[str, Any]:
        claims = {}
        
        # Turnover
        turnover_matches = re.findall(PATTERNS["turnover"], text, re.IGNORECASE)
        if turnover_matches:
            # Avg if multiple, else max
            vals = [parse_currency(m[0], m[1]) for m in turnover_matches if m[0]]
            if vals:
                claims["turnover"] = sum(vals) / len(vals)
        
        # EMD
        emd_matches = re.search(PATTERNS["emd"], text, re.IGNORECASE)
        if emd_matches:
            claims["emd"] = parse_currency(emd_matches.group(1), emd_matches.group(2))
        else:
            # broad search for isolated numbers near EMD
            pass # Simplified for hackathon
            
        # ISO
        iso_matches = re.search(PATTERNS["iso"], text, re.IGNORECASE)
        if iso_matches:
            claims["iso_certification"] = iso_matches.group(0)
            
        # MSME
        msme_matches = re.search(PATTERNS["msme"], text, re.IGNORECASE)
        if msme_matches:
            claims["msme_registration"] = msme_matches.group(0)
            
        # Experience / Established Year
        est_match = re.search(r"established\s+(\d{4})", text, re.IGNORECASE)
        if est_match:
            est_year = int(est_match.group(1))
            current_year = datetime.now().year
            claims["experience_years"] = current_year - est_year
            
        # GSTIN and PAN
        gstin_match = re.search(PATTERNS["gstin"], text)
        if gstin_match:
            claims["gstin"] = gstin_match.group(0)
            
        pan_match = re.search(PATTERNS["pan"], text)
        if pan_match:
            claims["pan"] = pan_match.group(0)
            
        return claims
