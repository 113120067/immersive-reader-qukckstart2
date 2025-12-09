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

module.exports = {
  createClassroom,
  getClassroom,
  addStudent,
  startSession,
  endSession,
  getLeaderboard,
  getStudentStatus,
  getAllClassrooms
};
