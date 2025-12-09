// Upload and Save Vocabulary functionality
let currentWords = [];
let currentFilename = '';

document.addEventListener('DOMContentLoaded', function() {
  const uploadForm = document.getElementById('vocabUploadForm');
  const saveWordsBtn = document.getElementById('saveWords');
  const selectAllBtn = document.getElementById('selectAll');
  const deselectAllBtn = document.getElementById('deselectAll');
  const refreshVocabBtn = document.getElementById('refreshVocab');
  
  // Handle file upload
  if (uploadForm) {
    uploadForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const fileInput = document.getElementById('vocabFile');
      if (!fileInput.files || !fileInput.files[0]) {
        showUploadStatus('Please select a file', 'danger');
        return;
      }
      
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      
      showUploadStatus('Uploading and extracting words...', 'info');
      
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
          currentWords = data.words;
          currentFilename = data.filename;
          showUploadStatus(`Extracted ${data.wordCount} unique words from ${data.filename}`, 'success');
          displayWordSelection(data.words);
        } else {
          showUploadStatus('Error: ' + (data.error || 'Unknown error'), 'danger');
        }
      } catch (error) {
        showUploadStatus('Upload failed: ' + error.message, 'danger');
      }
    });
  }
  
  // Handle save selected words
  if (saveWordsBtn) {
    saveWordsBtn.addEventListener('click', async function() {
      const checkboxes = document.querySelectorAll('input[name="word"]:checked');
      const selectedWords = Array.from(checkboxes).map(cb => cb.value);
      
      if (selectedWords.length === 0) {
        showSaveStatus('Please select at least one word', 'warning');
        return;
      }
      
      showSaveStatus('Saving words...', 'info');
      
      try {
        const response = await fetch('/api/vocab/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            words: selectedWords,
            source: currentFilename
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          showSaveStatus(`Successfully saved ${data.saved} new words. Total vocabulary: ${data.total} words.`, 'success');
          loadVocabList();
        } else {
          showSaveStatus('Error: ' + (data.error || 'Unknown error'), 'danger');
        }
      } catch (error) {
        showSaveStatus('Save failed: ' + error.message, 'danger');
      }
    });
  }
  
  // Handle select all
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', function() {
      document.querySelectorAll('input[name="word"]').forEach(cb => cb.checked = true);
      updateWordCount();
    });
  }
  
  // Handle deselect all
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', function() {
      document.querySelectorAll('input[name="word"]').forEach(cb => cb.checked = false);
      updateWordCount();
    });
  }
  
  // Handle refresh vocab list
  if (refreshVocabBtn) {
    refreshVocabBtn.addEventListener('click', function() {
      loadVocabList();
    });
  }
  
  // Load initial vocab list
  loadVocabList();
});

function showUploadStatus(message, type) {
  const statusDiv = document.getElementById('uploadStatus');
  if (statusDiv) {
    statusDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  }
}

function showSaveStatus(message, type) {
  const statusDiv = document.getElementById('saveStatus');
  if (statusDiv) {
    statusDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  }
}

function displayWordSelection(words) {
  const wordSelectionSection = document.getElementById('wordSelectionSection');
  const wordList = document.getElementById('wordList');
  
  if (!wordList) return;
  
  // Clear previous words
  wordList.innerHTML = '';
  
  // Create checkboxes for each word
  words.forEach(word => {
    const div = document.createElement('div');
    div.className = 'form-check form-check-inline';
    div.style.width = '200px';
    
    const checkbox = document.createElement('input');
    checkbox.className = 'form-check-input';
    checkbox.type = 'checkbox';
    checkbox.name = 'word';
    checkbox.value = word;
    checkbox.id = 'word-' + word;
    checkbox.addEventListener('change', updateWordCount);
    
    const label = document.createElement('label');
    label.className = 'form-check-label';
    label.htmlFor = 'word-' + word;
    label.textContent = word;
    
    div.appendChild(checkbox);
    div.appendChild(label);
    wordList.appendChild(div);
  });
  
  // Show the selection section
  if (wordSelectionSection) {
    wordSelectionSection.classList.remove('d-none');
  }
  
  updateWordCount();
}

function updateWordCount() {
  const checkboxes = document.querySelectorAll('input[name="word"]:checked');
  const countSpan = document.getElementById('wordCount');
  if (countSpan) {
    countSpan.textContent = `Selected: ${checkboxes.length} / ${currentWords.length}`;
  }
}

async function loadVocabList() {
  const vocabDisplay = document.getElementById('vocabDisplay');
  if (!vocabDisplay) return;
  
  try {
    const response = await fetch('/api/vocab/list');
    const data = await response.json();
    
    if (data.success) {
      if (data.words.length === 0) {
        vocabDisplay.innerHTML = '<p class="text-muted">No saved vocabulary yet. Upload a file to get started!</p>';
      } else {
        let html = `<p><strong>Total saved words: ${data.count}</strong></p>`;
        html += '<div class="border p-3" style="max-height: 300px; overflow-y: auto;">';
        html += '<div class="row">';
        
        data.words.forEach((item, index) => {
          html += `<div class="col-md-3 col-sm-4 col-6 mb-2">
            <small><strong>${item.word}</strong><br>
            <span class="text-muted">From: ${item.source}</span></small>
          </div>`;
        });
        
        html += '</div></div>';
        vocabDisplay.innerHTML = html;
      }
    } else {
      vocabDisplay.innerHTML = `<div class="alert alert-danger">Error loading vocabulary: ${data.error}</div>`;
    }
  } catch (error) {
    vocabDisplay.innerHTML = `<div class="alert alert-danger">Failed to load vocabulary: ${error.message}</div>`;
  }
}
