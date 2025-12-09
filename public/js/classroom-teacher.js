// Classroom Teacher Panel JavaScript

let refreshInterval;

$(document).ready(function() {
  // Initial load
  loadLeaderboard();
  updateStatistics();
  
  // Auto-refresh every 10 seconds
  refreshInterval = setInterval(function() {
    loadLeaderboard();
    updateStatistics();
  }, 10000);
  
  // Manual refresh button
  $('#refreshBtn').on('click', function() {
    loadLeaderboard();
    updateStatistics();
  });
});

function loadLeaderboard() {
  $.ajax({
    url: `/classroom/api/leaderboard/${classroomCode}`,
    type: 'GET',
    success: function(data) {
      if (data.success) {
        displayLeaderboard(data.leaderboard);
        displayStudentList(data.leaderboard);
        $('#studentCount').text(data.leaderboard.length);
      }
    },
    error: function(xhr, status, error) {
      console.error('Failed to load leaderboard:', error);
    }
  });
}

function displayLeaderboard(leaderboard) {
  const container = $('#leaderboardContainer');
  
  if (leaderboard.length === 0) {
    container.html('<p class="text-center text-muted">尚無學生加入課堂</p>');
    return;
  }
  
  let html = '';
  leaderboard.forEach(function(student) {
    const rankClass = student.rank <= 3 ? `rank-${student.rank}` : '';
    const activeBadge = student.isActive ? '<span class="badge active-badge ms-2">學習中</span>' : '';
    const medal = student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : '';
    
    html += `
      <div class="leaderboard-item ${rankClass}">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <span style="font-size: 1.5em; margin-right: 10px;">${medal || student.rank}</span>
            <strong style="font-size: 1.2em;">${escapeHtml(student.name)}</strong>
            ${activeBadge}
          </div>
          <div class="text-end">
            <div style="font-size: 1.3em; font-weight: bold;">
              ${student.totalMinutes} 分 ${student.totalSeconds} 秒
            </div>
            <small class="text-muted">最後活動: ${formatTime(student.lastActive)}</small>
          </div>
        </div>
      </div>
    `;
  });
  
  container.html(html);
}

function displayStudentList(leaderboard) {
  const container = $('#studentList');
  
  if (leaderboard.length === 0) {
    container.html('<p class="text-muted">尚無學生加入</p>');
    return;
  }
  
  let html = '<ul class="list-group">';
  leaderboard.forEach(function(student) {
    const activeIcon = student.isActive ? '🟢' : '⚪';
    html += `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span>${activeIcon} ${escapeHtml(student.name)}</span>
        <span class="badge bg-primary">#${student.rank}</span>
      </li>
    `;
  });
  html += '</ul>';
  
  container.html(html);
}

function updateStatistics() {
  $.ajax({
    url: `/classroom/api/leaderboard/${classroomCode}`,
    type: 'GET',
    success: function(data) {
      if (data.success && data.leaderboard.length > 0) {
        const times = data.leaderboard.map(s => s.totalTime);
        const avgTime = Math.floor(times.reduce((a, b) => a + b, 0) / times.length);
        const maxTime = Math.max(...times);
        const activeCount = data.leaderboard.filter(s => s.isActive).length;
        
        $('#avgTime').text(formatSeconds(avgTime));
        $('#maxTime').text(formatSeconds(maxTime));
        $('#activeStudents').text(activeCount);
      } else {
        $('#avgTime').text('--');
        $('#maxTime').text('--');
        $('#activeStudents').text('0');
      }
    }
  });
}

function formatSeconds(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes} 分 ${secs} 秒`;
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
