const params   = new URLSearchParams(location.search);
const galaxyId = params.get('galaxyId');
const token    = localStorage.getItem('token');

if (!token) window.location.href = '/auth/';
if (!galaxyId) window.location.href = '/portal/';

let galaxy       = null;
let galleryItems = [];
let themes       = [];
let musics       = [];
let currentAudio = null;

const frame = document.getElementById('preview-frame');
const toast = document.getElementById('toast');

// ── Helpers ────────────────────────────────────────────────

let toastTimer;
function showToast(msg, duration = 2200) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function clear(node) { node.replaceChildren(); }

function refreshPreview() {
  frame.classList.add('loading');
  frame.src = `/view/?galaxyId=${galaxyId}&skip_se=true&_t=${Date.now()}`;
  frame.onload = () => frame.classList.remove('loading');
}

// ── Checklist ──────────────────────────────────────────────

function updateChecklist() {
  const checks = [
    { id: 'check-photos', done: galleryItems.length > 0 },
    { id: 'check-theme',  done: !!galaxy.themeId },
    { id: 'check-music',  done: !!galaxy.backgroundMusicId },
    { id: 'check-story',  done: !!galaxy.storyType },
  ];
  let done = 0;
  checks.forEach(({ id, done: isDone }) => {
    document.getElementById(id).classList.toggle('done', isDone);
    if (isDone) done++;
  });
  document.getElementById('progress-fill').style.width = Math.round(done / checks.length * 100) + '%';
  document.getElementById('progress-label').textContent = `${done} / ${checks.length} hoàn thành`;
}

// ── Gallery ────────────────────────────────────────────────

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  clear(grid);
  galleryItems.forEach(item => {
    const wrap = el('div', 'gallery-thumb');
    const img  = el('img');
    img.src = item.imageUrl; img.alt = '';
    const delBtn = el('button', 'del-btn', '✕');
    delBtn.onclick = (e) => { e.stopPropagation(); deletePhoto(item._id); };
    wrap.appendChild(img);
    wrap.appendChild(delBtn);
    grid.appendChild(wrap);
  });
}

async function deletePhoto(imageId) {
  try {
    await fetch(`/gallary/items/${imageId}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    });
    galleryItems = galleryItems.filter(i => i._id !== imageId);
    renderGallery();
    updateChecklist();
    refreshPreview();
  } catch { showToast('Xoá thất bại'); }
}

function handleUpload(files) {
  if (!files.length) return;
  const form = new FormData();
  form.append('galaxyId', galaxyId);
  form.append('title', 'Uploaded image');
  form.append('description', 'Image uploaded from portal');
  Array.from(files).forEach(f => form.append('files', f));

  const progBar  = document.getElementById('upload-progress');
  const progFill = document.getElementById('upload-progress-fill');
  progBar.style.display = 'block';

  const xhr = new XMLHttpRequest();
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) progFill.style.width = Math.round(e.loaded / e.total * 100) + '%';
  };
  xhr.onload = async () => {
    progBar.style.display = 'none';
    progFill.style.width = '0%';
    if (xhr.status >= 200 && xhr.status < 300) {
      const res = await fetch(`/gallary/my-items?galaxyId=${galaxyId}`, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) galleryItems = (await res.json()).meta || [];
      renderGallery();
      updateChecklist();
      refreshPreview();
      showToast('✓ Tải ảnh thành công');
    } else {
      showToast('Tải ảnh thất bại');
    }
  };
  xhr.onerror = () => { progBar.style.display = 'none'; showToast('Lỗi kết nối'); };
  xhr.open('POST', '/gallary/upload');
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.send(form);
}

// ── Theme ──────────────────────────────────────────────────

function renderThemes() {
  const wrap = document.getElementById('theme-content');
  clear(wrap);

  if (!themes.length) {
    const empty = el('div', 'empty-state');
    empty.appendChild(el('div', 'empty-state-icon', '🎨'));
    empty.appendChild(el('div', null, 'Chưa có theme nào.'));
    wrap.appendChild(empty);
    return;
  }

  const grid = el('div', 'theme-grid');

  const noTheme = el('div', 'theme-no' + (!galaxy.themeId ? ' selected' : ''), '— Không có');
  noTheme.onclick = () => applyTheme(null);
  grid.appendChild(noTheme);

  themes.forEach(th => {
    const card = el('div', 'theme-card' + (galaxy.themeId === th._id ? ' selected' : ''));
    if (th.previewUrl) {
      const img = el('img'); img.src = th.previewUrl; img.alt = th.name;
      card.appendChild(img);
    } else {
      const ph = el('div');
      ph.style.cssText = 'aspect-ratio:16/9;background:rgba(139,92,246,0.15);display:flex;align-items:center;justify-content:center;font-size:24px;';
      ph.textContent = '🎨';
      card.appendChild(ph);
    }
    card.appendChild(el('div', 'theme-name', th.name));
    card.onclick = () => applyTheme(th._id, th.name);
    grid.appendChild(card);
  });

  wrap.appendChild(grid);
}

async function applyTheme(themeId, name) {
  try {
    await fetch(`/galaxies/${galaxyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ themeId }),
    });
    galaxy.themeId = themeId;
    renderThemes();
    updateChecklist();
    refreshPreview();
    showToast(themeId ? `✓ Đã chọn: ${name}` : '✓ Đã bỏ giao diện');
  } catch { showToast('Lưu thất bại'); }
}

// ── Music ──────────────────────────────────────────────────

