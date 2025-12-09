/**
 * Shared Multer configuration
 * Centralizes file upload settings to ensure consistency
 */

const multer = require('multer');
const path = require('path');

// File upload limits
const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

/**
 * Create multer configuration for memory storage
 * @param {Array<string>} allowedExtensions - Array of allowed file extensions
 * @param {string} errorMessage - Custom error message for invalid files
 * @returns {multer.Multer} - Configured multer instance
 */
function createMemoryUpload(allowedExtensions, errorMessage) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: FILE_SIZE_LIMIT
    },
    fileFilter: function (req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(errorMessage || `Only ${allowedExtensions.join(', ')} files are allowed`));
      }
    }
  });
}

/**
 * Create multer configuration for disk storage
 * @param {string} destination - Upload destination directory
 * @param {Array<string>} allowedExtensions - Array of allowed file extensions
 * @param {string} errorMessage - Custom error message for invalid files
 * @returns {multer.Multer} - Configured multer instance
 */
function createDiskUpload(destination, allowedExtensions, errorMessage) {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, destination);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });

  return multer({
    storage: storage,
    limits: {
      fileSize: FILE_SIZE_LIMIT
    },
    fileFilter: function (req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(errorMessage || `Only ${allowedExtensions.join(', ')} files are allowed`));
      }
    }
  });
}

/**
 * Error handler middleware for multer errors
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: `File size exceeds limit (${FILE_SIZE_LIMIT / (1024 * 1024)}MB)`
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error: ' + err.message
    });
  }
  // Pass other errors to next handler
  next(err);
}

module.exports = {
  FILE_SIZE_LIMIT,
  createMemoryUpload,
  createDiskUpload,
  handleMulterError
};
