const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const sanitizeHtml = require('sanitize-html');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'tmp/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedExtensions = ['.txt', '.html', '.htm', '.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt, .html, .htm, .pdf, and .docx files are allowed'));
    }
  }
});

// Render upload page
router.get('/upload', (req, res) => {
  res.render('upload', { title: 'Upload Document' });
});

// Handle file upload
// TODO: Add rate limiting for production use (e.g., express-rate-limit)
// TODO: Add authentication/authorization middleware
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let content = '';

    try {
      if (ext === '.docx') {
        // Parse .docx file with mammoth
        const result = await mammoth.convertToHtml({ path: filePath });
        content = sanitizeHtml(result.value, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3']),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes
          }
        });
      } else if (ext === '.pdf') {
        // Parse PDF file with pdf-parse
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        // Wrap each line in <p> tags
        const lines = data.text.split('\n').filter(line => line.trim());
        content = lines.map(line => `<p>${sanitizeHtml(line)}</p>`).join('');
      } else if (ext === '.txt') {
        // Read .txt file
        const text = fs.readFileSync(filePath, 'utf8');
        const lines = text.split('\n').filter(line => line.trim());
        content = lines.map(line => `<p>${sanitizeHtml(line)}</p>`).join('');
      } else if (ext === '.html' || ext === '.htm') {
        // Read and sanitize HTML file
        const html = fs.readFileSync(filePath, 'utf8');
        content = sanitizeHtml(html, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3']),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes
          }
        });
      }

      // Delete temporary file after processing
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });

      return res.json({ success: true, content: content });
    } catch (parseError) {
      // Delete file in case of parsing error
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
      console.error('Error parsing file:', parseError);
      return res.status(500).json({ success: false, error: 'Error parsing file: ' + parseError.message });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ success: false, error: 'Upload failed: ' + error.message });
  }
});

module.exports = router;
