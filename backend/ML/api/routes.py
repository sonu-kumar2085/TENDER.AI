import logging
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from services.ingestion import process_pdf_bytes
from services.extraction import TenderExtractor, BidderExtractor
from services.reasoning import ReasoningLayer, AmbiguityScoreEngine
from services.decision import DecisionEngine
from services.fraud import FraudDetectionLayer

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Human-readable labels for ML field names ───────────────────────────────
FIELD_LABELS: Dict[str, str] = {
    "turnover":             "Annual Turnover",
    "emd":                  "Earnest Money Deposit (EMD)",
    "experience_years":     "Work Experience (Years)",
    "iso_certification":    "ISO Certification",
    "not_blacklisted":      "Non-Blacklisting Declaration",
    "msme_registration":    "MSME / UDYAM Registration",
    "gstin":                "GSTIN",
    "pan":                  "PAN",
    "bid_validity":         "Bid Validity Period",
    "delivery_period":      "Delivery / Completion Period",
    "warranty":             "Warranty Period",
    "performance_security": "Performance Security (PBG)",
    "payment_terms":        "Payment Terms",
    "certification":        "Certification",
    "registration":         "Registration",
    "compliance":           "Regulatory Compliance",
}

def get_field_label(field: str, condition_id: str) -> str:
    """Return a human-readable label for a criterion field."""
    if field and field in FIELD_LABELS:
        return FIELD_LABELS[field]
    # Fallback: prettify the raw field name (e.g. "my_field" -> "My Field")
    if field:
        return field.replace("_", " ").title()
    # Last resort: keep condition_id but make it descriptive
    return f"Criterion {condition_id}"

# BidderExtractor is stateless — one instance is fine
bidder_extractor = BidderExtractor()

# ReasoningLayer is also stateless
reasoning_layer = ReasoningLayer()


async def download_file(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(url)
        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to download file from {url} (HTTP {response.status_code})"
            )
        return response.content


# ─── Health check ──────────────────────────────────────────────────────────

@router.get("/health")
def health():
    return {"status": "ok", "service": "TENDER.AI ML"}


# ─── /extract ──────────────────────────────────────────────────────────────

class ExtractRequest(BaseModel):
    documentType: str          # "tender" | "proposal"
    documentId: str
    tenderId: Optional[str] = None
    pdfUrl: Optional[str] = None            # single URL for tender
    pdfUrls: Optional[List[Dict[str, str]]] = None  # list for proposal


