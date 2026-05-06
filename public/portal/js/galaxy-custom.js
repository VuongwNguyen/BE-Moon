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
    el.textContent = window.t.saving;
  } else if (status === 'saved') {
    el.classList.add('saved');
    el.textContent = window.t.saved;
    setTimeout(() => { el.textContent = ''; el.className = 'save-indicator'; }, 2000);
  } else if (status === 'error') {
    el.classList.add('error');
    el.textContent = window.t.saveFailed;
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
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const payload = { themeId, backgroundMusicId: musicId, caption: currentCaptions };
  if (user.role === 'admin') {
    payload.template = document.getElementById('templateSelect').value || 'galaxy';
  }
  try {
    const res = await fetch(`${API_BASE}/galaxies/${galaxyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setSaveStatus('saved');
    } else if (res.status === 403) {
      const data = await res.json();
      setSaveStatus('error');
      showToast(window.t.needPlanSave(data.message), 'error');
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
  msg.innerHTML = `${window.t.needPlan(planLabel)}&nbsp;&nbsp;<a href="/portal/">${window.t.upgrade}</a>`;
  section.appendChild(msg);
}

async function applySubscriptionLock() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.role === 'admin') {
    document.getElementById('templateSection').style.display = 'block';
    return;
  }
  if (user.role === 'partner') return;
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

// ── Story Setup Flow ──────────────────────────────────────────────────────────
(async function initStorySetup() {
  const params   = new URLSearchParams(location.search);
  const galaxyId = params.get('galaxyId');
  const isSetup  = params.get('setup') === 'true';
  const token    = localStorage.getItem('token');

  if (!galaxyId || !isSetup) return;

  const configRes  = await fetch('/shared/story-config.json');
  const STORY_CONFIG = await configRes.json();

  const galaxyRes = await fetch(`/galaxies/${galaxyId}`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  const galaxy = galaxyRes.ok ? (await galaxyRes.json()).meta : null;

  // Galaxy đã setup rồi thì bỏ qua
  if (galaxy && galaxy.storyType) return;

  const setupSection = document.getElementById('story-setup-section');
  if (!setupSection) return;
  setupSection.style.display = 'block';

  // Ẩn phần customization bình thường trong lúc setup
  const customSection = document.getElementById('customization-section');
  if (customSection) customSection.style.display = 'none';

  let selectedType      = null;
  let selectedOccasion  = null;
  let currentChapterIdx = 0;
  const chapterFiles    = {};   // { chapterId: File[] }
  const chapterHooks    = {};   // { chapterId: string }

  const stepType     = document.getElementById('step-type');
  const stepOccasion = document.getElementById('step-occasion');
  const stepChapters = document.getElementById('step-chapters');
  const occasionList = document.getElementById('occasion-list');
  const chapterProg  = document.getElementById('chapter-progress');
  const chapterContent = document.getElementById('chapter-content');

  function getChapters() {
    return STORY_CONFIG[selectedType].occasions[selectedOccasion].chapters;
  }

  // Step 1 — Story Type
  document.querySelectorAll('.story-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedType = btn.dataset.type;
      renderOccasions();
      stepType.style.display = 'none';
      stepOccasion.style.display = 'block';
    });
  });

  // Step 2 — Occasion
  function renderOccasions() {
    occasionList.replaceChildren();
    const occasions = STORY_CONFIG[selectedType].occasions;
    Object.entries(occasions).forEach(([id, occ]) => {
      const btn = document.createElement('button');
      btn.className = 'occasion-btn';
      btn.textContent = occ.label;
      btn.addEventListener('click', () => {
        selectedOccasion  = id;
        currentChapterIdx = 0;
        Object.keys(chapterFiles).forEach(k => delete chapterFiles[k]);
        Object.keys(chapterHooks).forEach(k => delete chapterHooks[k]);
        stepOccasion.style.display = 'none';
        stepChapters.style.display = 'block';
        renderChapter(currentChapterIdx);
      });
      occasionList.appendChild(btn);
    });
  }

  document.getElementById('btn-back-type').addEventListener('click', () => {
    stepOccasion.style.display = 'none';
    stepType.style.display = 'block';
  });

  document.getElementById('btn-back-occasion').addEventListener('click', () => {
    stepChapters.style.display = 'none';
    stepOccasion.style.display = 'block';
  });

  // Step 3 — Chapters
  function renderChapter(idx) {
    const chapters = getChapters();
    const ch       = chapters[idx];
    const isLast   = idx === chapters.length - 1;

    chapterProg.textContent = `Chương ${idx + 1} / ${chapters.length}`;
    chapterContent.replaceChildren();

    // Title
    const titleEl = document.createElement('h2');
    titleEl.style.cssText = 'font-size:1.1em;margin-bottom:8px;color:var(--text)';
    titleEl.textContent = ch.label;
    if (!ch.required) {
      const optTag = document.createElement('span');
      optTag.style.cssText = 'font-size:0.72em;color:var(--text-sub);margin-left:8px';
      optTag.textContent = '(không bắt buộc)';
      titleEl.appendChild(optTag);
    }
    chapterContent.appendChild(titleEl);

    // Hook text
    const hookWrap = document.createElement('div');
    hookWrap.className = 'chapter-hook-area';
    const hookLabel = document.createElement('div');
    hookLabel.className = 'chapter-hook-label';
    hookLabel.textContent = 'Lời dẫn (để trống = dùng gợi ý Lumora)';
    const hookTA = document.createElement('textarea');
    hookTA.className = 'chapter-hook-textarea';
    hookTA.placeholder = ch.hooks[0];
    hookTA.value = chapterHooks[ch.id] || '';
    hookTA.addEventListener('input', () => { chapterHooks[ch.id] = hookTA.value.trim(); });
    hookWrap.appendChild(hookLabel);
    hookWrap.appendChild(hookTA);
    chapterContent.appendChild(hookWrap);

    // Upload
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = ch.photoCount.max > 1;
    fileInput.style.display = 'none';

    const uploadZone = document.createElement('div');
    uploadZone.className = 'chapter-upload-zone';
    uploadZone.textContent = `Chọn ảnh (${ch.photoCount.min}–${ch.photoCount.max} ảnh)`;
    uploadZone.addEventListener('click', () => fileInput.click());

    const preview = document.createElement('div');
    preview.className = 'chapter-photos-preview';

    function refreshPreview() {
      preview.replaceChildren();
      (chapterFiles[ch.id] || []).forEach(file => {
        const img = document.createElement('img');
        img.className = 'chapter-photo-thumb';
        img.src = URL.createObjectURL(file);
        preview.appendChild(img);
      });
      nextBtn.disabled = ch.required && !(chapterFiles[ch.id] || []).length;
    }

    fileInput.addEventListener('change', () => {
      chapterFiles[ch.id] = Array.from(fileInput.files).slice(0, ch.photoCount.max);
      refreshPreview();
    });

    chapterContent.appendChild(fileInput);
    chapterContent.appendChild(uploadZone);
    chapterContent.appendChild(preview);

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-next-chapter';
    nextBtn.textContent = isLast ? 'Hoàn thành ✓' : 'Chương tiếp →';
    nextBtn.disabled = ch.required && !(chapterFiles[ch.id] || []).length;
    nextBtn.addEventListener('click', async () => {
      nextBtn.disabled = true;
      nextBtn.textContent = 'Đang lưu...';
      await saveChapter(ch.id);
      if (isLast) { await saveStoryMeta(); finishSetup(); }
      else { currentChapterIdx++; renderChapter(currentChapterIdx); }
    });
    chapterContent.appendChild(nextBtn);

    // Skip button (optional only)
    if (!ch.required) {
      const skipBtn = document.createElement('button');
      skipBtn.className = 'btn-skip-chapter';
      skipBtn.textContent = 'Bỏ qua chương này';
      skipBtn.addEventListener('click', async () => {
        if (isLast) { await saveStoryMeta(); finishSetup(); }
        else { currentChapterIdx++; renderChapter(currentChapterIdx); }
      });
      chapterContent.appendChild(skipBtn);
    }

    refreshPreview();
  }

  async function saveChapter(chapterId) {
    const files = chapterFiles[chapterId] || [];
    if (!files.length) return;
    const form = new FormData();
    form.append('galaxyId', galaxyId);
    form.append('title', 'Uploaded image');
    form.append('description', 'Image uploaded from portal');
    form.append('stage', chapterId);
    files.forEach(f => form.append('files', f));
    await fetch('/gallary/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: form,
    });
  }

  async function saveStoryMeta() {
    const chapters = getChapters().map(ch => ({
      id:       ch.id,
      hookText: chapterHooks[ch.id] || null,
    }));
    await fetch(`/galaxies/${galaxyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ storyType: selectedType, occasion: selectedOccasion, chapters }),
    });
  }

  function finishSetup() {
    window.location.href = `/portal/galaxy.html?galaxyId=${galaxyId}`;
  }
})();

window.removeCaption = removeCaption;
