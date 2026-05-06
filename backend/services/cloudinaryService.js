const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const uploadPdf = (fileBuffer, folder, publicIdPrefix) => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const public_id = `${publicIdPrefix}_${timestamp}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: folder,
        public_id: public_id,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

const deletePdf = (publicId) => {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
};

module.exports = {
  uploadPdf,
  deletePdf,
};
