const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
// Configure AWS SDK

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});

// Set up file filter to only accept image files
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp|svg|gif|tiff|bmp|svga|mp4|json|m4a/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  console.log('file type ', `${file.mimetype} file name ${file.originalname} file ext ${path.extname(file.originalname)}`);

  // Special case for .svga files
  if (path.extname(file.originalname).toLowerCase() === '.svga' && file.mimetype === 'application/octet-stream') {
    return cb(null, true);
  }
  if (
    path.extname(file.originalname).toLowerCase() === '.m4a' &&
    (file.mimetype === 'audio/x-m4a' || file.mimetype === 'audio/m4a' || file.mimetype === 'audio/mp4')
  ) {
    return cb(null, true);
  }

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(
    new Error(
      `File upload only supports the following filetypes - ${filetypes} file type ${file.mimetype} - file name ${file.originalname
      } - file ext ${path.extname(file.originalname)}`
    )
  );
};



// Configure Multer with multer-s3
// const upload = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: process.env.S3_BUCKET_NAME,

//     // acl: 'public-read',
//     contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically set Content-Type
//     key: function (req, file, cb) {
//       const filename = `${uuidv4()}-.${(file.originalname).split('.').pop()}`;
//       req.uploadedFileName = filename; // Store the filename in the request object
//       cb(null, filename);
//     }
//   }),
//   limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
//   fileFilter: fileFilter
// });

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: (req, file, cb) => {
      const filename = `${uuidv4()}-.${file.originalname.split('.').pop()}`;
      req.uploadedFileName = filename;
      cb(null, filename);
    },
    contentType: (req, file, cb) => {
      const ext = (file.originalname.split('.').pop() || '').toLowerCase();
      let type = file.mimetype;

      if (ext === 'm4a') type = 'audio/mp4';
      if (ext === 'aac') type = 'audio/aac';
      if (ext === 'mp3') type = 'audio/mpeg';
      if (ext === 'wav') type = 'audio/wav';

      cb(null, type);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
});


module.exports = upload;

