import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from services.ingestion import process_pdf_bytes
from services.extraction import TenderExtractor, BidderExtractor
from services.reasoning import ReasoningLayer, AmbiguityScoreEngine
from services.decision import DecisionEngine
from services.fraud import FraudDetectionLayer

router = APIRouter()

tender_extractor = TenderExtractor()
bidder_extractor = BidderExtractor()
reasoning_layer = ReasoningLayer()

async def download_file(url: str) -> bytes:
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to download from {url}")
        return response.content

class ExtractRequest(BaseModel):
    documentType: str
    documentId: str
    tenderId: Optional[str] = None
    pdfUrl: Optional[str] = None
    pdfUrls: Optional[List[Dict[str, str]]] = None

@router.post("/extract")
async def extract_data(req: ExtractRequest):
    try:
        if req.documentType == "tender":
            if not req.pdfUrl:
                raise HTTPException(status_code=400, detail="pdfUrl is required for tender extraction")
            
            file_bytes = await download_file(req.pdfUrl)
            ingestion_result = process_pdf_bytes(file_bytes, "tender.pdf")
            all_text = "\n".join([p["text"] for p in ingestion_result["pages"]])
            conditions = tender_extractor.extract_conditions(all_text)
            
            return {
                "success": True,
                "data": {
                    "eligibilityCriteria": conditions,
                    "requiredDocuments": [],
                    "clauses": [],
                    "rawText": all_text[:1000] # truncate for db size
                }
            }
            
        elif req.documentType == "proposal":
            if not req.pdfUrls:
                raise HTTPException(status_code=400, detail="pdfUrls is required for proposal extraction")
                
            all_text = ""
            for pdf_obj in req.pdfUrls:
                url = pdf_obj.get("url")
                if url:
                    file_bytes = await download_file(url)
                    ingestion_result = process_pdf_bytes(file_bytes, pdf_obj.get("fileName", "doc.pdf"))
                    all_text += "\n" + "\n".join([p["text"] for p in ingestion_result["pages"]])
                    
            claims = bidder_extractor.extract_claims(all_text)
            
            return {
                "success": True,
                "data": claims
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid documentType")
            
    except Exception as e:
        return {"success": False, "error": str(e)}


class AnalyzeRequest(BaseModel):
    proposalId: str
    tenderId: str
    tenderExtractedData: Dict[str, Any]
    proposalExtractedData: Dict[str, Any]
    allProposalsForCrossBidderCheck: List[Dict[str, Any]]

@router.post("/analyze")
async def analyze_proposal(req: AnalyzeRequest):
    try:
        tender_conditions = req.tenderExtractedData.get("eligibilityCriteria", [])
        claims = req.proposalExtractedData
        
        # Reasoning Layer (Assuming ocr_confidence is 1.0 since we bypassed full ingestion state here)
        reasoning_result = reasoning_layer.build_evidence_graph(tender_conditions, claims, 1.0)
        evidence_nodes = reasoning_result["evidence_nodes"]
        
        # Ambiguity
        ambiguity_data = AmbiguityScoreEngine.compute_score(1.0, 0.0)
        
        # Decision Layer
        decision_result = DecisionEngine.run_decision_stack(tender_conditions, evidence_nodes, ambiguity_data)
        
        overall_result = "manual_review"
        if decision_result["final_state"] == "AUTO_APPROVE":
            overall_result = "eligible"
        elif decision_result["final_state"] == "AUTO_REJECT":
            overall_result = "rejected"
            
        # Format matching / unmatched criteria from evaluated nodes
        matched = []
        unmatched = []
        for node in decision_result.get("evaluated_nodes", []):
            crit = {
                "criterionName": str(node.get("condition_id")),
                "required": str(node.get("expected_value")),
                "extracted": str(node.get("extracted_value")),
                "sourceDocument": "Proposal Docs",
                "sourcePage": "1",
                "confidence": float(node.get("confidence", 1.0)),
                "clauseReference": str(node.get("source_clause", "")),
                "aiExplanation": str(node.get("reasoning", "Logic validation"))
            }
            if node.get("verdict") == "ELIGIBLE":
                matched.append(crit)
            else:
                crit["rejectionReason"] = "Value did not meet threshold"
                crit["evidenceTrace"] = []
                unmatched.append(crit)
        
        # Fraud Detection 
        fraud_flags = []
        if req.allProposalsForCrossBidderCheck:
            bidders = [{"bidder_id": req.proposalId, "claims": claims}]
            for other in req.allProposalsForCrossBidderCheck:
                bidders.append({
                    "bidder_id": other.get("proposalId"),
                    "claims": other.get("extractedData", {})
                })
            
            fraud_layer = FraudDetectionLayer(bidders)
            fraud_scores = fraud_layer.run_all()
            
            my_fraud = fraud_scores.get(req.proposalId, {})
            if my_fraud.get("risk_level") in ["High", "Critical"]:
                fraud_flags.append({
                    "flagType": "CROSS_BIDDER_ANOMALY",
                    "description": "Potential fraud detected comparing with other bids",
                    "severity": str(my_fraud.get("risk_level")).lower(),
                    "affectedProposals": []
                })

        return {
            "success": True,
            "data": {
                "overallResult": overall_result,
                "confidenceScore": float(decision_result["overall_confidence"]),
                "ambiguityScore": float(ambiguity_data["score"]),
                "matchedCriteria": matched,
                "unmatchedCriteria": unmatched,
                "manualReviewItems": [],
                "fraudFlags": fraud_flags
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
