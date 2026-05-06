import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Dict, Any

from backend.services.ingestion import process_pdf_bytes
from backend.services.extraction import TenderExtractor, BidderExtractor
from backend.services.reasoning import ReasoningLayer, AmbiguityScoreEngine
from backend.services.decision import DecisionEngine
from backend.services.fraud import FraudDetectionLayer
from backend.database import db

router = APIRouter()

tender_extractor = TenderExtractor()
bidder_extractor = BidderExtractor()
reasoning_layer = ReasoningLayer()

@router.post("/tender/upload")
async def upload_tender(file: UploadFile = File(...)):
    file_bytes = await file.read()
    ingestion_result = process_pdf_bytes(file_bytes, file.filename)
    
    # Extract conditions
    all_text = "\n".join([p["text"] for p in ingestion_result["pages"]])
    conditions = tender_extractor.extract_conditions(all_text)
    
    tender_id = str(uuid.uuid4())
    db.save_tender(tender_id, conditions)
    
    return {
        "tender_id": tender_id,
        "conditions": conditions,
        "metadata": ingestion_result["metadata"]
    }

@router.post("/bidder/upload")
async def upload_bidder(tender_id: str = Form(...), file: UploadFile = File(...)):
    tender_conditions = db.get_tender(tender_id)
    if not tender_conditions:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    file_bytes = await file.read()
    ingestion_result = process_pdf_bytes(file_bytes, file.filename)
    
    all_text = "\n".join([p["text"] for p in ingestion_result["pages"]])
    claims = bidder_extractor.extract_claims(all_text)
    
    # Reasoning Layer
    reasoning_result = reasoning_layer.build_evidence_graph(tender_conditions, claims, ingestion_result["pages"][0]["ocr_confidence"])
    evidence_nodes = reasoning_result["evidence_nodes"]
    
    # Ambiguity
    avg_ocr = sum([p["ocr_confidence"] for p in ingestion_result["pages"]]) / len(ingestion_result["pages"])
    ambiguity_data = AmbiguityScoreEngine.compute_score(avg_ocr, 0.0)
    
    # Decision Layer
    decision_result = DecisionEngine.run_decision_stack(tender_conditions, evidence_nodes, ambiguity_data)
    
    bidder_id = str(uuid.uuid4())
    snapshot = DecisionEngine.generate_snapshot(
        bidder_id, tender_id, decision_result, ambiguity_data, reasoning_result["summary"]
    )
    
    # Add input hash to snapshot for audit
    snapshot["input_hash"] = ingestion_result["hash"]
    
    db.save_bidder(bidder_id, tender_id, claims, snapshot)
    
    return {
        "bidder_id": bidder_id,
        "decision_snapshot": snapshot
    }

@router.get("/analysis/{tender_id}")
async def get_analysis(tender_id: str):
    bidders = db.get_bidders(tender_id)
    return {"tender_id": tender_id, "bidders": bidders}

@router.get("/fraud/{tender_id}")
async def get_fraud(tender_id: str):
    bidders = db.get_bidders(tender_id)
    if not bidders:
        return {"risk_scores": {}}
        
    fraud_layer = FraudDetectionLayer(bidders)
    risk_scores = fraud_layer.run_all()
    
    return {"risk_scores": risk_scores}

@router.post("/decision/override")
async def override_decision(
    tender_id: str = Form(...),
    bidder_id: str = Form(...),
    override_type: str = Form(...),
    justification: str = Form(...),
    officer_id: str = Form(...)
):
    bidders = db.get_bidders(tender_id)
    bidder_data = next((b for b in bidders if b["bidder_id"] == bidder_id), None)
    if not bidder_data:
        raise HTTPException(status_code=404, detail="Bidder not found")
        
    input_hash = bidder_data["decision_snapshot"].get("input_hash", "unknown")
    
    success = db.lock_decision(tender_id, bidder_id, override_type, justification, officer_id, input_hash)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to lock decision")
        
    return {"message": "Decision locked successfully"}

@router.get("/audit/{tender_id}")
async def get_audit(tender_id: str):
    records = db.get_audit_trail(tender_id)
    return {"audit_trail": records}
