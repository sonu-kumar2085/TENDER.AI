from typing import Dict, Any, List
from datetime import datetime

class DeterministicRulesEngine:
    @staticmethod
    def evaluate(operator: str, expected: Any, actual: Any) -> bool:
        if actual is None:
            return False
            
        try:
            if operator == "greater_than_or_equal":
                return float(actual) >= float(expected)
            elif operator == "equals":
                # Use string conversion for equality, but if both are floats, handle it
                if isinstance(expected, float) and isinstance(actual, float):
                    return abs(actual - expected) < 0.01
                return str(actual).strip().lower() == str(expected).strip().lower()
            elif operator == "present":
                return bool(actual)
            elif operator == "string_contains":
                return str(expected).strip().lower() in str(actual).strip().lower()
            else:
                return False
        except (ValueError, TypeError):
            return False

class DecisionEngine:
    @staticmethod
    def run_decision_stack(tender_conditions: List[Dict[str, Any]], evidence_nodes: List[Dict[str, Any]], ambiguity_data: Dict[str, Any]) -> Dict[str, Any]:
        
        all_eligible = True
        overall_confidence = 1.0
        
        # Merge nodes for evaluation
        evaluated_nodes = []
        
        for cond, node in zip(tender_conditions, evidence_nodes):
            expected = cond.get("value")
            actual = node.get("extracted_value")
            operator = cond.get("operator")
            
            is_pass = DeterministicRulesEngine.evaluate(operator, expected, actual)
            
            if cond.get("mandatory", True) and not is_pass:
                all_eligible = False
                
            node["verdict"] = "ELIGIBLE" if is_pass else "NOT_ELIGIBLE"
            evaluated_nodes.append(node)
            
            overall_confidence = min(overall_confidence, node.get("confidence", 1.0))
            
        rules_verdict = "ELIGIBLE" if all_eligible else "NOT_ELIGIBLE"
        ambiguity_score = ambiguity_data.get("score", 0)
        
        # CONFIDENCE STACK RULES
        final_state = "NEEDS_REVIEW"
        if rules_verdict == "ELIGIBLE" and overall_confidence > 0.85 and ambiguity_score < 0.33:
            final_state = "AUTO_APPROVE"
        elif rules_verdict == "ELIGIBLE" and (0.6 < overall_confidence <= 0.85 or 0.33 < ambiguity_score <= 0.66):
            final_state = "NEEDS_REVIEW"
        elif rules_verdict == "NOT_ELIGIBLE" and overall_confidence > 0.85:
            final_state = "AUTO_REJECT"
        elif rules_verdict == "NOT_ELIGIBLE" and overall_confidence <= 0.6:
            final_state = "NEEDS_REVIEW"
            
        return {
            "rules_verdict": rules_verdict,
            "overall_confidence": overall_confidence,
            "final_state": final_state,
            "evaluated_nodes": evaluated_nodes
        }

    @staticmethod
    def generate_snapshot(bidder_id: str, tender_id: str, decision_result: Dict[str, Any], ambiguity_data: Dict[str, Any], summary_why: str) -> Dict[str, Any]:
        return {
            "bidder_id": bidder_id,
            "tender_id": tender_id,
            "timestamp": datetime.utcnow().isoformat(),
            "evidence_confidence": decision_result["overall_confidence"],
            "ambiguity_score": ambiguity_data["score"],
            "final_verdict": decision_result["final_state"],
            "human_readable_why": summary_why,
            "nodes": decision_result["evaluated_nodes"],
            "locked": False # Must be locked by an officer later
        }
