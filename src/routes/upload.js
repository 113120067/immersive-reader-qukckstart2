const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configure multer for memory storage (simpler for text processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed for vocab extraction'));
    }
  }
});

/**
 * Tokenize text into words
 * @param {string} text - The text to tokenize
 * @returns {Array<string>} - Deduplicated, sorted list of words
 */
function tokenizeText(text) {
  // Split on non-letter characters (Unicode aware)
  // Use Unicode property escapes for better international support
  const words = text.split(/[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]+/);
  
  const uniqueWords = new Set();
  
  for (const word of words) {
    const normalized = word.toLowerCase().trim();
    // Only include words with length > 1
    if (normalized.length > 1) {
      uniqueWords.add(normalized);
    }
  }
  
  // Return sorted array
  return Array.from(uniqueWords).sort();
}

/**
 * POST /api/upload
 * Upload a text file and extract vocabulary words
 * Expects multipart/form-data with field name 'file'
 */
router.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }
    
    // Read file content as UTF-8
    const text = req.file.buffer.toString('utf8');
    
    // Extract and tokenize words
    const words = tokenizeText(text);
    
    return res.json({
      success: true,
      filename: req.file.originalname,
      wordCount: words.length,
      words: words
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to process file: ' + error.message 
    });
  }
});

/**
 * Error handler for multer errors
 */
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: 'File size exceeds limit (5MB)' 
      });
    }
    return res.status(400).json({ 
      success: false, 
      error: 'File upload error: ' + err.message 
    });
  }
  // Pass other errors to next handler
  next(err);
});

module.exports = router;
