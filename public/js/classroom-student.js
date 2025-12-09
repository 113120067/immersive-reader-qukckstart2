// Classroom Student Page JavaScript

let isLearning = false;
let refreshInterval;

$(document).ready(function() {
  // Load initial status
  loadMyStatus();
  loadLeaderboard();
  
  // Auto-refresh every 10 seconds
  refreshInterval = setInterval(function() {
    if (!isLearning) {
      loadMyStatus();
    }
    loadLeaderboard();
  }, 10000);
  
  // Start learning button
  $('#startBtn').on('click', function() {
    startLearning();
  });
  
  // Stop learning button
  $('#stopBtn').on('click', function() {
    stopLearning();
  });
  
  // Manual refresh buttons
  $('#refreshRankBtn').on('click', loadMyStatus);
  $('#refreshLeaderboardBtn').on('click', loadLeaderboard);
});

async function startLearning() {
  try {
    // Notify server: start session
    await $.ajax({
      url: '/classroom/api/session/start',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ code: classroomCode, studentName: studentName })
    });
    
    isLearning = true;
    $('#startBtn').addClass('d-none');
    $('#stopBtn').removeClass('d-none');
    $('#sessionStatus').html('<span class="badge bg-success">學習中...</span>');
    
    // Launch Immersive Reader
    const wordsHtml = words.map(word => `<p><strong>${escapeHtml(word)}</strong></p>`).join('');
    
    try {
      await IRConfig.launch('單字學習', wordsHtml, {
        lang: 'en',
        onExit: function() {
          // Auto stop when IR closes
          stopLearning();
        }
      });
    } catch (error) {
      console.error('Failed to launch Immersive Reader:', error);
      alert('無法開啟 Immersive Reader，請確認網路連線。');
      stopLearning();
    }
    
  } catch (error) {
    console.error('Failed to start session:', error);
    alert('無法開始學習，請稍後再試。');
    isLearning = false;
    $('#startBtn').removeClass('d-none');
    $('#stopBtn').addClass('d-none');
  }
}

async function stopLearning() {
  if (!isLearning) return;
  
  try {
    // Notify server: end session
    const result = await $.ajax({
      url: '/classroom/api/session/end',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ code: classroomCode, studentName: studentName })
    });
    
    isLearning = false;
    $('#startBtn').removeClass('d-none');
    $('#stopBtn').addClass('d-none');
    
    if (result.success) {
      const duration = result.duration;
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      $('#sessionStatus').html(
        `<span class="text-success">✅ 本次學習: ${minutes} 分 ${seconds} 秒</span>`
      );
    }
    
    // Refresh status
    loadMyStatus();
    loadLeaderboard();
    
  } catch (error) {
    console.error('Failed to stop session:', error);
  }
}

function loadMyStatus() {
  $.ajax({
    url: `/classroom/api/status/${classroomCode}/${encodeURIComponent(studentName)}`,
    type: 'GET',
    success: function(data) {
      if (data.success) {
        const status = data.status;
        
        // Update my time
        const minutes = Math.floor(status.totalTime / 60);
        const seconds = status.totalTime % 60;
        $('#myTime').text(`${minutes} 分 ${seconds} 秒`);
        
        // Update my rank
        if (status.rank) {
          const medal = status.rank === 1 ? '🥇' : status.rank === 2 ? '🥈' : status.rank === 3 ? '🥉' : '';
          $('#myRank').html(`
            <h1 style="font-size: 4em; color: #ffc107;">${medal || '#' + status.rank}</h1>
            <p class="text-muted">目前排名 ${status.rank} / ${status.totalStudents}</p>
          `);
        }
      }
    },
    error: function(xhr, status, error) {
      console.error('Failed to load status:', error);
    }
  });
}

function loadLeaderboard() {
  $.ajax({
    url: `/classroom/api/leaderboard/${classroomCode}`,
    type: 'GET',
    success: function(data) {
      if (data.success) {
        displayLeaderboardPreview(data.leaderboard);
      }
    },
    error: function(xhr, status, error) {
      console.error('Failed to load leaderboard:', error);
    }
  });
}

function displayLeaderboardPreview(leaderboard) {
  const container = $('#leaderboardPreview');
  
  if (leaderboard.length === 0) {
    container.html('<p class="text-muted text-center">尚無排名資料</p>');
    return;
  }
  
  // Show top 5
  const top5 = leaderboard.slice(0, 5);
  let html = '';
  
  top5.forEach(function(student) {
    const isMe = student.name === studentName;
    const rankClass = student.rank <= 3 ? `rank-${student.rank}` : 'other';
    const highlight = isMe ? 'border-primary border-2' : '';
    
    html += `
      <div class="leaderboard-preview-item ${highlight}">
        <div class="d-flex align-items-center">
          <span class="rank-badge ${rankClass}">${student.rank}</span>
          <span class="ms-2 ${isMe ? 'fw-bold' : ''}">${escapeHtml(student.name)} ${isMe ? '(我)' : ''}</span>
        </div>
        <div>
          <strong>${student.totalMinutes}:${String(student.totalSeconds).padStart(2, '0')}</strong>
        </div>
      </div>
    `;
  });
  
  container.html(html);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Cleanup on page unload
$(window).on('beforeunload', function() {
  if (isLearning) {
    stopLearning();
  }
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
