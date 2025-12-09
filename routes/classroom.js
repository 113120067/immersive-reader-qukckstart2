const express = require('express');
const router = express.Router();
const { createMemoryUpload, handleMulterError } = require('../src/config/multer-config');
const { extractTextFromBuffer, tokenizeText, FILE_FORMATS } = require('../src/utils/file-processor');
const classroomStore = require('../src/utils/classroom-store');

// Configure file upload
const upload = createMemoryUpload(FILE_FORMATS.getVocabFormats());

/**
 * GET /classroom - Classroom home page
 */
router.get('/', (req, res) => {
  res.render('classroom/index', { title: 'Classroom' });
});

/**
 * GET /classroom/create - Teacher create classroom page
 */
router.get('/create', (req, res) => {
  res.render('classroom/create', { title: 'Create Classroom' });
});

/**
 * POST /classroom/create - Create classroom and upload words
 */
router.post('/create', upload.single('file'), async (req, res) => {
  try {
    const { classroomName } = req.body;
    
    if (!classroomName) {
      return res.status(400).json({ success: false, error: 'Classroom name is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    // Extract text and tokenize
    const text = await extractTextFromBuffer(req.file.buffer, req.file.originalname);
    const words = tokenizeText(text);
    
    if (words.length === 0) {
      return res.status(400).json({ success: false, error: 'No words found in the file' });
    }
    
    // Create classroom
    const classroom = classroomStore.createClassroom(classroomName, words);
    
    res.json({
      success: true,
      code: classroom.code,
      name: classroom.name,
      wordCount: classroom.wordCount
    });
  } catch (error) {
    console.error('Error creating classroom:', error);
    res.status(500).json({ success: false, error: 'Failed to create classroom: ' + error.message });
  }
});

/**
 * GET /classroom/teacher/:code - Teacher control panel
 */
router.get('/teacher/:code', (req, res) => {
  const classroom = classroomStore.getClassroom(req.params.code);
  
  if (!classroom) {
    return res.render('error', { 
      message: 'Classroom not found',
      error: { status: 404, stack: 'The classroom code is invalid or has expired.' }
    });
  }
  
  res.render('classroom/teacher', { 
    title: 'Teacher Control Panel',
    classroom: classroom
  });
});

/**
 * GET /classroom/join - Student join page
 */
router.get('/join', (req, res) => {
  res.render('classroom/join', { title: 'Join Classroom' });
});

/**
 * POST /classroom/join - Student join classroom
 */
router.post('/join', (req, res) => {
  const { code, studentName } = req.body;
  
  if (!code || !studentName) {
    return res.status(400).json({ success: false, error: 'Code and name are required' });
  }
  
  const classroom = classroomStore.addStudent(code, studentName.trim());
  
  if (!classroom) {
    return res.status(404).json({ success: false, error: 'Classroom not found' });
  }
  
  res.json({
    success: true,
    code: code,
    studentName: studentName.trim()
  });
});

/**
 * GET /classroom/student/:code/:name - Student learning page
 */
router.get('/student/:code/:name', (req, res) => {
  const { code, name } = req.params;
  const classroom = classroomStore.getClassroom(code);
  
  if (!classroom) {
    return res.render('error', {
      message: 'Classroom not found',
      error: { status: 404, stack: 'The classroom code is invalid or has expired.' }
    });
  }
  
  res.render('classroom/student', {
    title: 'Learning Session',
    classroom: classroom,
    studentName: decodeURIComponent(name)
  });
});

/**
 * POST /classroom/api/session/start - Start learning session
 */
router.post('/api/session/start', (req, res) => {
  const { code, studentName } = req.body;
  
  const success = classroomStore.startSession(code, studentName);
  
  if (!success) {
    return res.status(400).json({ success: false, error: 'Failed to start session' });
  }
  
  res.json({ success: true });
});

/**
 * POST /classroom/api/session/end - End learning session
 */
router.post('/api/session/end', (req, res) => {
  const { code, studentName } = req.body;
  
  const duration = classroomStore.endSession(code, studentName);
  
  if (duration === null) {
    return res.status(400).json({ success: false, error: 'Failed to end session' });
  }
  
  res.json({ success: true, duration: duration });
});

/**
 * GET /classroom/api/leaderboard/:code - Get classroom leaderboard
 */
router.get('/api/leaderboard/:code', (req, res) => {
  const leaderboard = classroomStore.getLeaderboard(req.params.code);
  
  if (!leaderboard) {
    return res.status(404).json({ success: false, error: 'Classroom not found' });
  }
  
  res.json({ success: true, leaderboard: leaderboard });
});

/**
 * GET /classroom/api/status/:code/:name - Get student status
 */
router.get('/api/status/:code/:name', (req, res) => {
  const { code, name } = req.params;
  const status = classroomStore.getStudentStatus(code, decodeURIComponent(name));
  
  if (!status) {
    return res.status(404).json({ success: false, error: 'Student or classroom not found' });
  }
  
  res.json({ success: true, status: status });
});

// Error handler
router.use(handleMulterError);

module.exports = router;
