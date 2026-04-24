// Galaxy customization
const API_BASE = window.location.origin;
const token = localStorage.getItem('token');
const galaxyId = new URLSearchParams(window.location.search).get('id');

let currentCaptions = [];
let themes = [];
let musics = [];

// Load themes and musics
async function loadOptions() {
  try {
    const [themesRes, musicsRes] = await Promise.all([
      fetch(`${API_BASE}/media/themes`),
      fetch(`${API_BASE}/media/musics`)
    ]);
    
    const themesData = await themesRes.json();
    const musicsData = await musicsRes.json();
    
    themes = themesData.meta || [];
    musics = musicsData.meta || [];
    
    populateSelects();
  } catch (err) {
    console.error('Failed to load options:', err);
  }
}

function populateSelects() {
  const themeSelect = document.getElementById('themeSelect');
  const musicSelect = document.getElementById('musicSelect');
  
  themes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme._id;
    option.textContent = theme.name;
    themeSelect.appendChild(option);
  });
  
  musics.forEach(music => {
    const option = document.createElement('option');
    option.value = music._id;
    option.textContent = music.name;
    musicSelect.appendChild(option);
  });
}

// Load current galaxy data
async function loadGalaxyCustomization() {
  try {
    const res = await fetch(`${API_BASE}/galaxies/${galaxyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const galaxy = data.meta;
    
    if (galaxy.themeId) {
      document.getElementById('themeSelect').value = galaxy.themeId;
    }
    if (galaxy.backgroundMusicId) {
      document.getElementById('musicSelect').value = galaxy.backgroundMusicId;
    }
    if (galaxy.caption && Array.isArray(galaxy.caption)) {
      currentCaptions = galaxy.caption;
      renderCaptions();
    }
  } catch (err) {
    console.error('Failed to load galaxy:', err);
  }
}

function renderCaptions() {
  const list = document.getElementById('captionList');
  list.innerHTML = currentCaptions.map((caption, index) => `
    <div class="caption-item">
      <span>${caption}</span>
      <button onclick="removeCaption(${index})">×</button>
    </div>
  `).join('');
}

function removeCaption(index) {
  currentCaptions.splice(index, 1);
  renderCaptions();
}

// Add caption
document.getElementById('addCaptionBtn').addEventListener('click', () => {
  const input = document.getElementById('captionInput');
  const text = input.value.trim();
  if (text) {
    currentCaptions.push(text);
    renderCaptions();
    input.value = '';
  }
});

// Save changes
document.getElementById('saveCustomBtn').addEventListener('click', async () => {
  const themeId = document.getElementById('themeSelect').value || null;
  const musicId = document.getElementById('musicSelect').value || null;
  
  try {
    const res = await fetch(`${API_BASE}/galaxies/${galaxyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        themeId,
        backgroundMusicId: musicId,
        caption: currentCaptions
      })
    });
    
    if (res.ok) {
      alert('Saved successfully!');
    } else {
      alert('Failed to save');
    }
  } catch (err) {
    console.error('Save error:', err);
    alert('Failed to save');
  }
});

// Initialize
loadOptions();
loadGalaxyCustomization();

// Make removeCaption global
window.removeCaption = removeCaption;
