const express = require('express');
const router = express.Router();
const { readStore, appendWords } = require('../utils/file-store');

/**
 * POST /api/vocab/save
 * Save selected words to the vocab store
 * Body: { words: ["word1", "word2", ...], source: "filename" }
 */
router.post('/api/vocab/save', async (req, res) => {
  try {
    const { words, source } = req.body;
    
    if (!words || !Array.isArray(words)) {
      return res.status(400).json({ 
        success: false, 
        error: 'words array is required' 
      });
    }
    
    if (!source) {
      return res.status(400).json({ 
        success: false, 
        error: 'source is required' 
      });
    }
    
    const result = await appendWords(words, source);
    
    return res.json({
      success: true,
      saved: result.added,
      total: result.total,
      newWords: result.newWords
    });
  } catch (error) {
    console.error('Error saving vocab:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to save vocabulary: ' + error.message 
    });
  }
});

/**
 * GET /api/vocab/list
 * Retrieve all saved words from the vocab store
 */
router.get('/api/vocab/list', async (req, res) => {
  try {
    const store = await readStore();
    
    return res.json({
      success: true,
      words: store.words,
      count: store.words.length
    });
  } catch (error) {
    console.error('Error reading vocab:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to read vocabulary: ' + error.message 
    });
  }
});

module.exports = router;
