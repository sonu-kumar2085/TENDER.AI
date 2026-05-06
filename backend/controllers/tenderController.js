const Tender = require('../models/Tender');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const cloudinaryService = require('../services/cloudinaryService');
const mlService = require('../services/mlService');

const createTender = async (req, res, next) => {
  try {
    const { name, type, issuingAuthority, submissionDeadline, estimatedValue, description } = req.body;
    
    if (!req.file) {
      return sendError(res, 'Tender PDF is required', 400);
    }

    const uploadResult = await cloudinaryService.uploadPdf(req.file.buffer, 'tenderai/tenders', 'tender');

    const tender = new Tender({
      name,
      type,
      issuingAuthority,
      submissionDeadline,
      estimatedValue,
      description,
      tenderPdfUrl: uploadResult.secure_url,
      tenderPdfPublicId: uploadResult.public_id,
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
    const query = {};
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
    const tender = await Tender.findOne({ tenderId: req.params.tenderId });
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
      { tenderId: req.params.tenderId },
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

    const tender = await Tender.findOneAndUpdate(
      { tenderId: req.params.tenderId },
      { status: 'cancelled' },
      { new: true }
    );
    
    if (!tender) return sendError(res, 'Tender not found', 404);

    return sendSuccess(res, tender, 'Tender cancelled');
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
  deleteTender
};
