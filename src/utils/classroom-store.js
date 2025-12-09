/**
 * Classroom data store (in-memory)
 * Manages classroom sessions and student progress
 */

// Store classrooms in memory (24 hour expiry)
const classrooms = new Map();

/**
 * Generate a random 4-digit classroom code
 * @returns {string} - 4-digit code
 */
function generateClassroomCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (classrooms.has(code));
  return code;
}

/**
 * Create a new classroom
 * @param {string} name - Classroom name
 * @param {Array<string>} words - List of words to learn
 * @returns {Object} - Created classroom object
 */
function createClassroom(name, words) {
  const code = generateClassroomCode();
  const classroom = {
    code: code,
    name: name,
    words: words,
    wordCount: words.length,
    createdAt: new Date().toISOString(),
    students: []
  };
  
  classrooms.set(code, classroom);
  
  // Auto-delete after 24 hours
  setTimeout(() => {
    classrooms.delete(code);
  }, 24 * 60 * 60 * 1000);
  
  return classroom;
}

/**
 * Get classroom by code
 * @param {string} code - Classroom code
 * @returns {Object|null} - Classroom object or null
 */
function getClassroom(code) {
  return classrooms.get(code) || null;
}

/**
 * Add student to classroom
 * @param {string} code - Classroom code
 * @param {string} studentName - Student name
 * @returns {Object|null} - Updated classroom or null
 */
function addStudent(code, studentName) {
  const classroom = classrooms.get(code);
  if (!classroom) return null;
  
  // Check if student already exists
  const existingStudent = classroom.students.find(s => s.name === studentName);
  if (existingStudent) {
    return classroom; // Student already in classroom
  }
  
  classroom.students.push({
    name: studentName,
    totalTime: 0,  // seconds
    sessionStart: null,
    lastActive: new Date().toISOString()
    // 每個學生預設擁有一份該 classroom 的單字清單（個人化複本）
    ,words: Array.isArray(classroom.words) ? classroom.words.slice() : []
  });
  
  return classroom;
}

/**
 * Start learning session for a student
 * @param {string} code - Classroom code
 * @param {string} studentName - Student name
 * @returns {boolean} - Success status
 */
function startSession(code, studentName) {
  const classroom = classrooms.get(code);
  if (!classroom) return false;
  
  const student = classroom.students.find(s => s.name === studentName);
  if (!student) return false;
  
  student.sessionStart = Date.now();
  student.lastActive = new Date().toISOString();
  
  return true;
}

/**
 * End learning session for a student
 * @param {string} code - Classroom code
 * @param {string} studentName - Student name
 * @returns {number|null} - Session duration in seconds or null
 */
function endSession(code, studentName) {
  const classroom = classrooms.get(code);
  if (!classroom) return null;
  
  const student = classroom.students.find(s => s.name === studentName);
  if (!student || !student.sessionStart) return null;
  
  const duration = Math.floor((Date.now() - student.sessionStart) / 1000);
  student.totalTime += duration;
  student.sessionStart = null;
  student.lastActive = new Date().toISOString();
  
  return duration;
}

/**
 * Get leaderboard for a classroom
 * @param {string} code - Classroom code
 * @returns {Array|null} - Sorted student list or null
 */
function getLeaderboard(code) {
  const classroom = classrooms.get(code);
  if (!classroom) return null;
  
  // Sort by total time (descending)
  const leaderboard = [...classroom.students]
    .sort((a, b) => b.totalTime - a.totalTime)
    .map((student, index) => ({
      rank: index + 1,
      name: student.name,
      totalTime: student.totalTime,
      totalMinutes: Math.floor(student.totalTime / 60),
      totalSeconds: student.totalTime % 60,
      isActive: student.sessionStart !== null,
      lastActive: student.lastActive
    }));
  
  return leaderboard;
}

/**
 * Get student's current status
 * @param {string} code - Classroom code
 * @param {string} studentName - Student name
 * @returns {Object|null} - Student status or null
 */
function getStudentStatus(code, studentName) {
  const classroom = classrooms.get(code);
  if (!classroom) return null;
  
  const student = classroom.students.find(s => s.name === studentName);
  if (!student) return null;
  
  const leaderboard = getLeaderboard(code);
  const myRank = leaderboard.find(s => s.name === studentName);
  
  return {
    name: student.name,
    totalTime: student.totalTime,
    isActive: student.sessionStart !== null,
    rank: myRank ? myRank.rank : null,
    totalStudents: classroom.students.length
  };
}

/**
 * Get all active classrooms (for admin/debug purposes)
 * @returns {Array} - List of classroom codes
 */
function getAllClassrooms() {
  return Array.from(classrooms.keys());
}

/**
 * --- Word swap and remove with voting support ---
 * We maintain pending remove requests per classroom. Each request contains votes
 * and is executed when approval threshold met (majority of students by default).
 */

