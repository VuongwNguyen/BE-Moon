const params   = new URLSearchParams(location.search);
const galaxyId = params.get('galaxyId');
const token    = localStorage.getItem('token');

if (!token) window.location.href = '/auth/';
if (!galaxyId) window.location.href = '/portal/';

const chat = document.getElementById('chat');

const OPTIONAL_QUESTIONS = {
  highlight: {
    anniversary: 'Có khoảnh khắc đặc biệt nào bạn muốn lưu lại không?',
    confession:  'Có khoảnh khắc nào bạn nhận ra mình thích họ không?',
    missing:     'Có kỷ niệm nào bạn nhớ nhất không?',
    proposal:    'Có lý do nào bạn muốn chia sẻ thêm không?',
    birthday:    'Có điều gì bạn thích nhất ở họ muốn kể không?',
  },
};

let STORY_CONFIG = null;
let selectedStoryType = null;
let selectedOccasion = null;
const chapterFiles = {};
const chapterHooks = {};

// ── Chip prompt helper ────────────────────────────────────────────────────────

function askChips(options) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'chips-wrap';
    options.forEach(opt => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = opt.label;
      chip.addEventListener('click', () => {
        wrap.querySelectorAll('.chip').forEach(c => { c.classList.remove('on'); c.style.pointerEvents = 'none'; });
        chip.classList.add('on');
        if (opt.id !== '__cancel__') appendUMsg(opt.label);
        setTimeout(() => resolve(opt.id), 200);
      });
      wrap.appendChild(chip);
    });
    chat.appendChild(wrap);
    scrollBottom();
  });
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function scrollBottom() {
  chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
}

function makeLRow() {
  const row = document.createElement('div');
  row.className = 'lmsg';
  const av = document.createElement('div');
  av.className = 'av';
  av.textContent = 'L';
  row.appendChild(av);
  return row;
}

function appendLMsg(text, italicText) {
  const row = makeLRow();
  const bubble = document.createElement('div');
  bubble.className = 'lbubble';
  if (italicText) {
    const em = document.createElement('em');
    em.textContent = italicText;
    bubble.appendChild(em);
    if (text) {
      bubble.appendChild(document.createTextNode(' ' + text));
    }
  } else {
    bubble.textContent = text;
  }
  row.appendChild(bubble);
  chat.appendChild(row);
  scrollBottom();
  return row;
}

function appendLMsgWithNote(text, noteText) {
  const row = makeLRow();
  const bubble = document.createElement('div');
  bubble.className = 'lbubble';
  bubble.textContent = text;
  const note = document.createElement('span');
  note.className = 'done-note';
  note.textContent = noteText;
  bubble.appendChild(note);
  row.appendChild(bubble);
  chat.appendChild(row);
  scrollBottom();
}

function appendUMsg(text) {
  const row = document.createElement('div');
  row.className = 'umsg';
  const bubble = document.createElement('div');
  bubble.className = 'ububble';
  bubble.textContent = text;
  row.appendChild(bubble);
  chat.appendChild(row);
  scrollBottom();
}

function appendEl(el) {
  chat.appendChild(el);
  scrollBottom();
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function typingThen(text, italicText, delayMs = 700) {
  const row = makeLRow();
  const dots = document.createElement('div');
  dots.className = 'typing-dots';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    dots.appendChild(s);
  }
  row.appendChild(dots);
  chat.appendChild(row);
  scrollBottom();
  await wait(delayMs);
  row.remove();
  appendLMsg(text, italicText);
}

// ── API ───────────────────────────────────────────────────────────────────────

async function saveChapter(chapterId) {
  const files = chapterFiles[chapterId] || [];
  if (!files.length) return; // no new files — keep existing

  // Delete old photos for this chapter before uploading new ones (replace semantics)
  const oldIds = window._galleryIdsByChapter?.[chapterId] || [];
  await Promise.all(oldIds.map(id =>
    fetch(`/gallary/items/${id}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    })
  ));

  const form = new FormData();
  form.append('galaxyId', galaxyId);
  form.append('title', 'Uploaded image');
  form.append('description', 'Image uploaded from story setup');
  form.append('stage', chapterId);
  files.forEach(f => form.append('files', f));
  const res = await fetch('/gallary/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}

let _hookSaveTimer;
async function saveHookText() {
  clearTimeout(_hookSaveTimer);
  _hookSaveTimer = setTimeout(async () => {
    const chapters = STORY_CONFIG[selectedStoryType].occasions[selectedOccasion].chapters.map(ch => ({
      id: ch.id,
      hookText: chapterHooks[ch.id] || null,
    }));
    await fetch(`/galaxies/${galaxyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ chapters }),
    });
  }, 800);
}

