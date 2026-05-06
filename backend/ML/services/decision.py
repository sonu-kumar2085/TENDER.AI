from typing import Dict, Any, List, Optional
from datetime import datetime
from statistics import mean
import re


class ValueNormalizer:
    """
    Converts raw extracted values into deterministic comparable forms.
    """

    @staticmethod
    def normalize_currency(value: Any) -> Optional[float]:
        if value is None:
            return None

        if isinstance(value, (int, float)):
            return float(value)

        text = str(value).lower().replace(",", "").strip()

        try:
            # Crore handling
            if "cr" in text or "crore" in text:
                num = float(re.findall(r"[\d.]+", text)[0])
                return num * 10000000

            # Lakh handling
            if "lakh" in text or "lac" in text:
                num = float(re.findall(r"[\d.]+", text)[0])
                return num * 100000

            # Default numeric extraction
            num = float(re.findall(r"[\d.]+", text)[0])
            return num

        except Exception:
            return None

    @staticmethod
    def normalize_string(value: Any) -> str:
        if value is None:
            return ""

        return str(value).strip().lower()

    @staticmethod
    def normalize_date(value: Any) -> Optional[datetime]:
        if value is None:
            return None

        formats = [
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%Y-%m-%d",
            "%d %B %Y",
            "%d %b %Y"
        ]

        for fmt in formats:
            try:
                return datetime.strptime(str(value).strip(), fmt)
            except Exception:
                continue

        return None


class DeterministicRulesEngine:

    @staticmethod
    def evaluate(operator: str, expected: Any, actual: Any) -> Dict[str, Any]:

        result = {
            "passed": False,
            "reason": "",
            "operator": operator,
            "expected": expected,
            "actual": actual
        }

        if actual is None:
            result["reason"] = "Actual value missing"
            return result

        # Handle list values - pick the best one
        if isinstance(actual, list):
            if not actual:
                result["reason"] = "Empty list value"
                return result
            if operator in ("greater_than_or_equal", "less_than_or_equal"):
                # For numeric comparisons, try to pick max
                numeric_vals = []
                for v in actual:
                    n = ValueNormalizer.normalize_currency(v)
                    if n is not None:
                        numeric_vals.append(n)
                if numeric_vals:
                    actual = max(numeric_vals)
                else:
                    actual = actual[0]
            else:
                actual = actual[0]

        # Handle boolean expected values with boolean actual
        if isinstance(expected, bool) and operator == "equals":
            if isinstance(actual, bool):
                result["passed"] = actual == expected
            else:
                # Treat truthy string values as True
                actual_lower = str(actual).strip().lower()
                truthy = actual_lower in (
                    "true", "yes", "1", "confirmed",
                    "complied", "submitted", "provided"
                )
                result["passed"] = truthy == expected
            result["reason"] = (
                "Condition met"
                if result["passed"]
                else "Condition not met"
            )
            return result


        try:

            # =========================
            # NUMERIC COMPARISONS
            # =========================

            if operator == "greater_than_or_equal":

                actual_num = ValueNormalizer.normalize_currency(actual)
                expected_num = ValueNormalizer.normalize_currency(expected)

                if actual_num is None or expected_num is None:
                    result["reason"] = "Numeric normalization failed"
                    return result

                result["passed"] = actual_num >= expected_num

                result["reason"] = (
                    f"{actual_num} >= {expected_num}"
                    if result["passed"]
                    else f"{actual_num} < {expected_num}"
                )

            elif operator == "less_than_or_equal":

                actual_num = ValueNormalizer.normalize_currency(actual)
                expected_num = ValueNormalizer.normalize_currency(expected)

                if actual_num is None or expected_num is None:
                    result["reason"] = "Numeric normalization failed"
                    return result

                result["passed"] = actual_num <= expected_num

                result["reason"] = (
                    f"{actual_num} <= {expected_num}"
                    if result["passed"]
                    else f"{actual_num} > {expected_num}"
                )

            # =========================
            # EQUALITY
            # =========================

            elif operator == "equals":

                actual_str = ValueNormalizer.normalize_string(actual)
                expected_str = ValueNormalizer.normalize_string(expected)

                result["passed"] = actual_str == expected_str

                result["reason"] = (
                    "Values matched"
                    if result["passed"]
                    else "Values did not match"
                )

            # =========================
            # STRING CONTAINS
            # =========================

            elif operator == "string_contains":

                actual_str = ValueNormalizer.normalize_string(actual)
                expected_str = ValueNormalizer.normalize_string(expected)

                result["passed"] = expected_str in actual_str

                result["reason"] = (
                    "Expected text found"
                    if result["passed"]
                    else "Expected text missing"
                )

            # =========================
            # PRESENCE CHECK
            # =========================

            elif operator == "present":

                result["passed"] = bool(actual)

                result["reason"] = (
                    "Value present"
                    if result["passed"]
                    else "Value missing"
                )

            # =========================
            # DATE AFTER
            # =========================

            elif operator == "date_after":

                actual_date = ValueNormalizer.normalize_date(actual)
                expected_date = ValueNormalizer.normalize_date(expected)

                if not actual_date or not expected_date:
                    result["reason"] = "Date normalization failed"
                    return result

                result["passed"] = actual_date >= expected_date

                result["reason"] = (
                    "Date valid"
                    if result["passed"]
                    else "Date expired"
                )

            else:
                result["reason"] = f"Unsupported operator: {operator}"

        except Exception as e:
            result["reason"] = f"Evaluation error: {str(e)}"

        return result


