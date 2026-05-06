const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  proposal: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true, unique: true },
  tender: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', required: true },
  overallResult: { 
    type: String, 
    required: true, 
    enum: ['eligible', 'rejected', 'manual_review'] 
  },
  confidenceScore: { type: Number, required: true, min: 0, max: 1 },
  ambiguityScore: { type: Number, required: true, min: 0, max: 1 },
  matchedCriteria: [{
    criterionName: String,
    required: String,
    extracted: String,
    sourceDocument: String,
    sourcePage: String,
    confidence: Number,
    clauseReference: String,
    aiExplanation: String
  }],
  unmatchedCriteria: [{
    criterionName: String,
    required: String,
    found: String,
    sourceDocument: String,
    sourcePage: String,
    clauseReference: String,
    rejectionReason: String,
    evidenceTrace: [{
      document: String,
      page: String,
      extractedText: String,
      mismatchReason: String
    }]
  }],
  manualReviewItems: [{
    itemName: String,
    expected: String,
    systemExtracted: String,
    extractionConfidence: Number,
    reasonForLowConfidence: String,
    sourceDocument: String,
    sourcePage: String,
    pageExcerptReference: String,
    officerDecision: {
      decision: { type: String, enum: ['accepted', 'rejected', 'clarification_requested', null], default: null },
      justification: { type: String, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewedAt: { type: Date, default: null }
    }
  }],
  fraudFlags: [{
    flagType: String,
    description: String,
    affectedProposals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' }],
    severity: { type: String, enum: ['low', 'medium', 'high'] }
  }],
  mlAnalysisStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  mlAnalysisError: { type: String, default: null },
  auditHash: { type: String, default: null },
  analyzedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Analysis', analysisSchema);
