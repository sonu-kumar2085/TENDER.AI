const Analysis = require('../models/Analysis');
const Proposal = require('../models/Proposal');
const Tender = require('../models/Tender');
const mlService = require('../services/mlService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const getAnalysisByProposalId = async (req, res, next) => {
  try {
    const proposal = await Proposal.findOne({ proposalId: req.params.proposalId });
    if (!proposal) return sendError(res, 'Proposal not found', 404);

    const analysis = await Analysis.findOne({ proposal: proposal._id });
    if (!analysis) return sendError(res, 'Analysis not found', 404);

    return sendSuccess(res, analysis);
  } catch (error) {
    next(error);
  }
};

const getFraudReportByTenderId = async (req, res, next) => {
  try {
    const tender = await Tender.findOne({ tenderId: req.params.tenderId });
    if (!tender) return sendError(res, 'Tender not found', 404);

    const analyses = await Analysis.find({ tender: tender._id })
      .populate({
        path: 'fraudFlags.affectedProposals',
        select: 'companyName proposalId'
      });

    const groupedFlags = {};

    analyses.forEach(analysis => {
      if (analysis.fraudFlags && analysis.fraudFlags.length > 0) {
        analysis.fraudFlags.forEach(flag => {
          if (!groupedFlags[flag.flagType]) {
            groupedFlags[flag.flagType] = {
              flagType: flag.flagType,
              severity: flag.severity,
              description: flag.description,
              occurrences: 0,
              affectedProposals: new Map() // to ensure uniqueness
            };
          }
          groupedFlags[flag.flagType].occurrences += 1;
          
          if (flag.affectedProposals) {
             flag.affectedProposals.forEach(p => {
               groupedFlags[flag.flagType].affectedProposals.set(p._id.toString(), p);
             });
          }
        });
      }
    });

    const report = Object.values(groupedFlags).map(group => ({
      ...group,
      affectedProposals: Array.from(group.affectedProposals.values())
    }));

    return sendSuccess(res, report, 'Fraud report generated successfully');
  } catch (error) {
    next(error);
  }
};

const retryAnalysis = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Admin privileges required', 403);
    }

    const proposal = await Proposal.findOne({ proposalId: req.params.proposalId });
    if (!proposal) return sendError(res, 'Proposal not found', 404);

    const analysis = await Analysis.findOne({ proposal: proposal._id });
    if (analysis && analysis.mlAnalysisStatus !== 'failed') {
       return sendError(res, 'Analysis is not in failed state', 400);
    }

    mlService.analyzeProposal(proposal._id.toString()).catch(console.error);

    return sendSuccess(res, null, 'Analysis retry initiated');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalysisByProposalId,
  getFraudReportByTenderId,
  retryAnalysis
};
