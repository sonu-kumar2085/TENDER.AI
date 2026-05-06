import os
from typing import Dict, Any, List
from groq import Groq

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", "dummy"))

class LLMRole:
    @staticmethod
    def call_llm(system_prompt: str, user_prompt: str) -> str:
        if groq_client.api_key == "dummy":
            return "Dummy LLM Response due to missing API key."
        try:
            completion = groq_client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0,
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            return f"LLM Error: {str(e)}"

    @staticmethod
    def matcher(condition: Dict[str, Any], extracted_value: Any) -> str:
        sys_prompt = "You are a factual Matcher. Given a condition and extracted evidence, return a ONE-sentence rationale explaining how the evidence relates to the condition. Do NOT make a pass/fail or eligibility judgement."
        user_prompt = f"Condition: {condition.get('source_clause', str(condition))}\nExtracted Evidence: {extracted_value}"
        return LLMRole.call_llm(sys_prompt, user_prompt)

    @staticmethod
    def explainer(evidence_nodes: List[Dict[str, Any]]) -> str:
        sys_prompt = "You are a factual Explainer. Given a list of evidence nodes, return a 3-sentence plain English summary of the evaluation. Do NOT use the words 'eligible' or 'not eligible'."
        user_prompt = f"Evidence Nodes: {evidence_nodes}"
        return LLMRole.call_llm(sys_prompt, user_prompt)

class ReasoningLayer:
    def __init__(self):
        pass
        
    def build_evidence_graph(self, tender_conditions: List[Dict[str, Any]], bidder_claims: Dict[str, Any], ocr_confidence: float = 0.9) -> Dict[str, Any]:
        evidence_nodes = []
        
        for cond in tender_conditions:
            field = cond["field"]
            claim_val = bidder_claims.get(field, None)
            
            # Simplified Conflict detection: if multiple values extracted in claim, but we only have 1 in our simplified extraction map.
            # Assuming no conflict for MVP unless explicitly provided.
            internal_conflict = False 
            
            node = {
                "condition_id": cond["condition_id"],
                "claim_field": field,
                "extracted_value": claim_val,
                "source_snippet": f"Found in bidder document for field {field}",
                "page_number": 1, # Mock for now
                "confidence": ocr_confidence,
                "internal_conflict": internal_conflict,
                # Reason populated by LLM
                "reason": LLMRole.matcher(cond, claim_val) if claim_val is not None else "No evidence provided."
            }
            evidence_nodes.append(node)
            
        summary = LLMRole.explainer(evidence_nodes)
            
        return {
            "evidence_nodes": evidence_nodes,
            "summary": summary
        }

class AmbiguityScoreEngine:
    @staticmethod
    def compute_score(ocr_confidence: float, internal_conflicts_ratio: float, language_vagueness: float = 0.1, llm_uncertainty: float = 0.1) -> Dict[str, Any]:
        # Score = (language_vagueness + (1 - ocr_confidence) + internal_conflicts_ratio + llm_uncertainty) / 4
        score = (language_vagueness + (1 - ocr_confidence) + internal_conflicts_ratio + llm_uncertainty) / 4.0
        
        if score <= 0.33:
            action = "AUTO_DECIDE"
        elif score <= 0.66:
            action = "SUGGEST_CLARIFICATION"
        else:
            action = "HUMAN_REVIEW"
            
        return {
            "score": round(score, 3),
            "action": action,
            "breakdown": {
                "language_vagueness": language_vagueness,
                "ocr_penalty": round(1 - ocr_confidence, 3),
                "internal_conflicts_ratio": internal_conflicts_ratio,
                "llm_uncertainty": llm_uncertainty
            }
        }
