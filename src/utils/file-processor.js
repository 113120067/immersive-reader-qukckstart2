/**
 * Shared file processing utilities
 * Centralizes file format handling to ensure consistency across the application
 */

const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const ExcelJS = require('exceljs');
const sanitizeHtml = require('sanitize-html');
const fs = require('fs');
const path = require('path');

/**
 * Supported file formats configuration
 */
const FILE_FORMATS = {
  TEXT: ['.txt'],
  DOCUMENT: ['.docx'],
  PDF: ['.pdf'],
  SPREADSHEET: ['.xlsx', '.xls'],
  HTML: ['.html', '.htm'],
  
  // Get all supported formats
  getAllFormats() {
    return [
      ...this.TEXT,
      ...this.DOCUMENT,
      ...this.PDF,
      ...this.SPREADSHEET,
      ...this.HTML
    ];
  },
  
  // Get formats for vocabulary extraction
  getVocabFormats() {
    return [
      ...this.TEXT,
      ...this.DOCUMENT,
      ...this.PDF,
      ...this.SPREADSHEET
    ];
  },
  
  // Get formats for document reading
  getDocumentFormats() {
    return [
      ...this.TEXT,
      ...this.DOCUMENT,
      ...this.PDF,
      ...this.HTML
    ];
  }
};

/**
 * Extract text from buffer based on file type
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @param {Object} options - Processing options
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromBuffer(buffer, filename, options = {}) {
  const ext = path.extname(filename).toLowerCase();
  const preserveHtml = options.preserveHtml || false;
  
  switch (ext) {
    case '.txt':
      return buffer.toString('utf8');
    
    case '.docx':
      const docResult = await mammoth.extractRawText({ buffer: buffer });
      return docResult.value;
    
    case '.pdf':
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    
    case '.xlsx':
    case '.xls':
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      let allText = '';
      
      workbook.eachSheet((worksheet) => {
        worksheet.eachRow((row) => {
          const rowValues = row.values.slice(1); // Skip the first empty element
          allText += rowValues.join(',') + '\n';
        });
      });
      
      return allText;
    
    default:
      throw new Error(`Unsupported file format: ${ext}`);
  }
}

/**
 * Extract text from file path (for disk-stored files)
 * @param {string} filePath - Path to file
 * @param {Object} options - Processing options
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromFile(filePath, options = {}) {
  const ext = path.extname(filePath).toLowerCase();
  const preserveHtml = options.preserveHtml || false;
  
  switch (ext) {
    case '.txt':
      const text = fs.readFileSync(filePath, 'utf8');
      return text;
    
    case '.docx':
      if (preserveHtml) {
        const result = await mammoth.convertToHtml({ path: filePath });
        return sanitizeHtml(result.value, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3']),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes
          }
        });
      } else {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
      }
    
    case '.pdf':
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text;
    
    case '.html':
    case '.htm':
      const html = fs.readFileSync(filePath, 'utf8');
      if (preserveHtml) {
        return sanitizeHtml(html, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3']),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes
          }
        });
      } else {
        // Strip HTML tags for plain text
        return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
      }
    
    case '.xlsx':
    case '.xls':
      const workbook2 = new ExcelJS.Workbook();
      await workbook2.xlsx.readFile(filePath);
      let allText = '';
      
      workbook2.eachSheet((worksheet) => {
        worksheet.eachRow((row) => {
          const rowValues = row.values.slice(1); // Skip the first empty element
          allText += rowValues.join(',') + '\n';
        });
      });
      
      return allText;
    
    default:
      throw new Error(`Unsupported file format: ${ext}`);
  }
}

/**
 * Format text as HTML paragraphs
 * @param {string} text - Plain text
 * @returns {string} - HTML formatted text
 */
function formatAsHtml(text) {
  const lines = text.split('\n').filter(line => line.trim());
  return lines.map(line => `<p>${sanitizeHtml(line)}</p>`).join('');
}

/**
 * Tokenize text into words
 * @param {string} text - The text to tokenize
 * @returns {Array<string>} - Deduplicated, sorted list of words
 */
function tokenizeText(text) {
  // Split on non-letter characters (Unicode aware)
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

module.exports = {
  FILE_FORMATS,
  extractTextFromBuffer,
  extractTextFromFile,
  formatAsHtml,
  tokenizeText
};
