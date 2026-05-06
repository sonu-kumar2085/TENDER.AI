const axios = require('axios');
const crypto = require('crypto');
const Tender = require('../models/Tender');
const Proposal = require('../models/Proposal');
const Analysis = require('../models/Analysis');

const ML_API_BASE_URL = process.env.ML_API_BASE_URL;
const ML_EXTRACTION_ENDPOINT = process.env.ML_EXTRACTION_ENDPOINT;
const ML_ANALYSIS_ENDPOINT = process.env.ML_ANALYSIS_ENDPOINT;

const extractTenderData = async (pdfUrl, tenderId) => {
  try {
    await Tender.findOneAndUpdate({ tenderId }, { mlExtractionStatus: 'processing' });
    
    let extractedData;
    if (ML_API_BASE_URL) {
      const response = await axios.post(`${ML_API_BASE_URL}${ML_EXTRACTION_ENDPOINT}`, {
        pdfUrl,
        documentType: 'tender',
        documentId: tenderId
      });
      extractedData = response.data.data;
    } else {
      extractedData = { eligibilityCriteria: [], requiredDocuments: [], clauses: [], rawText: "Mock Extraction" };
    }

    await Tender.findOneAndUpdate({ tenderId }, {
      extractedData,
      mlExtractionStatus: 'completed'
    });
  } catch (error) {
    await Tender.findOneAndUpdate({ tenderId }, {
      mlExtractionStatus: 'failed',
      mlExtractionError: error.message
    });
  }
};

const extractProposalData = async (proposalDocuments, proposalMongoId, tenderId) => {
  try {
    await Proposal.findByIdAndUpdate(proposalMongoId, { mlExtractionStatus: 'processing' });
    
    const pdfUrls = proposalDocuments.map(d => ({
      url: d.cloudinaryUrl,
      documentType: d.documentType,
      fileName: d.fileName
    }));

    let extractedData;
    if (ML_API_BASE_URL) {
      const response = await axios.post(`${ML_API_BASE_URL}${ML_EXTRACTION_ENDPOINT}`, {
        pdfUrls,
        documentType: 'proposal',
        documentId: proposalMongoId,
        tenderId
      });
      extractedData = response.data.data;
    } else {
      extractedData = { turnover: 0, msmeNumber: "MOCK" };
    }

    await Proposal.findByIdAndUpdate(proposalMongoId, {
      extractedData,
      mlExtractionStatus: 'completed'
    });

    await analyzeProposal(proposalMongoId);
  } catch (error) {
    await Proposal.findByIdAndUpdate(proposalMongoId, {
      mlExtractionStatus: 'failed',
      mlExtractionError: error.message
    });
  }
};

const analyzeProposal = async (proposalMongoId) => {
  try {
    const proposal = await Proposal.findById(proposalMongoId).populate('tender');
    const tender = proposal.tender;

    if (!tender.extractedData || !proposal.extractedData) {
      await Analysis.findOneAndUpdate(
        { proposal: proposalMongoId },
        {
          proposal: proposalMongoId,
          tender: tender._id,
          mlAnalysisStatus: 'failed',
          mlAnalysisError: 'Prerequisite extraction data missing',
          overallResult: 'manual_review',
          confidenceScore: 0,
          ambiguityScore: 0
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return;
    }

    const otherProposals = await Proposal.find({
      tender: tender._id,
      _id: { $ne: proposalMongoId },
      mlExtractionStatus: 'completed'
    }).select('proposalId extractedData bidValue companyRegistrationNo companyName');

    await Analysis.findOneAndUpdate(
      { proposal: proposalMongoId },
      {
        proposal: proposalMongoId,
        tender: tender._id,
        mlAnalysisStatus: 'processing',
        overallResult: 'manual_review',
        confidenceScore: 0,
        ambiguityScore: 0
      },
      { upsert: true }
    );

    let analysisData;
    if (ML_API_BASE_URL) {
      const response = await axios.post(`${ML_API_BASE_URL}${ML_ANALYSIS_ENDPOINT}`, {
        proposalId: proposal.proposalId,
        tenderId: tender.tenderId,
        tenderExtractedData: tender.extractedData,
        proposalExtractedData: proposal.extractedData,
        allProposalsForCrossBidderCheck: otherProposals
      });
      analysisData = response.data.data;
    } else {
      analysisData = {
        overallResult: 'manual_review',
        confidenceScore: 0.8,
        ambiguityScore: 0.2,
        matchedCriteria: [],
        unmatchedCriteria: [],
        manualReviewItems: [],
        fraudFlags: []
      };
    }

    const auditPayload = {
      proposalId: proposal.proposalId,
      ...analysisData,
      timestamp: new Date().toISOString()
    };
    const auditHash = crypto.createHash('sha256').update(JSON.stringify(auditPayload)).digest('hex');

    const updatedAnalysis = await Analysis.findOneAndUpdate(
      { proposal: proposalMongoId },
      {
        ...analysisData,
        auditHash,
        mlAnalysisStatus: 'completed',
        analyzedAt: new Date()
      },
      { new: true }
    );

    await Proposal.findByIdAndUpdate(proposalMongoId, { analysisResult: updatedAnalysis._id });
    await recomputeRankings(tender._id);
  } catch (error) {
    await Analysis.findOneAndUpdate(
      { proposal: proposalMongoId },
      {
        mlAnalysisStatus: 'failed',
        mlAnalysisError: error.message
      }
    );
  }
};

const recomputeRankings = async (tenderMongoId) => {
  const proposals = await Proposal.find({
    tender: tenderMongoId,
    analysisResult: { $ne: null }
  }).populate('analysisResult', 'confidenceScore overallResult');

  proposals.sort((a, b) => {
    const aResult = a.analysisResult.overallResult;
    const bResult = b.analysisResult.overallResult;
    
    const resultWeight = { 'eligible': 3, 'manual_review': 2, 'rejected': 1 };
    
    if (resultWeight[aResult] !== resultWeight[bResult]) {
      return resultWeight[bResult] - resultWeight[aResult];
    }
    
    if (b.analysisResult.confidenceScore !== a.analysisResult.confidenceScore) {
      return b.analysisResult.confidenceScore - a.analysisResult.confidenceScore;
    }
    
    return a.bidValue - b.bidValue;
  });

  const bulkOps = proposals.map((prop, index) => ({
    updateOne: {
      filter: { _id: prop._id },
      update: { rank: index + 1 }
    }
  }));

  if (bulkOps.length > 0) {
    await Proposal.bulkWrite(bulkOps);
  }
};

module.exports = {
  extractTenderData,
  extractProposalData,
  analyzeProposal,
  recomputeRankings
};