@router.post("/extract")
async def extract_data(req: ExtractRequest):
    # ─── TENDER ────────────────────────────────────────────────────────────
    if req.documentType == "tender":
        if not req.pdfUrl:
            raise HTTPException(status_code=400, detail="pdfUrl is required for tender extraction")

        try:
            file_bytes = await download_file(req.pdfUrl)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")

        try:
            ingestion_result = process_pdf_bytes(file_bytes, "tender.pdf")
            if ingestion_result.get("status") == "FAILED":
                raise HTTPException(
                    status_code=500,
                    detail=f"PDF ingestion failed: {ingestion_result.get('error')}"
                )

            all_text = "\n".join([p["text"] for p in ingestion_result.get("pages", [])])
            logger.info(f"[EXTRACT/tender] documentId={req.documentId} text_len={len(all_text)}")
            logger.info(f"[EXTRACT/tender] preview: {all_text[:300]}")

            # Create a fresh TenderExtractor per request so counter always starts at C1
            extractor = TenderExtractor()
            conditions = extractor.extract_conditions(all_text)
            logger.info(f"[EXTRACT/tender] {len(conditions)} conditions extracted")
            for c in conditions:
                logger.info(f"[EXTRACT/tender] condition: {c['field']}={c['value']} op={c['operator']}")

            return {
                "success": True,
                "data": {
                    "eligibilityCriteria": conditions,
                    "requiredDocuments": [],
                    "clauses": [],
                    "rawText": all_text[:2000]   # store first 2000 chars for reference
                }
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[EXTRACT/tender] ERROR: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Tender extraction error: {str(e)}")

    # ─── PROPOSAL ──────────────────────────────────────────────────────────
    elif req.documentType == "proposal":
        if not req.pdfUrls:
            raise HTTPException(status_code=400, detail="pdfUrls is required for proposal extraction")

        try:
            all_text = ""
            for pdf_obj in req.pdfUrls:
                url = pdf_obj.get("url")
                if not url:
                    continue
                try:
                    file_bytes = await download_file(url)
                    ingestion_result = process_pdf_bytes(file_bytes, pdf_obj.get("fileName", "doc.pdf"))
                    if ingestion_result.get("status") == "FAILED":
                        logger.warning(f"[EXTRACT/proposal] Ingestion failed for {url}: {ingestion_result.get('error')}")
                        continue
                    all_text += "\n" + "\n".join([p["text"] for p in ingestion_result.get("pages", [])])
                except Exception as doc_err:
                    logger.warning(f"[EXTRACT/proposal] Could not process {url}: {str(doc_err)}")
                    continue

            logger.info(f"[EXTRACT/proposal] documentId={req.documentId} total_text_len={len(all_text)}")
            logger.info(f"[EXTRACT/proposal] preview: {all_text[:300]}")

            claims = bidder_extractor.extract_claims(all_text)
            logger.info(f"[EXTRACT/proposal] claims extracted: {claims}")

            return {
                "success": True,
                "data": claims
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[EXTRACT/proposal] ERROR: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Proposal extraction error: {str(e)}")

    else:
        raise HTTPException(status_code=400, detail=f"Invalid documentType: {req.documentType!r}")


# ─── /analyze ──────────────────────────────────────────────────────────────

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

        logger.info(f"[ANALYZE] proposalId={req.proposalId} tenderId={req.tenderId}")
        logger.info(f"[ANALYZE] tender_conditions count={len(tender_conditions)}")
        logger.info(f"[ANALYZE] proposal claims: {claims}")

        # ── Stage 3: Reasoning ─────────────────────────────────────────────
        reasoning_result = reasoning_layer.build_evidence_graph(tender_conditions, claims, 1.0)
        evidence_nodes = reasoning_result.get("evidence_nodes", [])

        logger.info(f"[ANALYZE] evidence_nodes count={len(evidence_nodes)}")
        for node in evidence_nodes:
            logger.info(
                f"[ANALYZE] node: {node.get('condition_id')} "
                f"field={node.get('claim_field')} "
                f"value={node.get('extracted_value')} "
                f"conflict={node.get('internal_conflict')}"
            )

        # ── Stage 4: Ambiguity + Decision ──────────────────────────────────
        conflict_count = sum(1 for n in evidence_nodes if n.get("internal_conflict"))
        conflict_ratio = conflict_count / len(evidence_nodes) if evidence_nodes else 0.0

        ambiguity_data = AmbiguityScoreEngine.compute_score(1.0, conflict_ratio)
        decision_result = DecisionEngine.run_decision_stack(tender_conditions, evidence_nodes, ambiguity_data)

        overall_result = "manual_review"
        if decision_result["final_state"] == "AUTO_APPROVE":
            overall_result = "eligible"
        elif decision_result["final_state"] == "AUTO_REJECT":
            overall_result = "rejected"

        logger.info(f"[ANALYZE] final_state={decision_result['final_state']} overall_result={overall_result}")

        # ── format_value helper (defined once, outside the loop) ───────────
        def format_value(val, unit_str: str) -> str:
            """Return a human-readable string for a raw ML value."""
            if val is None or str(val).strip() in ("", "None", "null"):
                return "—"
            s = str(val).strip()
            u = (unit_str or "").upper()
            # ── Currency ──────────────────────────────────────────────────
            if u == "INR":
                try:
                    n = float(s.replace(",", ""))
                    if n >= 10_000_000:
                        return f"₹ {n / 10_000_000:.2f} Cr"
                    elif n >= 100_000:
                        return f"₹ {n / 100_000:.2f} Lakh"
                    else:
                        return f"₹ {int(n):,}"
                except Exception:
                    pass
            # ── Years / experience ────────────────────────────────────────
            if u == "YEARS":
                try:
                    return f"{int(float(s))} Years"
                except Exception:
                    pass
            # ── Boolean ──────────────────────────────────────────────────
            if s.lower() in ("true", "1", "yes"):
                return "Complied ✓"
            if s.lower() in ("false", "0", "no"):
                return "Not Present ✗"
            return s

        # ── Format matched / unmatched criteria ────────────────────────────
        matched = []
        unmatched = []

        # Build a lookup from condition_id -> tender condition for extra metadata
        condition_meta = {c.get("condition_id"): c for c in tender_conditions}

        # Also track which fields were actually found in the proposal
        proposal_fields_present = set(
            field for field, val in claims.items()
            if val is not None and str(val).strip() not in ("", "None", "null")
        )

        for node in decision_result.get("evaluated_nodes", []):
            condition_id = node.get("condition_id", "")
            tender_cond  = condition_meta.get(condition_id, {})

            # Resolve human-readable name
            field_name = (
                tender_cond.get("field")
                or node.get("claim_field")
                or node.get("field", "")
            )
            human_name = get_field_label(field_name, condition_id)

            unit         = tender_cond.get("unit", "")
            raw_required = node.get("expected_value", "")
            raw_extracted = node.get("extracted_value")   # keep None distinct

            # A value is "missing" if the proposal simply didn't provide it
            is_missing = (
                raw_extracted is None
                or str(raw_extracted).strip() in ("", "None", "null")
                or field_name not in proposal_fields_present
            )

            crit = {
                "criterionName"   : human_name,
                "field"           : field_name,
                "conditionId"     : condition_id,
                "required"        : format_value(raw_required, unit),
                "extracted"       : format_value(raw_extracted, unit),
                "sourceDocument"  : "Proposal Documents",
                "sourcePage"      : "1",
                "confidence"      : float(node.get("confidence", 1.0)),
                "clauseReference" : str(
                    tender_cond.get("source_clause")
                    or node.get("source_clause", "")
                ),
                "aiExplanation"   : str(node.get("reason", "Logic validation")),
                "tenderRequirement": str(tender_cond.get("source_clause", "")),
            }

            if node.get("verdict") == "ELIGIBLE":
                matched.append(crit)
            else:
                # Distinguish "not provided at all" from "provided but wrong"
                if is_missing:
                    crit["rejectionReason"] = (
                        f"This requirement was not found in the proposal. "
                        f"Tender requires: {format_value(raw_required, unit)}"
                    )
                    crit["missingFromProposal"] = True
                else:
                    crit["rejectionReason"] = node.get(
                        "evaluation_reason", "Value did not meet threshold"
                    )
                    crit["missingFromProposal"] = False

                crit["found"]        = format_value(raw_extracted, unit)
                crit["evidenceTrace"] = []
                unmatched.append(crit)

        # ── Stage 5: Fraud Detection ────────────────────────────────────────
        fraud_flags = []
        try:
            bidders = [{"bidder_id": req.proposalId, "claims": claims}]
            for other in req.allProposalsForCrossBidderCheck:
                other_id = other.get("proposalId")
                other_claims = other.get("extractedData") or {}
                if other_id and other_claims:
                    bidders.append({"bidder_id": other_id, "claims": other_claims})

            if len(bidders) > 1:
                fraud_layer = FraudDetectionLayer(bidders)
                fraud_scores = fraud_layer.run_all()

                my_fraud = fraud_scores.get("results", {}).get(req.proposalId, {})
                if my_fraud.get("score") in ["MEDIUM", "HIGH"]:
                    fraud_flags.append({
                        "flagType": "CROSS_BIDDER_ANOMALY",
                        "description": "Potential fraud detected when comparing with other bids",
                        "severity": my_fraud.get("score", "medium").lower(),
                        "affectedProposals": [],
                    })
                logger.info(f"[ANALYZE] fraud score for {req.proposalId}: {my_fraud.get('score', 'N/A')}")
        except Exception as fraud_err:
            logger.warning(f"[ANALYZE] Fraud detection skipped due to error: {str(fraud_err)}")

        return {
            "success": True,
            "data": {
                "overallResult": overall_result,
                "confidenceScore": float(decision_result.get("overall_confidence", 0.0)),
                "ambiguityScore": float(ambiguity_data.get("score", 0.0)),
                "matchedCriteria": matched,
                "unmatchedCriteria": unmatched,
                "manualReviewItems": [],
                "fraudFlags": fraud_flags,
                "aiSummary": reasoning_result.get("summary", ""),
            }
        }

    except Exception as e:
        logger.error(f"[ANALYZE] ERROR: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")
