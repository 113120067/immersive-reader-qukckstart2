const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const ExcelJS = require('exceljs');

// Configure multer for memory storage (simpler for text processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (increased for PDF/DOCX)
  },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.txt', '.docx', '.pdf', '.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt, .docx, .pdf, .xlsx, and .xls files are allowed for vocab extraction'));
    }
  }
});

/**
 * Extract text from different file formats
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @returns {Promise<string>} - Extracted text
 */
async function extractText(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();
  
  switch (ext) {
    case '.txt':
      return buffer.toString('utf8');
    
    case '.docx':
      const result = await mammoth.extractRawText({ buffer: buffer });
      return result.value;
    
    case '.pdf':
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    
    case '.xlsx':
    case '.xls':
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      let allText = '';
      
      // Extract text from all sheets
      workbook.eachSheet((worksheet) => {
        worksheet.eachRow((row) => {
          const rowValues = row.values.slice(1); // Skip the first empty element
          allText += rowValues.join(',') + '\n';
        });
      });
      
      return allText;
    
    default:
      throw new Error('Unsupported file format');
  }
}

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
router.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }
    
    // Extract text based on file type
    const text = await extractText(req.file.buffer, req.file.originalname);
    
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
        error: 'File size exceeds limit (10MB)' 
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

module.exports = router;
