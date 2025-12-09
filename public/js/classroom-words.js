// classroom-words.js
// Handle displaying student's personal words, swapping, and remove-request/voting

$(document).ready(function() {
  // studentWords, classroomCode, studentName are expected to be defined in the page
  renderWordList();
  loadRemoveRequests();

  // Poll requests every 10s
  setInterval(loadRemoveRequests, 10000);
  // Practice UI handlers
  $('#practiceStart').on('click', startPractice);
  $('#practiceKnow').on('click', () => recordPractice(true));
  $('#practiceDontKnow').on('click', () => recordPractice(false));
});

let practiceQueue = [];
let practiceIndex = 0;
let practiceActive = false;

function startPractice() {
  if (!Array.isArray(studentWords) || studentWords.length === 0) {
    alert('你的個人單字清單為空');
    return;
  }

  // shuffle copy
  practiceQueue = studentWords.slice().sort(() => Math.random() - 0.5);
  practiceIndex = 0;
  practiceActive = true;

  $('#practiceStart').addClass('d-none');
  $('#practiceKnow').removeClass('d-none');
  $('#practiceDontKnow').removeClass('d-none');

  showPracticeCard();
}

function showPracticeCard() {
  const area = $('#practiceCard');
  const progress = $('#practiceProgress');
  if (!practiceActive || practiceIndex >= practiceQueue.length) {
    area.html('<p class="text-success">練習完成！</p>');
    progress.text('練習已結束');
    $('#practiceStart').removeClass('d-none');
    $('#practiceKnow').addClass('d-none');
    $('#practiceDontKnow').addClass('d-none');
    practiceActive = false;
    return;
  }

  const word = practiceQueue[practiceIndex];
  area.html(`<h3>${escapeHtml(word)}</h3><p class="text-muted">請按「知道」或「不知道」</p>`);
  progress.text(`練習 ${practiceIndex + 1} / ${practiceQueue.length}`);
}

function recordPractice(correct) {
  if (!practiceActive) return;
  const word = practiceQueue[practiceIndex];

  // send to server
  fetch('/classroom/api/word/practice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: classroomCode, studentName: studentName, word: word, correct: !!correct })
  }).then(r => r.json()).then(resp => {
    if (!resp.success) {
      console.warn('record practice failed', resp.error);
    }
    // advance
    practiceIndex += 1;
    showPracticeCard();
  }).catch(err => {
    console.error('Failed to record practice', err);
    // still advance locally
    practiceIndex += 1;
    showPracticeCard();
  });
}

function renderWordList() {
  const containerId = '#myWordsContainer';
  const container = $(containerId);
  if (!container.length) return;

  if (!Array.isArray(studentWords) || studentWords.length === 0) {
    container.html('<p class="text-muted">你目前沒有個人單字清單。</p>');
    return;
  }

  let html = '<ul class="list-group">';
  studentWords.forEach((w, idx) => {
    html += `\
      <li class="list-group-item d-flex justify-content-between align-items-center">\
        <span>${escapeHtml(w)}</span>\
        <div>\
          <button class="btn btn-sm btn-outline-primary me-2" onclick="onSwapClick(${idx})">交換</button>\
          <button class="btn btn-sm btn-outline-danger" onclick="onRequestRemove('${escapeJs(w)}')">提出刪除</button>\
        </div>\
      </li>`;
  });
  html += '</ul>';

  container.html(html);
}

function onSwapClick(index) {
  const myWord = studentWords[index];
  const otherStudent = prompt('輸入要交換的同學名稱（精確）：');
  if (!otherStudent) return;
  const otherWord = prompt(`輸入 ${otherStudent} 的單字（精確）：`);
  if (!otherWord) return;

  // Call swap API
  fetch('/classroom/api/word/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: classroomCode, studentA: studentName, wordA: myWord, studentB: otherStudent, wordB: otherWord })
  }).then(r => r.json()).then(resp => {
    if (resp.success) {
      alert('交換成功');
      // Update UI optimistically: swap in studentWords
      studentWords[index] = otherWord;
      renderWordList();
    } else {
      alert('交換失敗：' + (resp.error || '未知錯誤'));
    }
  }).catch(err => {
    console.error(err);
    alert('交換失敗，請稍後再試');
  });
}

function onRequestRemove(word) {
  if (!confirm(`確定要提出刪除 ${word} 的請求嗎？此請求需要班級多數同意才會執行。`)) return;

  fetch('/classroom/api/word/remove/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: classroomCode, targetStudent: studentName, word: word, requestedBy: studentName })
  }).then(r => r.json()).then(resp => {
    if (resp.success) {
      alert('刪除請求已建立，請通知同學投票或等候自動執行。');
      loadRemoveRequests();
    } else {
      alert('建立刪除請求失敗：' + (resp.error || '未知錯誤'));
    }
  }).catch(err => {
    console.error(err);
    alert('建立刪除請求失敗，請稍後再試');
  });
}

function loadRemoveRequests() {
  fetch(`/classroom/api/word/remove/list/${classroomCode}`)
    .then(r => r.json())
    .then(resp => {
      if (!resp.success) return;
      renderRemoveRequests(resp.requests || []);
    })
    .catch(err => console.error('Failed to load remove requests', err));
}

function renderRemoveRequests(requests) {
  const container = $('#removeRequestsContainer');
  if (!container.length) return;

  if (!requests || requests.length === 0) {
    container.html('<p class="text-muted">目前沒有刪除請求。</p>');
    return;
  }

  let html = '<ul class="list-group">';
  requests.forEach(r => {
    const voted = Array.isArray(r.votes) && r.votes.indexOf(studentName) !== -1;
    html += `\
      <li class="list-group-item d-flex justify-content-between align-items-center">\
        <div>\
          <strong>對象：</strong> ${escapeHtml(r.targetStudent)} &nbsp; <strong>單字：</strong> ${escapeHtml(r.word)}<br/>\
          <small class="text-muted">發起：${escapeHtml(r.requestedBy)} • 狀態：${r.status} • 票數：${r.votes.length}</small>\
        </div>\
        <div>\
          ${r.status === 'pending' && !voted ? `<button class="btn btn-sm btn-success" onclick="voteRequest('${r.id}')">投票同意</button>` : ''}\
        </div>\
      </li>`;
  });
  html += '</ul>';

  container.html(html);
}

function voteRequest(requestId) {
  fetch('/classroom/api/word/remove/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: classroomCode, requestId: requestId, voterName: studentName })
  }).then(r => r.json()).then(resp => {
    if (resp.success) {
      alert('投票成功');
      loadRemoveRequests();
    } else {
      alert('投票失敗：' + (resp.error || '未知錯誤'));
    }
  }).catch(err => {
    console.error(err);
    alert('投票失敗，請稍後再試');
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, function(ch) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[ch];
  });
}

function escapeJs(text) {
  if (!text) return '';
  return String(text).replace(/'/g, "\\'").replace(/"/g, '\\"');
}
