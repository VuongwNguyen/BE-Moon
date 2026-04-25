// Galaxy customization
const API_BASE = window.location.origin;
const token = localStorage.getItem('token');
const galaxyId = new URLSearchParams(window.location.search).get('galaxyId');

const PLAN_RANK = { plus: 1, pro: 2 };

let currentCaptions = [];
let themes = [];
let musics = [];
let saveTimer = null;
let dragSrcIndex = null;

// ── Toast ─────────────────────────────────────────
function showToast(msg, type) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type || ''}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.25s ease forwards';
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

// ── Save indicator ────────────────────────────────
function setSaveStatus(status) {
  const el = document.getElementById('saveIndicator');
  if (!el) return;
  el.className = 'save-indicator';
  if (status === 'saving') {
    el.textContent = 'Saving…';
  } else if (status === 'saved') {
    el.classList.add('saved');
    el.textContent = 'Saved ✓';
    setTimeout(() => { el.textContent = ''; el.className = 'save-indicator'; }, 2000);
  } else if (status === 'error') {
    el.classList.add('error');
    el.textContent = 'Save failed';
  } else {
    el.textContent = '';
  }
}

// ── Auto-save (debounced) ─────────────────────────
function scheduleSave() {
  clearTimeout(saveTimer);
  setSaveStatus('saving');
  saveTimer = setTimeout(performSave, 800);
}

async function performSave() {
  const themeId = document.getElementById('themeSelect').value || null;
  const musicId = document.getElementById('musicSelect').value || null;
  const template = document.getElementById('templateSelect').value || 'galaxy';
  try {
    const res = await fetch(`${API_BASE}/galaxies/${galaxyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ themeId, backgroundMusicId: musicId, caption: currentCaptions, template }),
    });
    if (res.ok) {
      setSaveStatus('saved');
    } else if (res.status === 403) {
      const data = await res.json();
      setSaveStatus('error');
      showToast(data.message || 'Cần subscription để d\xF9ng t\xEDnh năng n\xE0y', 'error');
    } else {
      setSaveStatus('error');
    }
  } catch {
    setSaveStatus('error');
  }
}

// ── Subscription lock ─────────────────────────────
function applyLock(sectionId, planLabel) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  section.classList.add('section-locked');

  const msg = document.createElement('div');
  msg.className = 'feature-lock-msg';
  msg.appendChild(document.createTextNode('🔒 Cần g\xF3i '));
  const strong = document.createElement('strong');
  strong.textContent = planLabel;
  msg.appendChild(strong);
  msg.appendChild(document.createTextNode(' để d\xF9ng t\xEDnh năng n\xE0y  '));
  const link = document.createElement('a');
  link.href = '/portal/';
  link.textContent = 'N\xE2ng cấp';
  msg.appendChild(link);
  section.appendChild(msg);
}

async function applySubscriptionLock() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.role === 'admin' || user.role === 'partner') return;
  try {
    const res = await fetch(`${API_BASE}/payment/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return;
    const data = await res.json();
    const sub = data.meta;
    const rank = sub ? (PLAN_RANK[sub.plan] || 0) : 0;
    if (rank < PLAN_RANK['plus']) applyLock('themeSection', 'Plus');
    if (rank < PLAN_RANK['pro'])  applyLock('musicSection', 'Pro');
    if (rank < PLAN_RANK['pro'])  applyLock('captionSection', 'Pro');
  } catch { /* silent */ }
}

// ── Load themes / musics ──────────────────────────
async function loadOptions() {
  try {
    const [themesRes, musicsRes] = await Promise.all([
      fetch(`${API_BASE}/media/themes`),
      fetch(`${API_BASE}/media/musics`),
    ]);
    themes = (await themesRes.json()).meta || [];
    musics = (await musicsRes.json()).meta || [];
    populateSelects();
  } catch (err) {
    console.error('Failed to load options:', err);
  }
}

function populateSelects() {
  const themeSelect = document.getElementById('themeSelect');
  const musicSelect = document.getElementById('musicSelect');
  themes.forEach(theme => {
    const opt = document.createElement('option');
    opt.value = theme._id;
    opt.textContent = theme.name;
    themeSelect.appendChild(opt);
  });
  musics.forEach(music => {
    const opt = document.createElement('option');
    opt.value = music._id;
    opt.textContent = music.name;
    musicSelect.appendChild(opt);
  });
}

// ── Load current galaxy data ──────────────────────
async function loadGalaxyCustomization() {
  try {
    const res = await fetch(`${API_BASE}/galaxies/${galaxyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const galaxy = data.meta;
    if (!galaxy) return;
    if (galaxy.themeId) document.getElementById('themeSelect').value = galaxy.themeId;
    if (galaxy.backgroundMusicId) document.getElementById('musicSelect').value = galaxy.backgroundMusicId;
    if (galaxy.template) document.getElementById('templateSelect').value = galaxy.template;
    if (Array.isArray(galaxy.caption)) {
      currentCaptions = galaxy.caption;
      renderCaptions();
    }
  } catch (err) {
    console.error('Failed to load galaxy:', err);
  }
}

// ── Caption render + drag-and-drop ───────────────
function renderCaptions() {
  const list = document.getElementById('captionList');
  list.textContent = '';
  currentCaptions.forEach((caption, index) => {
    const item = document.createElement('div');
    item.className = 'caption-item';
    item.draggable = true;
    item.dataset.index = String(index);

    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.textContent = '⋮⋮';

    const text = document.createElement('span');
    text.className = 'caption-text';
    text.textContent = caption;

    const btn = document.createElement('button');
    btn.textContent = '\xD7';
    btn.addEventListener('click', () => removeCaption(index));

    item.appendChild(handle);
    item.appendChild(text);
    item.appendChild(btn);

    item.addEventListener('dragstart', onDragStart);
    item.addEventListener('dragover', onDragOver);
    item.addEventListener('dragleave', onDragLeave);
    item.addEventListener('drop', onDrop);
    item.addEventListener('dragend', onDragEnd);

    list.appendChild(item);
  });
}

function onDragStart(e) {
  dragSrcIndex = parseInt(this.dataset.index, 10);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

function onDragLeave() {
  this.classList.remove('drag-over');
}

function onDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  const targetIndex = parseInt(this.dataset.index, 10);
  if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
    const moved = currentCaptions.splice(dragSrcIndex, 1)[0];
    currentCaptions.splice(targetIndex, 0, moved);
    renderCaptions();
    scheduleSave();
  }
}

function onDragEnd() {
  document.querySelectorAll('.caption-item').forEach(el => {
    el.classList.remove('dragging', 'drag-over');
  });
  dragSrcIndex = null;
}

function removeCaption(index) {
  currentCaptions.splice(index, 1);
  renderCaptions();
  scheduleSave();
}

// ── Add caption ───────────────────────────────────
document.getElementById('addCaptionBtn').addEventListener('click', () => {
  const input = document.getElementById('captionInput');
  const text = input.value.trim();
  if (text) {
    currentCaptions.push(text);
    renderCaptions();
    input.value = '';
    scheduleSave();
  }
});

document.getElementById('captionInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addCaptionBtn').click();
});

// ── Trigger auto-save on select changes ──────────
document.getElementById('themeSelect').addEventListener('change', scheduleSave);
document.getElementById('musicSelect').addEventListener('change', scheduleSave);
document.getElementById('templateSelect').addEventListener('change', scheduleSave);

// ── Initialize ────────────────────────────────────
(async () => {
  await applySubscriptionLock();
  await loadOptions();
  await loadGalaxyCustomization();
})();

window.removeCaption = removeCaption;
