const Proposal = require('../models/Proposal');
const Tender = require('../models/Tender');
const Analysis = require('../models/Analysis');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const cloudinaryService = require('../services/cloudinaryService');
const mlService = require('../services/mlService');

const createProposal = async (req, res, next) => {
  try {
    const { tenderId } = req.params;
    const { companyName, companyRegistrationNo, contactPersonName, contactEmail, contactPhone, bidValue, isMsmeRegistered } = req.body;

    const tender = await Tender.findOne({ tenderId });
    if (!tender) return sendError(res, 'Tender not found', 404);
    
    if (tender.status !== 'open') return sendError(res, 'Tender is not open', 400);
    if (new Date(tender.submissionDeadline) < new Date()) {
      return sendError(res, 'Tender deadline has passed', 400);
    }

    if (!req.files || req.files.length === 0) {
      return sendError(res, 'Proposal documents are required', 400);
    }

    const proposalDocuments = [];
    for (const file of req.files) {
      const docType = file.originalname.includes('iso') ? 'iso_cert' : 
                      file.originalname.includes('gst') ? 'gst' : 
                      file.originalname.includes('emd') ? 'emd' : 'other';
                      
      const uploadResult = await cloudinaryService.uploadPdf(
        file.buffer, 
        `tenderai/proposals/${tenderId}`, 
        'proposal_doc'
      );
      
      proposalDocuments.push({
        fileName: file.originalname,
        documentType: docType,
        cloudinaryUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id
      });
    }

    const proposal = new Proposal({
      tender: tender._id,
      companyName,
      companyRegistrationNo,
      contactPersonName,
      contactEmail,
      contactPhone,
      bidValue,
      isMsmeRegistered: isMsmeRegistered === 'true' || isMsmeRegistered === true,
      proposalDocuments,
      mlExtractionStatus: 'pending'
    });

    await proposal.save();

    mlService.extractProposalData(proposal.proposalDocuments, proposal._id.toString(), tender.tenderId).catch(console.error);

    return sendSuccess(res, proposal, 'Proposal submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getProposalsByTender = async (req, res, next) => {
  try {
    const tender = await Tender.findOne({ tenderId: req.params.tenderId });
    if (!tender) return sendError(res, 'Tender not found', 404);

    const proposals = await Proposal.find({ tender: tender._id })
      .populate('analysisResult', 'overallResult confidenceScore ambiguityScore fraudFlags')
      .sort({ rank: 1, submissionTime: 1 });

    return sendSuccess(res, proposals);
  } catch (error) {
    next(error);
  }
};

const getProposalById = async (req, res, next) => {
  try {
    const proposal = await Proposal.findOne({ proposalId: req.params.proposalId })
      .populate('analysisResult')
      .populate('tender', 'tenderId name type issuingAuthority status estimatedValue submissionDeadline');
      
    if (!proposal) return sendError(res, 'Proposal not found', 404);

    return sendSuccess(res, proposal);
  } catch (error) {
    next(error);
  }
};

const makeDecision = async (req, res, next) => {
  try {
    const { decision, remarks } = req.body;
    
    if (!remarks || remarks.length < 30) {
      return sendError(res, 'Remarks must be at least 30 characters', 400);
    }

    const proposal = await Proposal.findOne({ proposalId: req.params.proposalId });
    if (!proposal) return sendError(res, 'Proposal not found', 404);

    if (proposal.officerDecision && proposal.officerDecision.decision) {
      return sendError(res, 'Final decision already recorded. This action is irreversible.', 403);
    }

    if (proposal.analysisResult) {
      const analysis = await Analysis.findById(proposal.analysisResult);
      if (analysis && analysis.manualReviewItems && analysis.manualReviewItems.length > 0) {
        const unresolved = analysis.manualReviewItems.filter(item => !item.officerDecision || !item.officerDecision.decision);
        if (unresolved.length > 0) {
          const names = unresolved.map(u => u.itemName).join(', ');
          return sendError(res, `Unresolved manual review items: ${names}`, 400);
        }
      }
    }

    proposal.officerDecision = {
      decision,
      remarks,
      decidedBy: req.user.userId,
      decidedAt: new Date()
    };

    await proposal.save();

    return sendSuccess(res, proposal, 'Final decision recorded');
  } catch (error) {
    next(error);
  }
};

const reviewItem = async (req, res, next) => {
  try {
    const { itemIndex, decision, justification } = req.body;
    
    if (!justification || justification.length < 20) {
      return sendError(res, 'Justification must be at least 20 characters', 400);
    }

    const proposal = await Proposal.findOne({ proposalId: req.params.proposalId });
    if (!proposal) return sendError(res, 'Proposal not found', 404);

    if (!proposal.analysisResult) {
      return sendError(res, 'No analysis result found for this proposal', 404);
    }

    const analysis = await Analysis.findById(proposal.analysisResult);
    
    if (itemIndex < 0 || itemIndex >= analysis.manualReviewItems.length) {
      return sendError(res, 'Invalid item index', 400);
    }

    analysis.manualReviewItems[itemIndex].officerDecision = {
      decision,
      justification,
      reviewedBy: req.user.userId,
      reviewedAt: new Date()
    };

    await analysis.save();

    return sendSuccess(res, analysis, 'Manual review item updated');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProposal,
  getProposalsByTender,
  getProposalById,
  makeDecision,
  reviewItem
};
