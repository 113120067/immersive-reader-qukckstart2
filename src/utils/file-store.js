const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const VOCAB_STORE_PATH = path.join(DATA_DIR, 'vocab-store.json');

/**
 * Ensure data directory exists
 */
async function ensureDataDirectory() {
  try {
    await fs.access(DATA_DIR);
  } catch (error) {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * Read the vocab store from file
 * @returns {Promise<Object>} The vocab store object with structure: { words: [{word, timestamp}] }
 */
async function readStore() {
  await ensureDataDirectory();
  try {
    const data = await fs.readFile(VOCAB_STORE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty structure
    if (error.code === 'ENOENT') {
      return { words: [] };
    }
    throw error;
  }
}

/**
 * Write the vocab store to file atomically
 * @param {Object} data - The data to write
 */
async function writeStore(data) {
  await ensureDataDirectory();
  const tempPath = VOCAB_STORE_PATH + '.tmp';
  try {
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tempPath, VOCAB_STORE_PATH);
  } catch (error) {
    // Clean up temp file if rename fails
    try {
      await fs.unlink(tempPath);
    } catch (unlinkError) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Append words to the vocab store, avoiding duplicates
 * @param {Array<string>} words - Array of words to add
 * @param {string} source - Source filename or identifier (not stored, kept for API compatibility)
 * @returns {Promise<Object>} Object with added words and total count
 */
async function appendWords(words, source) {
  const store = await readStore();
  
  // Create a set of existing words for quick lookup
  const existingWords = new Set(store.words.map(item => item.word.toLowerCase()));
  
  const newWords = [];
  const timestamp = new Date().toISOString();
  
  for (const word of words) {
    const normalizedWord = word.toLowerCase();
    if (!existingWords.has(normalizedWord)) {
      existingWords.add(normalizedWord);
      newWords.push({
        word: word,
        timestamp: timestamp
      });
    }
  }
  
  store.words.push(...newWords);
  await writeStore(store);
  
  return {
    added: newWords.length,
    total: store.words.length,
    newWords: newWords.map(item => item.word)
  };
}

module.exports = {
  readStore,
  writeStore,
  appendWords,
  ensureDataDirectory
};