async function saveStoryMeta(occasion) {
  const chapters = STORY_CONFIG[selectedStoryType].occasions[occasion].chapters.map(ch => ({
    id: ch.id,
    hookText: chapterHooks[ch.id] || null,
  }));
  const res = await fetch(`/galaxies/${galaxyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ storyType: selectedStoryType, occasion, chapters }),
  });
  if (!res.ok) throw new Error(`Save story failed: ${res.status}`);
}

// ── Left preview helpers ──────────────────────────────────────────────────────

function showChapterPreview(chapter, chapterIdx, totalChapters) {
  const localFiles = chapterFiles[chapter.id];
  if (localFiles && localFiles.length) {
    // Local selection takes priority — clear immediately, then load async
    window.setPreviewPhotoUrls?.([]); // clears slideshow + increments gen counter
    window.setPreviewPhotos?.(localFiles);
  } else {
    // Show server photos for THIS chapter only (keyed by stage = chapter.id)
    const serverUrls = window._galleryByChapter?.[chapter.id] || [];
    window.setPreviewPhotoUrls?.(serverUrls);
  }
  // Set bottom text directly — skip window bridge to avoid timing issues
  const occasionCfg = STORY_CONFIG?.[selectedStoryType]?.occasions?.[selectedOccasion];
  const hookText = chapterHooks[chapter.id]
    || window._dbChapterHooks?.[chapter.id]
    || chapter.hooks?.[0]
    || chapter.label;
  const labelEl = document.getElementById('se-bottom-label');
  const hookEl  = document.getElementById('se-bottom-hook');
  if (labelEl) {
    const num = String(chapterIdx + 1).padStart(2, '0');
    const tot = String(totalChapters).padStart(2, '0');
    labelEl.textContent = [(occasionCfg?.label || selectedOccasion || '').toUpperCase(), `${num} / ${tot}`].filter(Boolean).join(' · ');
  }
  if (hookEl) hookEl.textContent = hookText || '';
}

// ── Chapter card builder ──────────────────────────────────────────────────────

function buildChapterCard(chapter, chapterIdx, totalChapters, editMode = false) {
  const wrap = document.createElement('div');

  const card = document.createElement('div');
  card.className = 'ch-card';

  const head = document.createElement('div');
  head.className = 'ch-head';
  const num = document.createElement('div');
  num.className = 'ch-num';
  num.textContent = `Chương ${chapterIdx + 1} / ${totalChapters}`;
  const title = document.createElement('div');
  title.className = 'ch-title';
  title.textContent = chapter.label;
  head.appendChild(num);
  head.appendChild(title);
  head.style.cursor = 'pointer';
  head.addEventListener('click', () => showChapterPreview(chapter, chapterIdx, totalChapters));
  card.appendChild(head);

  const photosEl = document.createElement('div');
  photosEl.className = 'ch-photos';
  card.appendChild(photosEl);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = chapter.photoCount.max > 1;
  fileInput.style.display = 'none';
  card.appendChild(fileInput);

  function fileToDataUrl(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  async function renderPhotos() {
    photosEl.replaceChildren();
    const files = chapterFiles[chapter.id] || [];
    for (const file of files) {
      const ph = document.createElement('div');
      ph.className = 'ch-ph';
      const img = document.createElement('img');
      img.src = await fileToDataUrl(file);
      img.alt = '';
      ph.appendChild(img);
      photosEl.appendChild(ph);
    }
    if (files.length < chapter.photoCount.max) {
      const addPh = document.createElement('div');
      addPh.className = 'ch-ph';
      addPh.textContent = '+';
      addPh.addEventListener('click', () => fileInput.click());
      photosEl.appendChild(addPh);
    }
  }

  renderPhotos();

  fileInput.addEventListener('change', () => {
    const existing = chapterFiles[chapter.id] || [];
    const incoming = Array.from(fileInput.files);
    const merged = [...existing, ...incoming].slice(0, chapter.photoCount.max);
    chapterFiles[chapter.id] = merged;
    renderPhotos();
    nextBtn.disabled = false;
    if (!editMode) scrollBottom();
    showChapterPreview(chapter, chapterIdx, totalChapters);
  });

  const hookInput = document.createElement('textarea');
  hookInput.className = 'ch-hook-input';
  hookInput.rows = 2;
  hookInput.placeholder = chapter.hooks?.[0] || 'Câu hook cho chương này...';
  hookInput.value = chapterHooks[chapter.id] || window._dbChapterHooks?.[chapter.id] || '';
  hookInput.addEventListener('input', () => {
    chapterHooks[chapter.id] = hookInput.value;
    // Update left preview hook text live
    const hookEl = document.getElementById('se-bottom-hook');
    if (hookEl) hookEl.textContent = hookInput.value || hookInput.placeholder;
    saveHookText();
  });
  card.appendChild(hookInput);

  wrap.appendChild(card);

  const actionRow = document.createElement('div');
  actionRow.className = 'action-row';
  const nextBtn = document.createElement('button');

  if (editMode) {
    nextBtn.className = 'btn-next';
    nextBtn.disabled = true;
    nextBtn.textContent = '↑ Lưu ảnh';
    nextBtn.addEventListener('click', async () => {
      nextBtn.disabled = true;
      nextBtn.textContent = 'Đang lưu…';
      try {
        await saveChapter(chapter.id);
        nextBtn.textContent = '✓ Đã lưu';
        chapterFiles[chapter.id] = [];
        setTimeout(() => { nextBtn.textContent = '↑ Lưu ảnh'; nextBtn.disabled = true; }, 2000);
      } catch {
        nextBtn.disabled = false;
        nextBtn.textContent = '↑ Lưu ảnh';
      }
    });
  } else {
    nextBtn.className = 'btn-next';
    nextBtn.disabled = chapter.required;
    nextBtn.textContent = 'Tiếp →';
  }

  actionRow.appendChild(nextBtn);
  wrap.appendChild(actionRow);

  return { wrap, nextBtn, fileInput };
}

// ── Chapter runners ───────────────────────────────────────────────────────────

async function runChapter(chapter, chapterIdx, totalChapters) {
  showChapterPreview(chapter, chapterIdx, totalChapters);
  await typingThen(null, window._dbChapterHooks?.[chapter.id] || chapter.hooks?.[0] || chapter.label);
  const { wrap, nextBtn } = buildChapterCard(chapter, chapterIdx, totalChapters);
  appendEl(wrap);
  await new Promise((resolve, reject) => {
    nextBtn.addEventListener('click', async () => {
      nextBtn.disabled = true;
      nextBtn.textContent = 'Đang lưu…';
      try {
        await saveChapter(chapter.id);
        resolve();
      } catch (err) {
        nextBtn.disabled = false;
        nextBtn.textContent = 'Tiếp →';
        reject(err);
      }
    }, { once: true });
  });
}

async function runOptionalChapter(chapter, chapterIdx, totalChapters, occasion) {
  showChapterPreview(chapter, chapterIdx, totalChapters);
  const question = OPTIONAL_QUESTIONS[chapter.id]?.[occasion]
    || `Có ${chapter.label.toLowerCase()} nào bạn muốn thêm không?`;
  await typingThen(question);

  const yesno = document.createElement('div');
  yesno.className = 'btn-yesno';
  const btnYes = document.createElement('button');
  btnYes.className = 'btn-yes';
  btnYes.textContent = 'Có 🫧';
  const btnNo = document.createElement('button');
  btnNo.className = 'btn-no';
  btnNo.textContent = 'Không có';
  yesno.appendChild(btnYes);
  yesno.appendChild(btnNo);
  appendEl(yesno);

  const userSaidYes = await new Promise(resolve => {
    btnYes.addEventListener('click', () => { yesno.replaceChildren(); appendUMsg('Có 🫧'); resolve(true); }, { once: true });
    btnNo.addEventListener('click',  () => { yesno.replaceChildren(); appendUMsg('Không có'); resolve(false); }, { once: true });
  });

  if (userSaidYes) {
    const { wrap, nextBtn } = buildChapterCard(chapter, chapterIdx, totalChapters);
    nextBtn.disabled = false;
    appendEl(wrap);
    await new Promise((resolve, reject) => {
      nextBtn.addEventListener('click', async () => {
        nextBtn.disabled = true;
        nextBtn.textContent = 'Đang lưu…';
        try {
          await saveChapter(chapter.id);
          resolve();
        } catch (err) {
          nextBtn.disabled = false;
          nextBtn.textContent = 'Tiếp →';
          reject(err);
        }
      }, { once: true });
    });
  }
}

async function runLastChapter(chapter, chapterIdx, totalChapters) {
  showChapterPreview(chapter, chapterIdx, totalChapters);
  await typingThen(null, window._dbChapterHooks?.[chapter.id] || chapter.hooks?.[0] || chapter.label);
  const { wrap, nextBtn } = buildChapterCard(chapter, chapterIdx, totalChapters);
  nextBtn.textContent = 'Hoàn thành ✓';
  nextBtn.classList.add('done');
  appendEl(wrap);
  await new Promise((resolve, reject) => {
    nextBtn.addEventListener('click', async () => {
      nextBtn.disabled = true;
      nextBtn.textContent = 'Đang lưu…';
      try {
        await saveChapter(chapter.id);
        await saveStoryMeta(selectedOccasion);
        appendLMsgWithNote('Câu chuyện của bạn đã sẵn sàng ✨', 'Đang chuyển về trang quản lý…');
        await wait(1800);
        window.location.href = `/portal/galaxy.html?galaxyId=${galaxyId}`;
        resolve();
      } catch (err) {
        nextBtn.disabled = false;
        nextBtn.textContent = 'Hoàn thành ✓';
        reject(err);
      }
    }, { once: true });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function init() {
  const [cfgRes, galaxyRes] = await Promise.all([
    fetch('/shared/story-config.json'),
    fetch(`/galaxies/${galaxyId}`, { headers: { Authorization: 'Bearer ' + token } }),
  ]);

  if (!galaxyRes.ok || !cfgRes.ok) { window.location.href = '/portal/'; return; }

  STORY_CONFIG = await cfgRes.json();
  const galaxy = (await galaxyRes.json()).meta;

  const gName = galaxy.name || 'Galaxy';
  document.getElementById('galaxy-name').textContent = gName;
  document.getElementById('back-link').href = `/portal/galaxy-setup.html?galaxyId=${galaxyId}`;
  window.updateSEPreview?.(null, null, gName);

  // Store DB hookText per chapter (user customized in v1, null in v2)
  window._dbChapterHooks = {};
  (galaxy.chapters || []).forEach(ch => {
    if (ch.hookText) window._dbChapterHooks[ch.id] = ch.hookText;
  });

  // Load gallery grouped by chapter (stage)
  const galleryRes = await fetch(`/gallary/my-items?galaxyId=${galaxyId}`, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (galleryRes.ok) {
    const items = (await galleryRes.json()).meta || [];
    const byChapter = {};
    const idsByChapter = {};
    items.forEach(item => {
      const s = item.stage || '__none__';
      if (!byChapter[s]) byChapter[s] = [];
      if (!idsByChapter[s]) idsByChapter[s] = [];
      byChapter[s].push(item.imageUrl);
      idsByChapter[s].push(item._id);
    });
    window._galleryByChapter = byChapter;
    window._galleryIdsByChapter = idsByChapter;
  }

  // ── Edit mode: galaxy đã có story → skip setup, vào edit chapters ──
  if (galaxy.storyType && galaxy.occasion) {
    selectedStoryType = galaxy.storyType;
    selectedOccasion  = galaxy.occasion;

    const typeLabel = STORY_CONFIG[galaxy.storyType]?.labelVi || galaxy.storyType;
    const occLabel  = STORY_CONFIG[galaxy.storyType]?.occasions?.[galaxy.occasion]?.label || galaxy.occasion;
    window.updateSEPreview?.(galaxy.storyType, occLabel, gName);

    await typingThen(`Câu chuyện "${occLabel}" đã được tạo ✓`, null, 400);

    let chapters = STORY_CONFIG[galaxy.storyType].occasions[galaxy.occasion].chapters;
    showChapterPreview(chapters[0], 0, chapters.length);

    // ── Conversational edit loop ──
    while (true) {
      await typingThen('Bạn muốn chỉnh sửa gì?');

      const action = await askChips([
        { id: 'photos', label: '📸 Sửa ảnh' },
        { id: 'hook',   label: '✍️ Sửa hook text' },
        { id: 'story',  label: '📖 Sửa câu chuyện' },
        { id: 'done',   label: 'Xong rồi ✓' },
      ]);

      if (action === 'done') {
        await typingThen('Tuyệt! Galaxy đã sẵn sàng 🌙');
        await wait(1200);
        window.location.href = `/portal/galaxy-setup.html?galaxyId=${galaxyId}`;
        return;
      }

      // ── Story type / occasion change ──
      if (action === 'story') {
        await typingThen('Chọn loại câu chuyện:');
        const typeOpts = Object.entries(STORY_CONFIG).map(([id, cfg]) => ({ id, label: cfg.labelVi || cfg.label }));
        typeOpts.push({ id: '__cancel__', label: '← Hủy' });
        const newType = await askChips(typeOpts);
        if (newType === '__cancel__') continue;

        await typingThen('Chọn dịp:');
        const occOpts = Object.entries(STORY_CONFIG[newType].occasions).map(([id, cfg]) => ({ id, label: cfg.label }));
        occOpts.push({ id: '__cancel__', label: '← Hủy' });
        const newOcc = await askChips(occOpts);
        if (newOcc === '__cancel__') continue;

        const newOccLabel = STORY_CONFIG[newType].occasions[newOcc].label;
        await fetch(`/galaxies/${galaxyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ storyType: newType, occasion: newOcc, chapters: [] }),
        });
        selectedStoryType = newType;
        selectedOccasion  = newOcc;
        chapters = STORY_CONFIG[newType].occasions[newOcc].chapters;
        window.updateSEPreview?.(newType, newOccLabel, null);
        showChapterPreview(chapters[0], 0, chapters.length);
        await typingThen(`✓ Đã đổi sang "${newOccLabel}"`);
        continue;
      }

      // Pick chapter
      await typingThen(action === 'photos' ? 'Chương nào bạn muốn sửa ảnh?' : 'Chương nào bạn muốn sửa hook?');

      const chOpts = chapters.map((ch, i) => ({ id: String(i), label: ch.label }));
      chOpts.push({ id: '__cancel__', label: '← Hủy' });

      const chChoice = await askChips(chOpts);
      if (chChoice === '__cancel__') continue;

      const chIdx = parseInt(chChoice);
      const ch = chapters[chIdx];
      showChapterPreview(ch, chIdx, chapters.length);

      // Show chapter card (photos + hook input)
      const { wrap } = buildChapterCard(ch, chIdx, chapters.length, true);
      appendEl(wrap);

      if (action === 'hook') {
        const ta = wrap.querySelector('.ch-hook-input');
        if (ta) setTimeout(() => ta.focus(), 150);
      }

      // Ask what next
      await typingThen('Đã chỉnh xong chưa?');
      const next = await askChips([
        { id: 'more', label: 'Sửa thêm' },
        { id: 'done', label: 'Xong rồi ✓' },
      ]);

      if (next === 'done') {
        await typingThen('Tuyệt! Galaxy đã sẵn sàng 🌙');
        await wait(1200);
        window.location.href = `/portal/galaxy-setup.html?galaxyId=${galaxyId}`;
        return;
      }
      // else continue loop
    }
  }

  // Step 1 — Story type (new setup)
  await typingThen('Câu chuyện này thuộc loại nào?', null, 500);

  const typeWrap = document.createElement('div');
  typeWrap.className = 'chips-wrap';
  Object.entries(STORY_CONFIG).forEach(([id, type]) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = type.labelVi || type.label;
    chip.dataset.id = id;
    typeWrap.appendChild(chip);
  });
  appendEl(typeWrap);

  selectedStoryType = await new Promise(resolve => {
    typeWrap.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        typeWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
        chip.classList.add('on');
        setTimeout(() => {
          appendUMsg(chip.textContent);
          typeWrap.querySelectorAll('.chip').forEach(c => { c.style.pointerEvents = 'none'; });
          window.updateSEPreview?.(chip.dataset.id, null, null);
          resolve(chip.dataset.id);
        }, 200);
      });
    });
  });

  // Step 2 — Occasion
  await typingThen('Dịp này là...?');

  const occasions = STORY_CONFIG[selectedStoryType].occasions;
  const chipsWrap = document.createElement('div');
  chipsWrap.className = 'chips-wrap';
  Object.entries(occasions).forEach(([id, occ]) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = occ.label;
    chip.dataset.id = id;
    chipsWrap.appendChild(chip);
  });
  appendEl(chipsWrap);

  selectedOccasion = await new Promise(resolve => {
    chipsWrap.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chipsWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
        chip.classList.add('on');
        setTimeout(() => {
          appendUMsg(chip.textContent);
          chipsWrap.querySelectorAll('.chip').forEach(c => { c.style.pointerEvents = 'none'; });
          window.updateSEPreview?.(selectedStoryType, chip.textContent, null);
          resolve(chip.dataset.id);
        }, 200);
      });
    });
  });

  // Step 3..N — Chapters
  const chapters = occasions[selectedOccasion].chapters;
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const isLast = i === chapters.length - 1;
    if (isLast) {
      await runLastChapter(ch, i, chapters.length);
    } else if (ch.required) {
      await runChapter(ch, i, chapters.length);
    } else {
      await runOptionalChapter(ch, i, chapters.length, selectedOccasion);
    }
  }
}

init().catch(err => {
  console.error('[story-setup] init failed:', err);
});
