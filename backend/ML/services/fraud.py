import hashlib
import numpy as np
from scipy import stats
import networkx as nx
from typing import List, Dict, Any

class FraudDetectionLayer:
    def __init__(self, bidders_data: List[Dict[str, Any]]):
        self.bidders_data = bidders_data
        self.flags = []
        self.risk_scores = {b["bidder_id"]: {"score": "LOW", "flags": []} for b in bidders_data}

    def _add_flag(self, bidder_id: str, flag: Dict[str, Any]):
        self.flags.append(flag)
        self.risk_scores[bidder_id]["flags"].append(flag)

    def detect_duplicate_certificates(self):
        cert_map = {}
        for b in self.bidders_data:
            certs = [b["claims"].get(k) for k in ["iso_certification", "msme_registration", "gstin", "pan"] if b["claims"].get(k)]
            for cert in certs:
                hashed = hashlib.md5(str(cert).encode()).hexdigest()
                if hashed not in cert_map:
                    cert_map[hashed] = {"cert": cert, "bidders": set()}
                cert_map[hashed]["bidders"].add(b["bidder_id"])

        for hashed, data in cert_map.items():
            if len(data["bidders"]) > 1:
                flag = {
                    "type": "DUPLICATE_CERT",
                    "certificate": data["cert"],
                    "bidders": list(data["bidders"]),
                    "risk": "HIGH"
                }
                for bidder_id in data["bidders"]:
                    self._add_flag(bidder_id, flag)

    def detect_identical_financials(self):
        vectors = {}
        for b in self.bidders_data:
            claims = b["claims"]
            v = [
                float(claims.get("turnover", 0)),
                float(claims.get("emd", 0)),
                float(claims.get("experience_years", 0))
            ]
            vectors[b["bidder_id"]] = np.array(v)

        bidder_ids = list(vectors.keys())
        for i in range(len(bidder_ids)):
            for j in range(i + 1, len(bidder_ids)):
                id1, id2 = bidder_ids[i], bidder_ids[j]
                v1, v2 = vectors[id1], vectors[id2]
                
                # Check zero vectors to avoid division by zero
                if np.linalg.norm(v1) == 0 or np.linalg.norm(v2) == 0:
                    continue
                    
                similarity = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
                if similarity > 0.95:
                    flag = {
                        "type": "IDENTICAL_FINANCIALS",
                        "bidders": [id1, id2],
                        "similarity": round(similarity, 3),
                        "risk": "HIGH"
                    }
                    self._add_flag(id1, flag)
                    self._add_flag(id2, flag)

    def detect_zscore_outliers(self):
        turnovers = []
        bidder_ids = []
        for b in self.bidders_data:
            turnover = b["claims"].get("turnover")
            if turnover is not None:
                turnovers.append(float(turnover))
                bidder_ids.append(b["bidder_id"])
                
        if len(turnovers) > 2:
            z_scores = stats.zscore(turnovers)
            mean_val = np.mean(turnovers)
            std_dev = np.std(turnovers)
            
            for i, z in enumerate(z_scores):
                if abs(z) > 2.0:
                    flag = {
                        "type": "Z_SCORE_OUTLIER",
                        "field": "turnover",
                        "mean": mean_val,
                        "std_dev": std_dev,
                        "z_score": round(z, 3),
                        "risk": "MEDIUM"
                    }
                    self._add_flag(bidder_ids[i], flag)

    def network_link_analysis(self):
        G = nx.Graph()
        # Add nodes
        for b in self.bidders_data:
            G.add_node(b["bidder_id"], type="bidder")
            
            # Simple identifiers: using same MSME state code as a weak proxy for hackathon, 
            # or exact match of certs.
            msme = b["claims"].get("msme_registration", "")
            if msme:
                G.add_node(msme, type="msme")
                G.add_edge(b["bidder_id"], msme, label="shared_msme")

        # Analyze connections
        for i in range(len(self.bidders_data)):
            for j in range(i + 1, len(self.bidders_data)):
                id1 = self.bidders_data[i]["bidder_id"]
                id2 = self.bidders_data[j]["bidder_id"]
                
                # Number of shared paths of length 2
                try:
                    shared_neighbors = list(nx.common_neighbors(G, id1, id2))
                    if len(shared_neighbors) >= 2:
                        flag = {"type": "NETWORK_LINK", "shared_attributes": len(shared_neighbors), "bidders": [id1, id2], "risk": "HIGH"}
                        self._add_flag(id1, flag)
                        self._add_flag(id2, flag)
                    elif len(shared_neighbors) == 1:
                        flag = {"type": "NETWORK_LINK", "shared_attributes": 1, "bidders": [id1, id2], "risk": "MEDIUM"}
                        self._add_flag(id1, flag)
                        self._add_flag(id2, flag)
                except nx.NetworkXError:
                    pass

    def run_all(self) -> Dict[str, Any]:
        self.detect_duplicate_certificates()
        self.detect_identical_financials()
        self.detect_zscore_outliers()
        self.network_link_analysis()

        # Compute final risk score
        for bidder_id, data in self.risk_scores.items():
            high_count = sum(1 for f in data["flags"] if f["risk"] == "HIGH")
            med_count = sum(1 for f in data["flags"] if f["risk"] == "MEDIUM")
            
            if high_count > 0 or med_count >= 2:
                data["score"] = "HIGH"
            elif med_count == 1:
                data["score"] = "MEDIUM"
            else:
                data["score"] = "LOW"
                
        return self.risk_scores
