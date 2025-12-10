// Upload and Save Vocabulary functionality
import { initialize, onAuthStateChanged } from '/firebase-client.js';
import { createNote, onUserNotesChanged, updateNote, deleteNote } from '/firebase-notes.js';
import { launchFromHtml } from '/js/immersive-reader-client.js';

let currentWords = [];
let currentFilename = '';
let isAuthenticated = false;

document.addEventListener('DOMContentLoaded', function() {
  const uploadForm = document.getElementById('vocabUploadForm');
  const saveWordsBtn = document.getElementById('saveWords');
  const selectAllBtn = document.getElementById('selectAll');
  const deselectAllBtn = document.getElementById('deselectAll');
  const refreshVocabBtn = document.getElementById('refreshVocab');
  const userNotesSection = document.getElementById('userNotesSection');
  const userNotesContainer = document.getElementById('userNotesContainer');
  const openNotesPageBtn = document.getElementById('openNotesPage');
  
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
        // If user is authenticated, save to Firestore (existing behaviour).
        // If not authenticated, persist only in browser sessionStorage (ephemeral).
        if (isAuthenticated) {
          // Save to Firestore notes for authenticated users (store as plain text)
          try {
            const title = `Vocabulary - ${currentFilename || 'unspecified'} - ${new Date().toLocaleString()}`;
            const content = selectedWords.join('\n'); // plain text lines
            await createNote(title, content);
            showSaveStatus(`Saved ${selectedWords.length} words to your Notes.`, 'success');

            // Also sync to server-side vocab store for compatibility
            try {
              const syncResp = await fetch('/api/vocab/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: selectedWords, source: currentFilename })
              });
              const syncData = await syncResp.json();
              if (syncData.success) {
                // Optionally refresh server-side list
                loadVocabList();
              }
            } catch (syncErr) {
              console.warn('Failed to sync to server vocab store:', syncErr);
            }
          } catch (noteErr) {
            console.error('Failed to save to notes:', noteErr);
            showSaveStatus('Failed to save to Notes: ' + (noteErr.message || noteErr), 'danger');
          }
        } else {
          // Unauthenticated: store in sessionStorage only (ephemeral, cleared on browser close)
          try {
            const key = 'tmp_vocabulary';
            const existing = JSON.parse(sessionStorage.getItem(key) || '[]');
            // Merge new words without duplicates (case-sensitive preserve original)
            const set = new Set(existing);
            for (const w of selectedWords) set.add(w);
            const merged = Array.from(set);
            sessionStorage.setItem(key, JSON.stringify(merged));
            showSaveStatus(`Saved ${selectedWords.length} words to this browser session (won't be persisted).`, 'success');
            loadVocabList();
          } catch (sessErr) {
            console.error('Failed to save to sessionStorage:', sessErr);
            showSaveStatus('Failed to save locally: ' + (sessErr.message || sessErr), 'danger');
          }
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

  // Handle clear vocab (server-side) for unauthenticated users
  const clearVocabBtn = document.getElementById('clearVocab');
  if (clearVocabBtn) {
    clearVocabBtn.addEventListener('click', async function() {
      if (!confirm('確定要清除已儲存的 Vocabulary 嗎？此動作無法復原。')) return;
      try {
        if (!isAuthenticated) {
          // Clear session storage for unauthenticated users
          sessionStorage.removeItem('tmp_vocabulary');
          alert('已清除本次瀏覽器工作階段的 Vocabulary');
          loadVocabList();
          return;
        }

        // Authenticated: fallback to server-side clear (note: this clears the shared server store)
        const resp = await fetch('/api/vocab/clear', { method: 'DELETE' });
        const data = await resp.json();
        if (data && data.success) {
          alert('已清除伺服器端的已儲存 Vocabulary');
          loadVocabList();
        } else {
          alert('清除失敗：' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Clear vocab failed:', err);
        alert('清除失敗：' + (err.message || err));
      }
    });
  }
  
  // Handle review words with Immersive Reader
  const reviewWordsBtn = document.getElementById('reviewWords');
  if (reviewWordsBtn) {
    reviewWordsBtn.addEventListener('click', async function() {
      try {
        const response = await fetch('/api/vocab/list');
        const data = await response.json();
        
        if (data.success && data.words.length > 0) {
          // Prepare vocabulary list for Immersive Reader
          const vocabHtml = data.words.map(item => 
            `<p><strong>${escapeHtml(item.word)}</strong></p>`
          ).join('');
          
          launchImmersiveReaderForVocab('My Vocabulary List', vocabHtml);
        } else {
          alert('No vocabulary words to review. Please save some words first.');
        }
      } catch (error) {
        alert('Failed to load vocabulary: ' + error.message);
      }
    });
  }
  
  // Load initial vocab list
  loadVocabList();

  // Initialize Firebase and subscribe to user notes if logged in
  (async function setupAuthAndNotes() {
    try {
      await initialize();
    } catch (err) {
      console.warn('Firebase not configured or initialize failed:', err);
    }

    let notesUnsubscribe = null;

    onAuthStateChanged(async (user) => {
      isAuthenticated = !!user;
      if (user) {
        // Show notes section and subscribe to realtime notes
        if (userNotesSection) userNotesSection.style.display = 'block';
        if (notesUnsubscribe) {
          try { notesUnsubscribe(); } catch(e){}
          notesUnsubscribe = null;
        }
        try {
          notesUnsubscribe = await onUserNotesChanged(displayUserNotes);
        } catch (err) {
          console.error('Failed to subscribe to user notes:', err);
          if (userNotesContainer) userNotesContainer.innerHTML = `<div class="error">無法載入筆記：${err.message}</div>`;
        }
      } else {
        // Hide notes and clean up
        if (userNotesSection) userNotesSection.style.display = 'none';
        if (notesUnsubscribe) {
          try { notesUnsubscribe(); } catch(e){}
          notesUnsubscribe = null;
        }
        if (userNotesContainer) userNotesContainer.innerHTML = '';
      }
      // Refresh vocab display when auth state changes because source may differ
      loadVocabList();
    });

    if (openNotesPageBtn) {
      openNotesPageBtn.addEventListener('click', () => {
        window.location.href = '/notes';
      });
    }
  })();
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

// Render user notes from Firestore into the upload page
function displayUserNotes(notes) {
  if (!userNotesContainer) return;

  if (!notes || notes.length === 0) {
    userNotesContainer.innerHTML = '<p class="text-muted">No notes yet.</p>';
    return;
  }

  userNotesContainer.innerHTML = notes.map(note => `
    <div class="note-item" data-id="${note.id}" style="border:1px solid #ddd;padding:8px;border-radius:6px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <h4 style="margin:0;font-size:16px;">${escapeHtml(note.title || '(無標題)')}</h4>
        <div>
          <button class="btn-edit" data-id="${note.id}" style="margin-right:6px;">Edit</button>
          <button class="btn-delete" data-id="${note.id}">Delete</button>
        </div>
      </div>
      <div class="note-content" style="color:#333;white-space:pre-wrap;">${escapeHtml(note.content || '')}</div>
      <div style="font-size:12px;color:#888;margin-top:6px;">更新：${note.updatedAt ? (note.updatedAt.toDate ? note.updatedAt.toDate().toLocaleString() : new Date(note.updatedAt).toLocaleString()) : 'N/A'}</div>
    </div>
  `).join('');

  // Attach event handlers for edit/delete
  userNotesContainer.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('確定要刪除這則筆記嗎？')) return;
      try {
        await deleteNote(id);
      } catch (err) {
        console.error('Delete note failed:', err);
        alert('刪除筆記失敗：' + (err.message || err));
      }
    });
  });

  userNotesContainer.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const container = btn.closest('.note-item');
      if (!container) return;
      const titleEl = container.querySelector('h4');
      const contentEl = container.querySelector('.note-content');

      // Build edit form
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = titleEl ? titleEl.textContent : '';
      titleInput.style.width = '100%';
      titleInput.style.marginBottom = '6px';

      const textarea = document.createElement('textarea');
      textarea.style.width = '100%';
      textarea.style.minHeight = '80px';
      textarea.value = contentEl ? contentEl.textContent : '';

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.style.marginTop = '6px';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.marginLeft = '6px';

      // Replace content with editor
      contentEl.style.display = 'none';
      if (titleEl) titleEl.style.display = 'none';
      container.insertBefore(titleInput, container.firstChild.nextSibling);
      container.insertBefore(textarea, container.querySelector('.note-content'));
      container.querySelector('.note-content').parentNode.insertBefore(saveBtn, container.querySelector('.note-content').nextSibling);
      container.querySelector('.note-content').parentNode.insertBefore(cancelBtn, saveBtn.nextSibling);

      saveBtn.addEventListener('click', async () => {
        const newTitle = titleInput.value.trim();
        const newContent = textarea.value.trim();
        if (!newTitle && !newContent) { alert('請至少輸入標題或內容'); return; }
        try {
          await updateNote(id, { title: newTitle, content: newContent });
        } catch (err) {
          console.error('Update note failed:', err);
          alert('更新失敗：' + (err.message || err));
        }
        // snapshot will refresh UI; remove editor elements
      });

      cancelBtn.addEventListener('click', () => {
        // Remove editor and restore
        titleInput.remove();
        textarea.remove();
        saveBtn.remove();
        cancelBtn.remove();
        if (titleEl) titleEl.style.display = '';
        contentEl.style.display = '';
      });
    });
  });
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
    if (!isAuthenticated) {
      // Show only session storage words for unauthenticated users (ephemeral)
      const key = 'tmp_vocabulary';
      const items = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (!items || items.length === 0) {
        vocabDisplay.innerHTML = '<p class="text-muted">No saved vocabulary in this session. Select words and Save to keep them for this browser session.</p>';
        return;
      }

      vocabDisplay.innerHTML = '';
      const countP = document.createElement('p');
      const countStrong = document.createElement('strong');
      countStrong.textContent = `Session saved words: ${items.length}`;
      countP.appendChild(countStrong);
      vocabDisplay.appendChild(countP);

      const containerDiv = document.createElement('div');
      containerDiv.className = 'border p-3';
      containerDiv.style.maxHeight = '300px';
      containerDiv.style.overflowY = 'auto';

      const rowDiv = document.createElement('div');
      rowDiv.className = 'row';

      items.forEach((w) => {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-3 col-sm-4 col-6 mb-2';
        const wordDiv = document.createElement('div');
        const wordStrong = document.createElement('strong');
        wordStrong.textContent = w;
        wordDiv.appendChild(wordStrong);
        colDiv.appendChild(wordDiv);
        rowDiv.appendChild(colDiv);
      });

      containerDiv.appendChild(rowDiv);
      vocabDisplay.appendChild(containerDiv);
      return;
    }

    // Authenticated: show server-side stored vocabulary
    const response = await fetch('/api/vocab/list');
    const data = await response.json();
    
    if (data.success) {
      if (data.words.length === 0) {
        vocabDisplay.innerHTML = '<p class="text-muted">No saved vocabulary yet. Upload a file to get started!</p>';
      } else {
        // Create elements safely to prevent XSS
        vocabDisplay.innerHTML = '';
        
        const countP = document.createElement('p');
        const countStrong = document.createElement('strong');
        countStrong.textContent = `Total saved words: ${data.count}`;
        countP.appendChild(countStrong);
        vocabDisplay.appendChild(countP);
        
        const containerDiv = document.createElement('div');
        containerDiv.className = 'border p-3';
        containerDiv.style.maxHeight = '300px';
        containerDiv.style.overflowY = 'auto';
        
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        
        data.words.forEach((item) => {
          const colDiv = document.createElement('div');
          colDiv.className = 'col-md-3 col-sm-4 col-6 mb-2';
          
          const wordDiv = document.createElement('div');
          
          const wordStrong = document.createElement('strong');
          wordStrong.textContent = item.word;
          
          wordDiv.appendChild(wordStrong);
          colDiv.appendChild(wordDiv);
          rowDiv.appendChild(colDiv);
        });
        
        containerDiv.appendChild(rowDiv);
        vocabDisplay.appendChild(containerDiv);
      }
    } else {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger';
      errorDiv.textContent = `Error loading vocabulary: ${data.error}`;
      vocabDisplay.innerHTML = '';
      vocabDisplay.appendChild(errorDiv);
    }
  } catch (error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = `Failed to load vocabulary: ${error.message}`;
    vocabDisplay.innerHTML = '';
    vocabDisplay.appendChild(errorDiv);
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Launch Immersive Reader for vocabulary review
async function launchImmersiveReaderForVocab(title, content) {
  try {
    await launchFromHtml(title, content, 'en', { uiLang: 'zh-Hant' });
  } catch (error) {
    console.error('Error launching Immersive Reader:', error);
    alert('Error launching Immersive Reader. Please check the console for details.');
  }
}
