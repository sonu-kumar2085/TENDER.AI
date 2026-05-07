const axios = require('axios');
const crypto = require('crypto');
const Tender = require('../models/Tender');
const Proposal = require('../models/Proposal');
const Analysis = require('../models/Analysis');

const ML_BASE = process.env.ML_API_BASE_URL;
const ML_EXTRACT = process.env.ML_EXTRACTION_ENDPOINT || '/extract';
const ML_ANALYZE = process.env.ML_ANALYSIS_ENDPOINT || '/analyze';

// Axios instance with 60-second timeout
const mlClient = axios.create({ timeout: 60000 });

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Call the ML server and return `data` from the response body.
 * Throws a descriptive error if the ML server returns { success: false }.
 */
const callML = async (endpoint, payload) => {
  const url = `${ML_BASE}${endpoint}`;
  let res;
  try {
    res = await mlClient.post(url, payload);
  } catch (err) {
    // Network / timeout error
    const msg = err.response
      ? `ML server error ${err.response.status}: ${JSON.stringify(err.response.data)}`
      : `ML server unreachable at ${url}: ${err.message}`;
    throw new Error(msg);
  }

  const body = res.data;
  if (!body || body.success === false) {
    throw new Error(`ML returned failure: ${body?.error || 'unknown error'}`);
  }
  if (body.data === undefined) {
    throw new Error(`ML returned success but no data field`);
  }
  return body.data;
};

/**
 * Sleep helper for retry logic.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait until a tender's mlExtractionStatus is no longer 'processing'.
 * Returns the refreshed tender doc, or null on timeout.
 */
const waitForTenderExtraction = async (tenderMongoId, maxWaitMs = 90000) => {
  const pollInterval = 5000;
  const maxAttempts = Math.ceil(maxWaitMs / pollInterval);

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(pollInterval);
    const tender = await Tender.findById(tenderMongoId);
    if (!tender) return null;
    if (tender.mlExtractionStatus !== 'processing') return tender;
  }
  return null; // timed out
};

// ─── Stage 1+2: Tender PDF ingestion + extraction ──────────────────────────

const extractTenderData = async (pdfUrl, tenderId) => {
  try {
    // Mark as processing
    await Tender.findOneAndUpdate({ tenderId }, { mlExtractionStatus: 'processing', mlExtractionError: null });

    let extractedData;
    if (ML_BASE) {
      console.log(`[ML] Starting tender extraction for ${tenderId}`);
      extractedData = await callML(ML_EXTRACT, {
        pdfUrl,
        documentType: 'tender',
        documentId: tenderId,
      });
      console.log(`[ML] Tender extraction complete for ${tenderId}:`, JSON.stringify(extractedData).slice(0, 200));
    } else {
      // Dev fallback — no ML server
      extractedData = {
        eligibilityCriteria: [],
        requiredDocuments: [],
        clauses: [],
        rawText: 'Mock extraction — ML_API_BASE_URL not set',
      };
    }

    await Tender.findOneAndUpdate({ tenderId }, {
      extractedData,
      mlExtractionStatus: 'completed',
      mlExtractionError: null,
    });
  } catch (error) {
    console.error(`[ML] Tender extraction FAILED for ${tenderId}:`, error.message);
    await Tender.findOneAndUpdate({ tenderId }, {
      mlExtractionStatus: 'failed',
      mlExtractionError: error.message,
    });
  }
};

// ─── Stage 1+2: Proposal PDF ingestion + extraction ────────────────────────

const extractProposalData = async (proposalDocuments, proposalMongoId, tenderId) => {
  try {
    await Proposal.findByIdAndUpdate(proposalMongoId, {
      mlExtractionStatus: 'processing',
      mlExtractionError: null,
    });

    const pdfUrls = proposalDocuments.map((d) => ({
      url: d.cloudinaryUrl,
      documentType: d.documentType,
      fileName: d.fileName,
    }));

    let extractedData;
    if (ML_BASE) {
      console.log(`[ML] Starting proposal extraction for ${proposalMongoId}`);
      extractedData = await callML(ML_EXTRACT, {
        pdfUrls,
        documentType: 'proposal',
        documentId: proposalMongoId,
        tenderId,
      });
      console.log(`[ML] Proposal extraction complete for ${proposalMongoId}:`, JSON.stringify(extractedData).slice(0, 200));
    } else {
      extractedData = { turnover: 0, msmeNumber: 'MOCK' };
    }

    await Proposal.findByIdAndUpdate(proposalMongoId, {
      extractedData,
      mlExtractionStatus: 'completed',
      mlExtractionError: null,
    });

    // Proceed to analysis (stages 3+4+5)
    await analyzeProposal(proposalMongoId);
  } catch (error) {
    console.error(`[ML] Proposal extraction FAILED for ${proposalMongoId}:`, error.message);
    await Proposal.findByIdAndUpdate(proposalMongoId, {
      mlExtractionStatus: 'failed',
      mlExtractionError: error.message,
    });
  }
};

// ─── Stages 3+4+5: Reasoning + Decision + Fraud ────────────────────────────

