// Classroom Join Page JavaScript

$(document).ready(function() {
  // Auto-format classroom code input
  $('#classroomCode').on('input', function() {
    this.value = this.value.replace(/[^0-9]/g, '');
  });
  
  $('#joinForm').on('submit', function(e) {
    e.preventDefault();
    
    const code = $('#classroomCode').val().trim();
    const studentName = $('#studentName').val().trim();
    
    if (code.length !== 4) {
      showStatus('請輸入4位數課堂代碼', 'danger');
      return;
    }
    
    if (!studentName) {
      showStatus('請輸入你的姓名', 'danger');
      return;
    }
    
    showStatus('正在加入課堂...', 'info');
    $('button[type="submit"]').prop('disabled', true);
    
    $.ajax({
      url: '/classroom/join',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ code, studentName }),
      success: function(data) {
        if (data.success) {
          showStatus('加入成功! 正在跳轉...', 'success');
          setTimeout(function() {
            window.location.href = `/classroom/student/${data.code}/${encodeURIComponent(data.studentName)}`;
          }, 1000);
        } else {
          showStatus('錯誤: ' + (data.error || '未知錯誤'), 'danger');
          $('button[type="submit"]').prop('disabled', false);
        }
      },
      error: function(xhr, status, error) {
        let errorMessage = '加入失敗';
        if (xhr.responseJSON && xhr.responseJSON.error) {
          errorMessage = xhr.responseJSON.error;
        } else if (xhr.status === 404) {
          errorMessage = '找不到此課堂,請確認代碼是否正確';
        }
        showStatus(errorMessage, 'danger');
        $('button[type="submit"]').prop('disabled', false);
      }
    });
  });
});

function showStatus(message, type) {
  $('#joinStatus').html(`<div class="alert alert-${type}">${message}</div>`);
}
