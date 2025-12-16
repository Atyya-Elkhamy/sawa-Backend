// admin/pages/upload.handler.mjs
import AdminJS from 'adminjs';
import uploadFeature from '@adminjs/upload';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import logger from '../../config/logger.js';
import upload from '../../middlewares/upload.js';

// Configure AdminJS upload feature
const uploadOptions = {
  provider: {
    local: {
      bucket: path.join(process.cwd(), 'uploads'),
    },
  },
  properties: {
    key: 'file',
    mimeType: 'mimeType',
    size: 'size',
    filename: 'filename',
  },
  validation: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
    maxSize: 5 * 1024 * 1024, // 5MB limit
  },
  uploadPath: (record, filename) => `${uuidv4()}-${filename}`,
};

// File upload handler using AdminJS
const uploadHandler = async (request, response) => {
  try {
    const uploadResult = await upload.single('file')(request, response);
    if (!uploadResult) {
      return {
        notice: {
          message: 'No file uploaded',
          type: 'error',
        },
      };
    }

    const baseUrl = process.env.BACKEND_URL || `http://${request.headers.host}`;
    const fileUrl = `${baseUrl}uploads/${key}`;

    logger.info(`File uploaded successfully: ${fileUrl}`);

    return {
      url: fileUrl,
      filename,
      size,
      mimetype: mimeType,
      notice: {
        message: 'File uploaded successfully',
        type: 'success',
      },
    };
  } catch (err) {
    logger.error(`File upload error: ${err.message}`);
    return {
      notice: {
        message: `Upload failed: ${err.message}`,
        type: 'error',
      },
    };
  }
};

export default uploadHandler;
