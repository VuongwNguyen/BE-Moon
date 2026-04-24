const API = window.location.origin;
const authToken = localStorage.getItem('token');

// Load themes
async function loadThemes() {
  try {
    const res = await fetch(`${API}/media/themes`);
    const data = await res.json();
    const themes = data.meta || [];
    
    const tbody = document.getElementById('theme-table');
    tbody.innerHTML = themes.map(t => `
      <tr>
        <td>${t.name}</td>
        <td>${t.colors?.primary || '-'}</td>
        <td>${t.status}</td>
        <td><button class="btn-delete-row" onclick="deleteTheme('${t._id}')">Delete</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// Load musics
async function loadMusics() {
  try {
    const res = await fetch(`${API}/media/musics`);
    const data = await res.json();
    const musics = data.meta || [];
    
    const tbody = document.getElementById('music-table');
    tbody.innerHTML = musics.map(m => `
      <tr>
        <td>${m.name}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.url}</td>
        <td>${m.status}</td>
        <td><button class="btn-delete-row" onclick="deleteMusic('${m._id}')">Delete</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// Theme modal
document.getElementById('btn-add-theme')?.addEventListener('click', () => {
  document.getElementById('theme-modal').classList.add('open');
});

document.getElementById('btn-cancel-theme')?.addEventListener('click', () => {
  document.getElementById('theme-modal').classList.remove('open');
});

document.getElementById('btn-save-theme')?.addEventListener('click', async () => {
  const name = document.getElementById('theme-name').value.trim();
  const primary = document.getElementById('theme-primary').value.trim();
  const secondary = document.getElementById('theme-secondary').value.trim();
  const bg = document.getElementById('theme-bg').value.trim();
  
  if (!name) return alert('Name required');
  
  try {
    const res = await fetch(`${API}/media/themes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name,
        colors: { primary, secondary, background: bg }
      })
    });
    
    if (res.ok) {
      document.getElementById('theme-modal').classList.remove('open');
      document.getElementById('theme-name').value = '';
      document.getElementById('theme-primary').value = '';
      document.getElementById('theme-secondary').value = '';
      document.getElementById('theme-bg').value = '';
      loadThemes();
    } else {
      alert('Failed');
    }
  } catch (err) {
    alert('Error');
  }
});

async function deleteTheme(id) {
  if (!confirm('Delete?')) return;
  try {
    const res = await fetch(`${API}/media/themes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.ok) loadThemes();
  } catch (err) {
    alert('Error');
  }
}

// Music modal
document.getElementById('btn-add-music')?.addEventListener('click', () => {
  document.getElementById('music-modal').classList.add('open');
});

document.getElementById('btn-cancel-music')?.addEventListener('click', () => {
  document.getElementById('music-modal').classList.remove('open');
});

document.getElementById('btn-save-music')?.addEventListener('click', async () => {
  const name = document.getElementById('music-name').value.trim();
  const fileInput = document.getElementById('music-file');
  const file = fileInput.files[0];
  
  if (!name || !file) return alert('Name and file required');
  
  try {
    // Upload file first
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadRes = await fetch(`${API}/media/upload-music`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData
    });
    
    if (!uploadRes.ok) return alert('Upload failed');
    
    const uploadData = await uploadRes.json();
    const url = uploadData.meta.url;
    
    // Create music record
    const res = await fetch(`${API}/media/musics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ name, url })
    });
    
    if (res.ok) {
      document.getElementById('music-modal').classList.remove('open');
      document.getElementById('music-name').value = '';
      fileInput.value = '';
      loadMusics();
    } else {
      alert('Failed');
    }
  } catch (err) {
    alert('Error');
  }
});

async function deleteMusic(id) {
  if (!confirm('Delete?')) return;
  try {
    const res = await fetch(`${API}/media/musics/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.ok) loadMusics();
  } catch (err) {
    alert('Error');
  }
}

// Load on admin tab active
const adminTab = document.querySelector('[data-tab="admin"]');
if (adminTab) {
  adminTab.addEventListener('click', () => {
    loadThemes();
    loadMusics();
  });
}

// Sidebar navigation
document.querySelectorAll('.admin-nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const section = item.dataset.section;
    
    // Update nav active state
    document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    // Update section active state
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`admin-${section}`).classList.add('active');
  });
});

// Make functions global
window.deleteTheme = deleteTheme;
window.deleteMusic = deleteMusic;