function renderMusics() {
  const wrap = document.getElementById('music-content');
  clear(wrap);

  if (!musics.length) {
    const empty = el('div', 'empty-state');
    empty.appendChild(el('div', 'empty-state-icon', '🎵'));
    empty.appendChild(el('div', null, 'Chưa có nhạc nào.'));
    wrap.appendChild(empty);
    return;
  }

  const noMusic = el('div', 'music-no' + (!galaxy.backgroundMusicId ? ' selected' : ''), '— Không có nhạc');
  noMusic.onclick = () => applyMusic(null);
  wrap.appendChild(noMusic);

  musics.forEach(m => {
    const item = el('div', 'music-item' + (galaxy.backgroundMusicId === m._id ? ' selected' : ''));

    const playBtn = el('div', 'music-play', '▶');
    playBtn.onclick = (e) => { e.stopPropagation(); togglePreviewMusic(m.url, playBtn); };

    const info = el('div', 'music-info');
    info.appendChild(el('div', 'music-name', m.name));

    item.appendChild(playBtn);
    item.appendChild(info);
    item.onclick = () => applyMusic(m._id, m.name);
    wrap.appendChild(item);
  });
}

function togglePreviewMusic(url, btn) {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    document.querySelectorAll('.music-play').forEach(b => b.textContent = '▶');
    if (currentAudio.src.includes(url)) { currentAudio = null; return; }
  }
  currentAudio = new Audio(url);
  currentAudio.play();
  btn.textContent = '■';
  currentAudio.onended = () => { btn.textContent = '▶'; };
}

async function applyMusic(musicId, name) {
  try {
    await fetch(`/galaxies/${galaxyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ backgroundMusicId: musicId }),
    });
    galaxy.backgroundMusicId = musicId;
    renderMusics();
    updateChecklist();
    refreshPreview();
    showToast(musicId ? `✓ Đã chọn: ${name}` : '✓ Đã bỏ nhạc nền');
  } catch { showToast('Lưu thất bại'); }
}

// ── Story ──────────────────────────────────────────────────

function renderStory() {
  const wrap = document.getElementById('story-content');
  clear(wrap);

  if (galaxy.storyType) {
    const status = el('div', 'story-status');
    status.appendChild(el('div', 'story-badge', '✓ Story Experience đã được tạo'));
    status.appendChild(el('div', 'story-type-label', galaxy.storyType));
    if (galaxy.occasion) status.appendChild(el('div', 'story-occ', galaxy.occasion));
    wrap.appendChild(status);
  } else {
    const empty = el('div', 'empty-state');
    empty.appendChild(el('div', 'empty-state-icon', '🎭'));
    empty.appendChild(el('div', null, 'Story Experience biến galaxy thành một cuộc trò chuyện cảm xúc trước khi người nhận bước vào.'));
    wrap.appendChild(empty);
  }

  const btn = el('button', 'btn-story', galaxy.storyType ? '✏️ Chỉnh sửa Story' : '✦ Tạo Story Experience');
  btn.onclick = () => { window.location.href = `/portal/story-setup.html?galaxyId=${galaxyId}`; };
  wrap.appendChild(btn);
}

// ── Tabs ───────────────────────────────────────────────────

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabId));
}

// ── Init ───────────────────────────────────────────────────

async function init() {
  try {
    const [galaxyRes, galleryRes, themesRes, musicsRes] = await Promise.all([
      fetch(`/galaxies/${galaxyId}`, { headers: { Authorization: 'Bearer ' + token } }),
      fetch(`/gallary/my-items?galaxyId=${galaxyId}`, { headers: { Authorization: 'Bearer ' + token } }),
      fetch('/media/themes'),
      fetch('/media/musics'),
    ]);

    if (!galaxyRes.ok) { window.location.href = '/portal/'; return; }

    const galaxyData   = await galaxyRes.json();
    const galleryData  = galleryRes.ok  ? await galleryRes.json()  : {};
    const themesData   = themesRes.ok   ? await themesRes.json()   : {};
    const musicsData   = musicsRes.ok   ? await musicsRes.json()   : {};

    galaxy       = galaxyData.meta;
    galleryItems = galleryData.meta  || [];
    themes       = themesData.meta   || [];
    musics       = musicsData.meta   || [];

    document.getElementById('galaxy-name').textContent = galaxy.name || 'Galaxy';
    document.title = `${galaxy.name || 'Galaxy'} — Lumora`;
    document.getElementById('back-link').href = `/portal/galaxy.html?galaxyId=${galaxyId}`;

    frame.src = `/view/?galaxyId=${galaxyId}&skip_se=true`;
    frame.onload = () => frame.classList.remove('loading');

    renderGallery();
    renderThemes();
    renderMusics();
    renderStory();
    updateChecklist();

  } catch (err) {
    console.error('[galaxy-setup] init error:', err);
    showToast('Lỗi tải dữ liệu');
  }
}

// ── Events ─────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => switchTab(btn.dataset.tab);
});

document.querySelectorAll('.check-item').forEach(item => {
  item.onclick = () => switchTab(item.dataset.tab);
});

const zone      = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
zone.onclick    = () => fileInput.click();
fileInput.onchange = () => handleUpload(fileInput.files);
zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('dragover'); };
zone.ondragleave = () => zone.classList.remove('dragover');
zone.ondrop = (e) => {
  e.preventDefault();
  zone.classList.remove('dragover');
  handleUpload(e.dataTransfer.files);
};

document.getElementById('share-btn').onclick = () => {
  const url = `${location.origin}/view/?galaxyId=${galaxyId}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => showToast('✓ Đã sao chép link!'));
  } else {
    showToast(url);
  }
};

init();
