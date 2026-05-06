import os
import logging
from typing import Dict, Any, List, Optional
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

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

groq_client: Optional[Groq] = None

if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        logger.info("Groq client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Groq client: {e}")
else:
    logger.warning("GROQ_API_KEY not found. Running in fallback mode.")

# =========================================================
# LLM ROLE
# =========================================================

class LLMRole:

    @staticmethod
    def call_llm(system_prompt: str, user_prompt: str) -> str:
        """
        Safe wrapper around Groq API.
        Falls back gracefully if API fails.
        """

        if groq_client is None:
            return "LLM unavailable. Fallback reasoning applied."

        try:
            completion = groq_client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ],
                temperature=0,
                max_tokens=200
            )

            response = completion.choices[0].message.content

            if response:
                return response.strip()

            return "No response generated."

        except Exception as e:
            logger.error(f"LLM Error: {str(e)}")
            return "LLM reasoning failed. Using deterministic fallback."

    # -----------------------------------------------------

    @staticmethod
    def matcher(condition: Dict[str, Any], extracted_value: Any) -> str:
        """
        Generate factual relation between tender condition
        and extracted bidder evidence.
        """

        clause = condition.get("source_clause", "Unknown clause")

        if extracted_value is None:
            return "No supporting evidence found for this condition."

        sys_prompt = (
            "You are a procurement evaluation assistant.\n"
            "Explain ONLY how the extracted evidence relates "
            "to the tender condition.\n"
            "Do NOT give eligibility decisions.\n"
            "Keep response under 2 sentences."
        )

        user_prompt = (
            f"Tender Condition:\n{clause}\n\n"
            f"Extracted Evidence:\n{extracted_value}"
        )

        return LLMRole.call_llm(sys_prompt, user_prompt)

    # -----------------------------------------------------

    @staticmethod
    def explainer(evidence_nodes: List[Dict[str, Any]]) -> str:
        """
        Generate overall evaluation summary.
        """

        if not evidence_nodes:
            return "No evidence nodes were generated."

        sys_prompt = (
            "You are a procurement evaluation summarizer.\n"
            "Summarize findings in 3 concise sentences.\n"
            "Do NOT use the words eligible/ineligible.\n"
            "Mention missing evidence or conflicts if present."
        )

        user_prompt = f"Evidence Nodes:\n{evidence_nodes}"

        return LLMRole.call_llm(sys_prompt, user_prompt)

# =========================================================
# REASONING LAYER
# =========================================================

class ReasoningLayer:

    def __init__(self):
        pass

    # -----------------------------------------------------

    @staticmethod
    def detect_internal_conflict(value: Any) -> bool:
        """
        Detect conflicting extracted values.
        Example:
            ["1 Cr", "2 Cr"] -> conflict
        """

        if isinstance(value, list):

            cleaned = list(set([
                str(v).strip().lower()
                for v in value
                if v is not None
            ]))

            return len(cleaned) > 1

        return False

    # -----------------------------------------------------

    def build_evidence_graph(
        self,
        tender_conditions: List[Dict[str, Any]],
        bidder_claims: Dict[str, Any],
        ocr_confidence: float = 0.9
    ) -> Dict[str, Any]:

        evidence_nodes = []

        if not tender_conditions:
            return {
                "evidence_nodes": [],
                "summary": "No tender conditions provided."
            }

        for cond in tender_conditions:

            try:
                condition_id = cond.get("condition_id", "UNKNOWN")
                field = cond.get("field")

                if not field:
                    logger.warning(f"Missing field in condition: {cond}")
                    continue

                claim_val = bidder_claims.get(field)

                internal_conflict = self.detect_internal_conflict(claim_val)

                if isinstance(claim_val, list):
                    extracted_value = claim_val
                else:
                    extracted_value = claim_val

                reason = (
                    LLMRole.matcher(cond, extracted_value)
                    if extracted_value is not None
                    else "No evidence provided."
                )

                node = {
                    "condition_id": condition_id,
                    "claim_field": field,
                    "extracted_value": extracted_value,
                    "source_snippet": (
                        f"Extracted from bidder document "
                        f"for field '{field}'"
                    ),
                    "page_number": cond.get("page_number", 1),
                    "confidence": round(float(ocr_confidence), 3),
                    "internal_conflict": internal_conflict,
                    "reason": reason
                }

                evidence_nodes.append(node)

            except Exception as e:
                logger.error(
                    f"Error processing condition {cond}: {e}"
                )

        summary = LLMRole.explainer(evidence_nodes)

        return {
            "evidence_nodes": evidence_nodes,
            "summary": summary
        }

# =========================================================
# AMBIGUITY SCORE ENGINE
# =========================================================

class AmbiguityScoreEngine:

    @staticmethod
    def compute_score(
        ocr_confidence: float,
        internal_conflicts_ratio: float,
        language_vagueness: float = 0.1,
        llm_uncertainty: float = 0.1
    ) -> Dict[str, Any]:

        # -----------------------------
        # Clamp all values safely
        # -----------------------------

        ocr_confidence = max(0.0, min(1.0, ocr_confidence))
        internal_conflicts_ratio = max(
            0.0,
            min(1.0, internal_conflicts_ratio)
        )
        language_vagueness = max(
            0.0,
            min(1.0, language_vagueness)
        )
        llm_uncertainty = max(
            0.0,
            min(1.0, llm_uncertainty)
        )

        # -----------------------------
        # Weighted ambiguity score
        # -----------------------------

        score = (
            (1 - ocr_confidence) * 0.35 +
            internal_conflicts_ratio * 0.30 +
            language_vagueness * 0.20 +
            llm_uncertainty * 0.15
        )

        score = round(score, 3)

        # -----------------------------
        # Decision routing
        # -----------------------------

        if score <= 0.33:
            action = "AUTO_DECIDE"

        elif score <= 0.66:
            action = "SUGGEST_CLARIFICATION"

        else:
            action = "HUMAN_REVIEW"

        return {
            "score": score,
            "action": action,
            "breakdown": {
                "language_vagueness": language_vagueness,
                "ocr_penalty": round(1 - ocr_confidence, 3),
                "internal_conflicts_ratio": internal_conflicts_ratio,
                "llm_uncertainty": llm_uncertainty
            }
        }

# =========================================================
# TEST RUN
# =========================================================

if __name__ == "__main__":

    conditions = [
        {
            "condition_id": "C1",
            "field": "turnover",
            "source_clause": "Annual turnover must exceed 1 crore."
        },
        {
            "condition_id": "C2",
            "field": "iso_certificate",
            "source_clause": "Valid ISO certification required."
        }
    ]

    bidder_claims = {
        "turnover": ["1.2 Cr", "1.25 Cr"],
        "iso_certificate": "ISO 9001:2015"
    }

    reasoning = ReasoningLayer()

    graph = reasoning.build_evidence_graph(
        tender_conditions=conditions,
        bidder_claims=bidder_claims,
        ocr_confidence=0.87
    )

    ambiguity = AmbiguityScoreEngine.compute_score(
        ocr_confidence=0.87,
        internal_conflicts_ratio=0.2
    )

    print("\nEVIDENCE GRAPH:\n")
    print(graph)

    print("\nAMBIGUITY SCORE:\n")
    print(ambiguity)