// Map: code -> Map(requestId -> requestObject)
const removeRequests = new Map();

function generateRequestId() {
  return Math.random().toString(36).substring(2, 9);
}

function ensureRemoveRequestsMap(code) {
  if (!removeRequests.has(code)) removeRequests.set(code, new Map());
  return removeRequests.get(code);
}

/**
 * Swap two words between students' personal lists
 */
function swapWords(code, studentA, wordA, studentB, wordB) {
  const classroom = classrooms.get(code);
  if (!classroom) return { success: false, error: 'Classroom not found' };

  const a = classroom.students.find(s => s.name === studentA);
  const b = classroom.students.find(s => s.name === studentB);
  if (!a || !b) return { success: false, error: 'One or both students not found' };

  // Ensure personal word lists exist
  a.words = Array.isArray(a.words) ? a.words : [];
  b.words = Array.isArray(b.words) ? b.words : [];

  const aIndex = a.words.indexOf(wordA);
  const bIndex = b.words.indexOf(wordB);
  if (aIndex === -1) return { success: false, error: `${studentA} does not own the word` };
  if (bIndex === -1) return { success: false, error: `${studentB} does not own the word` };

  // Swap
  a.words[aIndex] = wordB;
  b.words[bIndex] = wordA;

  return { success: true };
}

/**
 * Create a remove-word request (requires votes to execute)
 */
function requestRemoveWord(code, targetStudent, word, requestedBy) {
  const classroom = classrooms.get(code);
  if (!classroom) return { success: false, error: 'Classroom not found' };

  const target = classroom.students.find(s => s.name === targetStudent);
  if (!target) return { success: false, error: 'Target student not found' };

  if (!Array.isArray(target.words) || target.words.indexOf(word) === -1) {
    return { success: false, error: 'Target student does not have that word' };
  }

  const requests = ensureRemoveRequestsMap(code);
  const id = generateRequestId();
  const req = {
    id,
    targetStudent,
    word,
    requestedBy,
    votes: new Set(), // voters who approved
    createdAt: Date.now(),
    status: 'pending'
  };

  // requester automatically votes yes
  req.votes.add(requestedBy);

  requests.set(id, req);

  // After creating, check if threshold met immediately
  checkAndExecuteRemove(code, id);

  return { success: true, requestId: id };
}

/**
 * Vote to approve a pending remove request
 */
function voteRemoveRequest(code, requestId, voterName) {
  const classroom = classrooms.get(code);
  if (!classroom) return { success: false, error: 'Classroom not found' };

  const requests = ensureRemoveRequestsMap(code);
  const req = requests.get(requestId);
  if (!req) return { success: false, error: 'Request not found' };
  if (req.status !== 'pending') return { success: false, error: 'Request already processed' };

  // Prevent duplicate votes
  if (req.votes.has(voterName)) return { success: false, error: 'Already voted' };

  req.votes.add(voterName);

  // Check threshold
  checkAndExecuteRemove(code, requestId);

  return { success: true, votes: Array.from(req.votes) };
}

/**
 * Check if a request has reached approval threshold and execute removal if so
 */
function checkAndExecuteRemove(code, requestId) {
  const classroom = classrooms.get(code);
  if (!classroom) return false;
  const requests = ensureRemoveRequestsMap(code);
  const req = requests.get(requestId);
  if (!req || req.status !== 'pending') return false;

  const totalStudents = classroom.students.length;
  const approvals = req.votes.size;
  const threshold = Math.ceil(totalStudents / 2); // majority

  if (approvals >= threshold) {
    // perform removal
    const target = classroom.students.find(s => s.name === req.targetStudent);
    if (!target || !Array.isArray(target.words)) {
      req.status = 'failed';
      return false;
    }

    const idx = target.words.indexOf(req.word);
    if (idx === -1) {
      req.status = 'failed';
      return false;
    }

    target.words.splice(idx, 1);
    req.status = 'executed';
    req.executedAt = Date.now();
    return true;
  }

  return false;
}

function getRemoveRequest(code, requestId) {
  const requests = removeRequests.get(code);
  if (!requests) return null;
  const req = requests.get(requestId);
  if (!req) return null;
  // return a serializable copy
  return {
    id: req.id,
    targetStudent: req.targetStudent,
    word: req.word,
    requestedBy: req.requestedBy,
    votes: Array.from(req.votes),
    status: req.status,
    createdAt: req.createdAt,
    executedAt: req.executedAt || null
  };
}

module.exports = {
  createClassroom,
  getClassroom,
  addStudent,
  startSession,
  endSession,
  getLeaderboard,
  getStudentStatus,
  getAllClassrooms
  ,swapWords
  ,requestRemoveWord
  ,voteRemoveRequest
  ,getRemoveRequest
};