const analyzeProposal = async (proposalMongoId) => {
  try {
    const proposal = await Proposal.findById(proposalMongoId).populate('tender');
    if (!proposal) throw new Error(`Proposal ${proposalMongoId} not found`);

    let tender = proposal.tender;
    if (!tender) throw new Error(`Tender not found for proposal ${proposalMongoId}`);

    // ── Ensure tender extraction is ready ──────────────────────────────────
    if (!tender.extractedData) {
      if (tender.mlExtractionStatus === 'processing') {
        // Wait for in-progress extraction (up to 90s)
        console.log(`[ML] Tender extraction in progress — waiting (proposal ${proposalMongoId})`);
        const refreshed = await waitForTenderExtraction(tender._id);
        if (!refreshed) {
          throw new Error('Timed out waiting for tender extraction to complete');
        }
        tender = refreshed;
      }

      if (tender.mlExtractionStatus === 'pending' || tender.mlExtractionStatus === 'failed') {
        // Trigger tender re-extraction and wait
        console.log(`[ML] Tender extraction not done (status: ${tender.mlExtractionStatus}) — triggering re-extraction`);
        // Kick off synchronously so we can wait for it
        await extractTenderData(tender.tenderPdfUrl, tender.tenderId);
        tender = await Tender.findById(tender._id);
      }

      if (!tender.extractedData) {
        // Still missing — save failed analysis and bail
        await Analysis.findOneAndUpdate(
          { proposal: proposalMongoId },
          {
            proposal: proposalMongoId,
            tender: tender._id,
            mlAnalysisStatus: 'failed',
            mlAnalysisError: 'Tender extractedData is missing even after re-extraction attempt',
            overallResult: 'manual_review',
            confidenceScore: 0,
            ambiguityScore: 0,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return;
      }
    }

    // ── Gather other proposals for cross-bidder fraud check ──────────────
    const otherProposals = await Proposal.find({
      tender: tender._id,
      _id: { $ne: proposalMongoId },
      mlExtractionStatus: 'completed',
    }).select('proposalId extractedData bidValue companyRegistrationNo companyName').lean();

    // Create / update analysis record as "processing"
    await Analysis.findOneAndUpdate(
      { proposal: proposalMongoId },
      {
        proposal: proposalMongoId,
        tender: tender._id,
        mlAnalysisStatus: 'processing',
        overallResult: 'manual_review',
        confidenceScore: 0,
        ambiguityScore: 0,
      },
      { upsert: true }
    );

    // ── Call ML analyze endpoint (stages 3+4+5) ──────────────────────────
    let analysisData;
    if (ML_BASE) {
      console.log(`[ML] Starting analysis for proposal ${proposalMongoId} against tender ${tender.tenderId}`);
      analysisData = await callML(ML_ANALYZE, {
        proposalId: proposal.proposalId,
        tenderId: tender.tenderId,
        tenderExtractedData: tender.extractedData,
        proposalExtractedData: proposal.extractedData,
        allProposalsForCrossBidderCheck: otherProposals,
      });
      console.log(`[ML] Analysis complete for ${proposalMongoId}: result=${analysisData.overallResult}`);
    } else {
      analysisData = {
        overallResult: 'manual_review',
        confidenceScore: 0.8,
        ambiguityScore: 0.2,
        matchedCriteria: [],
        unmatchedCriteria: [],
        manualReviewItems: [],
        fraudFlags: [],
      };
    }

    // ── Build audit hash & save ───────────────────────────────────────────
    const auditPayload = {
      proposalId: proposal.proposalId,
      ...analysisData,
      timestamp: new Date().toISOString(),
    };
    const auditHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(auditPayload))
      .digest('hex');

    const updatedAnalysis = await Analysis.findOneAndUpdate(
      { proposal: proposalMongoId },
      {
        ...analysisData,
        auditHash,
        mlAnalysisStatus: 'completed',
        analyzedAt: new Date(),
      },
      { new: true }
    );

    await Proposal.findByIdAndUpdate(proposalMongoId, { analysisResult: updatedAnalysis._id });

    // Recompute rankings after each new analysis
    await recomputeRankings(tender._id);
  } catch (error) {
    console.error(`[ML] Analysis FAILED for proposal ${proposalMongoId}:`, error.message);
    await Analysis.findOneAndUpdate(
      { proposal: proposalMongoId },
      {
        mlAnalysisStatus: 'failed',
        mlAnalysisError: error.message,
      },
      { upsert: false }
    );
  }
};

// ─── Ranking engine ────────────────────────────────────────────────────────

const recomputeRankings = async (tenderMongoId) => {
  try {
    const proposals = await Proposal.find({
      tender: tenderMongoId,
      analysisResult: { $ne: null },
    }).populate('analysisResult', 'confidenceScore overallResult');

    proposals.sort((a, b) => {
      const resultWeight = { eligible: 3, manual_review: 2, rejected: 1 };
      const aW = resultWeight[a.analysisResult?.overallResult] || 0;
      const bW = resultWeight[b.analysisResult?.overallResult] || 0;

      if (aW !== bW) return bW - aW;

      const aConf = a.analysisResult?.confidenceScore || 0;
      const bConf = b.analysisResult?.confidenceScore || 0;
      if (aConf !== bConf) return bConf - aConf;

      return (a.bidValue || 0) - (b.bidValue || 0);
    });

    const bulkOps = proposals.map((prop, index) => ({
      updateOne: {
        filter: { _id: prop._id },
        update: { rank: index + 1 },
      },
    }));

    if (bulkOps.length > 0) {
      await Proposal.bulkWrite(bulkOps);
    }
  } catch (err) {
    console.error('[ML] Ranking recompute failed:', err.message);
  }
};

module.exports = {
  extractTenderData,
  extractProposalData,
  analyzeProposal,
  recomputeRankings,
};
