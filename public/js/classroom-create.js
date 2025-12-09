// Classroom Create Page JavaScript

$(document).ready(function() {
  $('#createForm').on('submit', function(e) {
    e.preventDefault();
    
    const classroomName = $('#classroomName').val().trim();
    const fileInput = $('#wordFile')[0];
    
    if (!classroomName) {
      showStatus('請輸入課堂名稱', 'danger');
      return;
    }
    
    if (!fileInput.files || !fileInput.files[0]) {
      showStatus('請選擇檔案', 'danger');
      return;
    }
    
    const formData = new FormData();
    formData.append('classroomName', classroomName);
    formData.append('file', fileInput.files[0]);
    
    showStatus('正在建立課堂...', 'info');
    $('button[type="submit"]').prop('disabled', true);
    
    $.ajax({
      url: '/classroom/create',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(data) {
        if (data.success) {
          showSuccess(data);
        } else {
          showStatus('錯誤: ' + (data.error || '未知錯誤'), 'danger');
          $('button[type="submit"]').prop('disabled', false);
        }
      },
      error: function(xhr, status, error) {
        const errorMessage = xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : error;
        showStatus('建立失敗: ' + errorMessage, 'danger');
        $('button[type="submit"]').prop('disabled', false);
      }
    });
  });
});

function showStatus(message, type) {
  $('#uploadStatus').html(`<div class="alert alert-${type}">${message}</div>`);
}

function showSuccess(data) {
  // Hide step 1
  $('#step1').addClass('d-none');
  
  // Show step 2
  $('#step2').removeClass('d-none');
  
  // Display classroom info
  $('#classroomCode').text(data.code);
  $('#classroomInfo').html(`<strong>課堂名稱:</strong> ${data.name}`);
  $('#wordCountInfo').text(`共提取 ${data.wordCount} 個單字`);
  $('#teacherPanelLink').attr('href', `/classroom/teacher/${data.code}`);
}
