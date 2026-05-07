const Tender = require('../models/Tender');
const Proposal = require('../models/Proposal');
const Analysis = require('../models/Analysis');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const cloudinaryService = require('../services/cloudinaryService');
const mlService = require('../services/mlService');

const createTender = async (req, res, next) => {
  try {
    const { name, type, issuingAuthority, estimatedValue, description } = req.body;
    
    if (!req.file) {
      return sendError(res, 'Tender PDF is required', 400);
    }

    const uploadResult = await cloudinaryService.uploadPdf(req.file.buffer, 'tenderai/tenders', 'tender');

    const tender = new Tender({
      name,
      type,
      issuingAuthority,
      estimatedValue,
      description,
      tenderPdfUrl: uploadResult.secure_url,
      tenderPdfPublicId: uploadResult.public_id,
      department: req.user.department,
      createdBy: req.user.userId,
      mlExtractionStatus: 'pending'
    });

    await tender.save();

    mlService.extractTenderData(tender.tenderPdfUrl, tender.tenderId).catch(console.error);

    return sendSuccess(res, tender, 'Tender created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getTenders = async (req, res, next) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const query = { department: req.user.department };
    if (type) query.type = type;
    if (status) query.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [tenders, totalCount] = await Promise.all([
      Tender.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Tender.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return sendSuccess(res, tenders, 'Tenders fetched successfully', 200, {
      totalCount,
      totalPages,
      currentPage: pageNum,
      limit: limitNum
    });
  } catch (error) {
    next(error);
  }
};

const getTenderCategories = async (req, res, next) => {
  try {
    const categories = [
      'Medical & Healthcare', 'Food & Catering', 'Construction & Infrastructure', 
      'Technology & IT', 'Technical & Engineering', 'Finance & Consulting'
    ];

    const agg = await Tender.aggregate([
      { $match: { department: req.user.department } },
      {
        $group: {
          _id: '$type',
          totalCount: { $sum: 1 },
          openCount: {
            $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = categories.map(cat => {
      const found = agg.find(a => a._id === cat);
      return {
        type: cat,
        totalCount: found ? found.totalCount : 0,
        openCount: found ? found.openCount : 0
      };
    });

    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const getTenderById = async (req, res, next) => {
  try {
    const tender = await Tender.findOne({ tenderId: req.params.tenderId, department: req.user.department });
    if (!tender) return sendError(res, 'Tender not found', 404);
    
    return sendSuccess(res, tender);
  } catch (error) {
    next(error);
  }
};

const updateTenderStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Admin privileges required', 403);
    }
    
    const { status } = req.body;
    const tender = await Tender.findOneAndUpdate(
      { tenderId: req.params.tenderId, department: req.user.department },
      { status },
      { new: true, runValidators: true }
    );
    
    if (!tender) return sendError(res, 'Tender not found', 404);

    return sendSuccess(res, tender, 'Status updated');
  } catch (error) {
    next(error);
  }
};

const deleteTender = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Admin privileges required', 403);
    }

    const tender = await Tender.findOne({
      tenderId: req.params.tenderId,
      department: req.user.department
    });

    if (!tender) return sendError(res, 'Tender not found', 404);

    // ── Cascade: find all proposals for this tender ──────────────────────
    const proposals = await Proposal.find({ tender: tender._id }).select('_id analysisResult');

    // Delete all Analysis records linked to those proposals
    const analysisIds = proposals
      .map(p => p.analysisResult)
      .filter(Boolean);

    if (analysisIds.length > 0) {
      await Analysis.deleteMany({ _id: { $in: analysisIds } });
    }

    // Delete all proposals
    await Proposal.deleteMany({ tender: tender._id });

    // Finally delete the tender itself
    await Tender.findByIdAndDelete(tender._id);

    return sendSuccess(res, { tenderId: tender.tenderId }, 'Tender and all associated proposals deleted successfully');
  } catch (error) {
    next(error);
  }
};

const retryTenderExtraction = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Admin privileges required', 403);
    }

    const tender = await Tender.findOne({ tenderId: req.params.tenderId, department: req.user.department });
    if (!tender) return sendError(res, 'Tender not found', 404);

    if (!tender.tenderPdfUrl) {
      return sendError(res, 'Tender has no PDF to extract from', 400);
    }

    if (tender.mlExtractionStatus === 'processing') {
      return sendError(res, 'Extraction already in progress', 400);
    }

    // Fire-and-forget — response returns immediately
    mlService.extractTenderData(tender.tenderPdfUrl, tender.tenderId).catch(console.error);

    return sendSuccess(res, { tenderId: tender.tenderId, mlExtractionStatus: 'processing' }, 'ML extraction re-triggered');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTender,
  getTenders,
  getTenderCategories,
  getTenderById,
  updateTenderStatus,
  deleteTender,
  retryTenderExtraction
};