class DecisionEngine:

    @staticmethod
    def run_decision_stack(
        tender_conditions: List[Dict[str, Any]],
        evidence_nodes: List[Dict[str, Any]],
        ambiguity_data: Dict[str, Any],
        human_override: Optional[str] = None
    ) -> Dict[str, Any]:

        evaluated_nodes = []

        mandatory_failed = False

        confidence_scores = []

        evidence_lookup = {
            node.get("condition_id"): node
            for node in evidence_nodes
        }

        for condition in tender_conditions:

            condition_id = condition.get("condition_id")

            evidence_node = evidence_lookup.get(condition_id, {})

            expected = condition.get("value")
            actual = evidence_node.get("extracted_value")
            operator = condition.get("operator")

            evaluation = DeterministicRulesEngine.evaluate(
                operator=operator,
                expected=expected,
                actual=actual
            )

            confidence = float(evidence_node.get("confidence", 0.5))

            confidence_scores.append(confidence)

            is_pass = evaluation["passed"]

            if condition.get("mandatory", True) and not is_pass:
                mandatory_failed = True

            evaluated_node = {
                **evidence_node,
                "condition_id": condition_id,
                "expected_value": expected,
                "actual_value": actual,
                "operator": operator,
                "mandatory": condition.get("mandatory", True),
                "evaluation_reason": evaluation["reason"],
                "passed": is_pass,
                "verdict": (
                    "ELIGIBLE"
                    if is_pass
                    else "NOT_ELIGIBLE"
                )
            }

            evaluated_nodes.append(evaluated_node)

        overall_confidence = (
            round(mean(confidence_scores), 4)
            if confidence_scores
            else 0.0
        )

        ambiguity_score = float(
            ambiguity_data.get("score", 0.0)
        )

        rules_verdict = (
            "NOT_ELIGIBLE"
            if mandatory_failed
            else "ELIGIBLE"
        )

        # =========================================
        # FINAL DECISION LOGIC
        # =========================================

        final_state = "NEEDS_REVIEW"

        if human_override:
            final_state = human_override

        else:

            if (
                rules_verdict == "ELIGIBLE"
                and overall_confidence >= 0.85
                and ambiguity_score < 0.33
            ):
                final_state = "AUTO_APPROVE"

            elif (
                rules_verdict == "NOT_ELIGIBLE"
                and overall_confidence >= 0.85
                and ambiguity_score < 0.33
            ):
                final_state = "AUTO_REJECT"

            else:
                final_state = "NEEDS_REVIEW"

        return {
            "rules_verdict": rules_verdict,
            "overall_confidence": overall_confidence,
            "ambiguity_score": ambiguity_score,
            "final_state": final_state,
            "evaluated_nodes": evaluated_nodes,
            "human_override": human_override,
            "decision_timestamp": datetime.utcnow().isoformat()
        }

    @staticmethod
    def generate_snapshot(
        bidder_id: str,
        tender_id: str,
        decision_result: Dict[str, Any],
        ambiguity_data: Dict[str, Any],
        summary_why: str,
        officer_id: Optional[str] = None
    ) -> Dict[str, Any]:

        return {

            "snapshot_version": "1.0",

            "bidder_id": bidder_id,
            "tender_id": tender_id,

            "timestamp": datetime.utcnow().isoformat(),

            "officer_id": officer_id,

            "rules_verdict":
                decision_result["rules_verdict"],

            "final_verdict":
                decision_result["final_state"],

            "evidence_confidence":
                decision_result["overall_confidence"],

            "ambiguity_score":
                ambiguity_data.get("score", 0.0),

            "human_readable_why":
                summary_why,

            "nodes":
                decision_result["evaluated_nodes"],

            "locked": False,

            "audit": {
                "generated_by": "TENDER.AI",
                "decision_engine_version": "v2",
                "utc_time": datetime.utcnow().isoformat()
            }
        }
