// classroom-words.js
// Handle displaying student's personal words, swapping, and remove-request/voting

$(document).ready(function() {
  // studentWords, classroomCode, studentName are expected to be defined in the page
  renderWordList();
  loadRemoveRequests();

  // Poll requests every 10s
  setInterval(loadRemoveRequests, 10000);
});

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
