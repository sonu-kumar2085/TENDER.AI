const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const limits = {
  fileSize: 10 * 1024 * 1024 // 10 MB per file
};

const upload = multer({
  storage,
  fileFilter,
  limits
});

const uploadSingle = upload.single('tenderPdf');
const uploadMultiple = upload.array('proposalDocuments', 10);

module.exports = {
  uploadSingle,
  uploadMultiple
};
