import hashlib
import re
from typing import List, Dict, Any

import networkx as nx
import numpy as np
from scipy import stats


class FraudDetectionLayer:
    """
    Cross Bidder Fraud Detection Engine

    Detects:
    - Duplicate certificates
    - Suspiciously identical financials
    - Statistical outliers
    - Hidden bidder relationships
    """

    def __init__(self, bidders_data: List[Dict[str, Any]]):
        self.bidders_data = bidders_data or []

        self.flags = []

        self.risk_scores = {
            bidder.get("bidder_id", f"UNKNOWN_{i}"): {
                "score": "LOW",
                "risk_value": 0,
                "flags": [],
            }
            for i, bidder in enumerate(self.bidders_data)
        }

    # =========================================================
    # Utility Methods
    # =========================================================

    @staticmethod
    def _safe_float(value: Any) -> float:
        """
        Safely convert values like:
        Rs. 1,25,000
        INR 5 Cr
        12.5 lakh
        """
        if value is None:
            return 0.0

        if isinstance(value, (int, float)):
            return float(value)

        try:
            text = str(value).lower().strip()

            text = text.replace(",", "")
            text = text.replace("rs.", "")
            text = text.replace("inr", "")
            text = text.strip()

            multiplier = 1

            if "cr" in text or "crore" in text:
                multiplier = 10000000
                text = re.sub(r"(cr|crore)", "", text)

            elif "lakh" in text:
                multiplier = 100000
                text = re.sub(r"lakh", "", text)

            number = float(re.findall(r"[-+]?\d*\.?\d+", text)[0])

            return number * multiplier

        except Exception:
            return 0.0

    @staticmethod
    def _normalize_string(value: str) -> str:
        if not value:
            return ""

        return re.sub(r"[^A-Z0-9]", "", str(value).upper())

    def _add_flag(self, bidder_id: str, flag: Dict[str, Any]):
        """
        Prevent duplicate flags
        """

        existing_flags = self.risk_scores[bidder_id]["flags"]

        if flag not in existing_flags:
            existing_flags.append(flag)
            self.flags.append(flag)

    # =========================================================
    # 1. Duplicate Certificate Detection
    # =========================================================

    def detect_duplicate_certificates(self):

        cert_map = {}

        cert_fields = [
            "iso_certification",
            "msme_registration",
            "gstin",
            "pan",
        ]

        for bidder in self.bidders_data:

            bidder_id = bidder.get("bidder_id")
            claims = bidder.get("claims", {})

            for field in cert_fields:

                raw_cert = claims.get(field)

                if not raw_cert:
                    continue

                cert = self._normalize_string(raw_cert)

                hashed = hashlib.md5(cert.encode()).hexdigest()

                if hashed not in cert_map:
                    cert_map[hashed] = {
                        "certificate": cert,
                        "field": field,
                        "bidders": set(),
                    }

                cert_map[hashed]["bidders"].add(bidder_id)

        for _, data in cert_map.items():

            if len(data["bidders"]) > 1:

                flag = {
                    "type": "DUPLICATE_CERTIFICATE",
                    "certificate_type": data["field"],
                    "certificate_value": data["certificate"],
                    "bidders": list(data["bidders"]),
                    "risk": "HIGH",
                    "explanation": "Same certificate used across multiple bidders.",
                }

                for bidder_id in data["bidders"]:
                    self._add_flag(bidder_id, flag)

    # =========================================================
    # 2. Financial Similarity Detection
    # =========================================================

    def detect_identical_financials(self):

        vectors = {}

        for bidder in self.bidders_data:

            bidder_id = bidder.get("bidder_id")
            claims = bidder.get("claims", {})

            vector = np.array(
                [
                    self._safe_float(claims.get("turnover")),
                    self._safe_float(claims.get("emd")),
                    self._safe_float(claims.get("experience_years")),
                ],
                dtype=float,
            )

            vectors[bidder_id] = vector

        bidder_ids = list(vectors.keys())

        for i in range(len(bidder_ids)):

            for j in range(i + 1, len(bidder_ids)):

                id1 = bidder_ids[i]
                id2 = bidder_ids[j]

                v1 = vectors[id1]
                v2 = vectors[id2]

                if np.all(v1 == 0) or np.all(v2 == 0):
                    continue

                norm1 = np.linalg.norm(v1)
                norm2 = np.linalg.norm(v2)

                if norm1 == 0 or norm2 == 0:
                    continue

                similarity = float(np.dot(v1, v2) / (norm1 * norm2))

                if similarity >= 0.98:

                    flag = {
                        "type": "IDENTICAL_FINANCIAL_PATTERN",
                        "bidders": [id1, id2],
                        "similarity_score": round(similarity, 4),
                        "risk": "HIGH",
                        "explanation": "Financial metrics are suspiciously identical.",
                    }

                    self._add_flag(id1, flag)
                    self._add_flag(id2, flag)

    # =========================================================
    # 3. Statistical Outlier Detection
    # =========================================================

    def detect_zscore_outliers(self):

        turnovers = []
        bidder_ids = []

        for bidder in self.bidders_data:

            turnover = self._safe_float(
                bidder.get("claims", {}).get("turnover")
            )

            if turnover > 0:
                turnovers.append(turnover)
                bidder_ids.append(bidder.get("bidder_id"))

        if len(turnovers) < 3:
            return

        std_dev = np.std(turnovers)

        if std_dev == 0:
            return

        z_scores = stats.zscore(turnovers)
        mean_val = np.mean(turnovers)

        for idx, z in enumerate(z_scores):

            if abs(z) >= 2:

                flag = {
                    "type": "TURNOVER_OUTLIER",
                    "field": "turnover",
                    "mean": round(mean_val, 2),
                    "std_dev": round(std_dev, 2),
                    "z_score": round(float(z), 3),
                    "risk": "MEDIUM",
                    "explanation": "Bidder turnover significantly deviates from competitors.",
                }

                self._add_flag(bidder_ids[idx], flag)

    # =========================================================
    # 4. Network Link Analysis
    # =========================================================

    def network_link_analysis(self):

        graph = nx.Graph()

        shared_fields = [
            "gstin",
            "pan",
            "msme_registration",
            "phone",
            "email",
            "address",
        ]

        for bidder in self.bidders_data:

            bidder_id = bidder.get("bidder_id")
            claims = bidder.get("claims", {})

            graph.add_node(bidder_id, type="bidder")

            for field in shared_fields:

                value = claims.get(field)

                if not value:
                    continue

                normalized = self._normalize_string(value)

                node_name = f"{field}:{normalized}"

                graph.add_node(node_name, type=field)

                graph.add_edge(bidder_id, node_name)

        bidder_ids = [
            bidder.get("bidder_id")
            for bidder in self.bidders_data
        ]

        for i in range(len(bidder_ids)):

            for j in range(i + 1, len(bidder_ids)):

                id1 = bidder_ids[i]
                id2 = bidder_ids[j]

                try:

                    shared_neighbors = list(
                        nx.common_neighbors(graph, id1, id2)
                    )

                    shared_count = len(shared_neighbors)

                    if shared_count == 0:
                        continue

                    risk = "MEDIUM"

                    if shared_count >= 2:
                        risk = "HIGH"

                    flag = {
                        "type": "NETWORK_LINK_ANALYSIS",
                        "bidders": [id1, id2],
                        "shared_attributes": shared_count,
                        "linked_entities": shared_neighbors,
                        "risk": risk,
                        "explanation": "Bidders share suspicious common identifiers.",
                    }

                    self._add_flag(id1, flag)
                    self._add_flag(id2, flag)

                except Exception:
                    continue

    # =========================================================
    # 5. Final Risk Calculation
    # =========================================================

    def calculate_final_scores(self):

        risk_weights = {
            "HIGH": 50,
            "MEDIUM": 20,
            "LOW": 5,
        }

        for bidder_id, data in self.risk_scores.items():

            total_risk = sum(
                risk_weights.get(flag["risk"], 0)
                for flag in data["flags"]
            )

            data["risk_value"] = total_risk

            if total_risk >= 80:
                data["score"] = "HIGH"

            elif total_risk >= 30:
                data["score"] = "MEDIUM"

            else:
                data["score"] = "LOW"

    # =========================================================
    # Main Pipeline
    # =========================================================

    def run_all(self) -> Dict[str, Any]:

        self.detect_duplicate_certificates()

        self.detect_identical_financials()

        self.detect_zscore_outliers()

        self.network_link_analysis()

        self.calculate_final_scores()

        return {
            "summary": {
                "total_bidders": len(self.bidders_data),
                "total_flags": len(self.flags),
                "high_risk_bidders": len(
                    [
                        b
                        for b in self.risk_scores.values()
                        if b["score"] == "HIGH"
                    ]
                ),
            },
            "results": self.risk_scores,
        }
