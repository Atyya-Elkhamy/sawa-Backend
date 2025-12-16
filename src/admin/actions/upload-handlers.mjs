import { ValidationError } from 'adminjs';
import fs from 'fs';
import path from 'path';
import logger from '../../config/logger.js';

export const validateUpload = (request, context) => {
  const { payload, method } = request;

  if (method !== 'post') return request;

  const errors = {};

  if (!payload.file) {
    errors.file = {
      message: 'File is required',
    };
  }

  if (Object.keys(errors).length) {
    throw new ValidationError(errors);
  }

  return request;
};

export const handleUpload = async (request, response, context, resource, property) => {
  const { record, currentAdmin } = context;

  if (request.method === 'get') {
    return {
      record: record.toJSON(currentAdmin),
      property,
    };
  }

  const { file } = request.payload;
  const __dirname = path.resolve();
  const recordId = record.id();

  // Define the upload directory and file path based on the property
  const uploadDir = path.join(__dirname, `/public/${resource}/${property}`, recordId);
  const filePath = path.join(uploadDir, file.name);

  try {
    // Ensure the upload directory exists
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`Created directory: ${uploadDir}`);

    // Move the file
    fs.renameSync(file.path, filePath);
    logger.info(`Moved file to: ${filePath}`);

    // Update the record's property
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
    record.params[property] = `${BACKEND_URL}public/gifts/${property}/${recordId}/${file.name}`;
    await record.save();
    logger.info(`Updated record ${recordId} with ${property}: ${record.params[property]}`);

    return {
      record: record.toJSON(currentAdmin),
      notice: {
        message: `${property.charAt(0).toUpperCase() + property.slice(1)} successfully uploaded`,
        type: 'success',
      },
    };
  } catch (error) {
    logger.error(`Error uploading ${property} for record ${recordId}: ${error.message}`);
    throw new ValidationError({ [property]: { message: error.message } });
  }
};

export const handleImageUpload = (request, response, context) => handleUpload(request, response, context, 'gifts', 'image');
export const handleFileUpload = (request, response, context) => handleUpload(request, response, context, 'gifts', 'file');
