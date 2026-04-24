const API = window.location.origin;
const authToken = localStorage.getItem('token');

// ── Toast ─────────────────────────────────────────
function showAdminToast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast ' + (type || '');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

// ── Skeleton loading ──────────────────────────────
function setTableLoading(tbodyId, cols) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.textContent = '';
  for (let i = 0; i < 3; i++) {
    const tr = document.createElement('tr');
    for (let j = 0; j < cols; j++) {
      const td = document.createElement('td');
      td.style.padding = '12px';
      const skel = document.createElement('div');
      skel.className = 'skel';
      td.appendChild(skel);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

// ── Button loading state ──────────────────────────
function setBtnLoading(btnId, loading, label) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = '';
  if (loading) {
    const spin = document.createElement('span');
    spin.style.cssText = 'display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;margin-right:6px;vertical-align:middle';
    btn.appendChild(spin);
  }
  btn.appendChild(document.createTextNode(label));
}

// ── Color field sync ──────────────────────────────
function setupColorField(pickerId, textId) {
  const picker = document.getElementById(pickerId);
  const text = document.getElementById(textId);
  if (!picker || !text) return;
  picker.addEventListener('input', () => { text.value = picker.value; });
  text.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(text.value)) picker.value = text.value;
  });
}

// ── Load themes ───────────────────────────────────
async function loadThemes() {
  setTableLoading('theme-table', 4);
  try {
    const res = await fetch(`${API}/media/themes`);
    const data = await res.json();
    const themes = data.meta || [];
    const tbody = document.getElementById('theme-table');
    tbody.textContent = '';

    if (themes.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.style.cssText = 'padding:24px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px';
      td.textContent = 'No themes yet';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    themes.forEach(t => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.style.padding = '12px';
      tdName.textContent = t.name;

      const tdColors = document.createElement('td');
      tdColors.style.padding = '12px';
      const colors = [t.colors?.primary, t.colors?.secondary, t.colors?.background].filter(Boolean);
      colors.forEach(c => {
        const swatch = document.createElement('span');
        swatch.className = 'color-swatch';
        swatch.style.background = c;
        swatch.title = c;
        tdColors.appendChild(swatch);
      });

      const tdStatus = document.createElement('td');
      tdStatus.style.padding = '12px';
      tdStatus.style.color = 'rgba(255,255,255,0.45)';
      tdStatus.style.fontSize = '12px';
      tdStatus.textContent = t.status;

      const tdAction = document.createElement('td');
      tdAction.style.padding = '12px';
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete-row';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => deleteTheme(t._id));
      tdAction.appendChild(delBtn);

      tr.appendChild(tdName);
      tr.appendChild(tdColors);
      tr.appendChild(tdStatus);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showAdminToast('Failed to load themes', 'error');
  }
}

// ── Load musics ───────────────────────────────────
async function loadMusics() {
  setTableLoading('music-table', 4);
  try {
    const res = await fetch(`${API}/media/musics`);
    const data = await res.json();
    const musics = data.meta || [];
    const tbody = document.getElementById('music-table');
    tbody.textContent = '';

    if (musics.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.style.cssText = 'padding:24px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px';
      td.textContent = 'No music yet';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    musics.forEach(m => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.style.padding = '12px';
      tdName.textContent = m.name;

      const tdUrl = document.createElement('td');
      tdUrl.style.cssText = 'padding:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,0.4);font-size:12px';
      tdUrl.textContent = m.url;
      tdUrl.title = m.url;

      const tdStatus = document.createElement('td');
      tdStatus.style.cssText = 'padding:12px;color:rgba(255,255,255,0.45);font-size:12px';
      tdStatus.textContent = m.status;

      const tdAction = document.createElement('td');
      tdAction.style.padding = '12px';
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete-row';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => deleteMusic(m._id));
      tdAction.appendChild(delBtn);

      tr.appendChild(tdName);
      tr.appendChild(tdUrl);
      tr.appendChild(tdStatus);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showAdminToast('Failed to load music', 'error');
  }
}

// ── Theme modal ───────────────────────────────────
document.getElementById('btn-add-theme')?.addEventListener('click', () => {
  document.getElementById('theme-modal').classList.add('open');
  document.getElementById('theme-modal-msg').textContent = '';
  setupColorField('theme-primary-picker', 'theme-primary');
  setupColorField('theme-secondary-picker', 'theme-secondary');
  setupColorField('theme-bg-picker', 'theme-bg');
});

document.getElementById('btn-cancel-theme')?.addEventListener('click', () => {
  document.getElementById('theme-modal').classList.remove('open');
  ['theme-name', 'theme-primary', 'theme-secondary', 'theme-bg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
});

document.getElementById('btn-save-theme')?.addEventListener('click', async () => {
  const name = document.getElementById('theme-name').value.trim();
  const primary = document.getElementById('theme-primary').value.trim() ||
                  document.getElementById('theme-primary-picker').value;
  const secondary = document.getElementById('theme-secondary').value.trim() ||
                    document.getElementById('theme-secondary-picker').value;
  const bg = document.getElementById('theme-bg').value.trim() ||
             document.getElementById('theme-bg-picker').value;

  const msgEl = document.getElementById('theme-modal-msg');
  if (!name) { msgEl.textContent = 'Theme name is required'; return; }

  setBtnLoading('btn-save-theme', true, 'Saving…');
  try {
    const res = await fetch(`${API}/media/themes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name, colors: { primary, secondary, background: bg } }),
    });
    if (res.ok) {
      document.getElementById('theme-modal').classList.remove('open');
      ['theme-name', 'theme-primary', 'theme-secondary', 'theme-bg'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      showAdminToast('Theme added!', 'success');
      loadThemes();
    } else {
      const d = await res.json();
      msgEl.textContent = d.message || 'Failed to save';
    }
  } catch {
    msgEl.textContent = 'Connection error';
  }
  setBtnLoading('btn-save-theme', false, 'Save');
});

async function deleteTheme(id) {
  if (!confirm('Delete this theme?')) return;
  try {
    const res = await fetch(`${API}/media/themes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) { showAdminToast('Theme deleted', 'success'); loadThemes(); }
    else showAdminToast('Failed to delete', 'error');
  } catch { showAdminToast('Connection error', 'error'); }
}

// ── Music modal ───────────────────────────────────
document.getElementById('btn-add-music')?.addEventListener('click', () => {
  document.getElementById('music-modal').classList.add('open');
});

document.getElementById('btn-cancel-music')?.addEventListener('click', () => {
  document.getElementById('music-modal').classList.remove('open');
  document.getElementById('music-name').value = '';
  document.getElementById('music-file').value = '';
});

document.getElementById('btn-save-music')?.addEventListener('click', async () => {
  const name = document.getElementById('music-name').value.trim();
  const file = document.getElementById('music-file').files[0];
  if (!name || !file) { showAdminToast('Name and file required', 'error'); return; }

  setBtnLoading('btn-save-music', true, 'Uploading…');
  try {
    const formData = new FormData();
    formData.append('file', file);
    const uploadRes = await fetch(`${API}/media/upload-music`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    if (!uploadRes.ok) { showAdminToast('Upload failed', 'error'); return; }

    const uploadData = await uploadRes.json();
    setBtnLoading('btn-save-music', true, 'Saving…');

    const res = await fetch(`${API}/media/musics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name, url: uploadData.meta.url }),
    });
    if (res.ok) {
      document.getElementById('music-modal').classList.remove('open');
      document.getElementById('music-name').value = '';
      document.getElementById('music-file').value = '';
      showAdminToast('Music added!', 'success');
      loadMusics();
    } else {
      showAdminToast('Failed to save music', 'error');
    }
  } catch { showAdminToast('Connection error', 'error'); }
  setBtnLoading('btn-save-music', false, 'Save');
});

async function deleteMusic(id) {
  if (!confirm('Delete this music?')) return;
  try {
    const res = await fetch(`${API}/media/musics/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) { showAdminToast('Music deleted', 'success'); loadMusics(); }
    else showAdminToast('Failed to delete', 'error');
  } catch { showAdminToast('Connection error', 'error'); }
}

// ── Nav + init ────────────────────────────────────
document.querySelectorAll('.admin-nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById('admin-' + item.dataset.section);
    if (section) section.classList.add('active');
  });
});

const adminTab = document.querySelector('[data-tab="admin"]');
if (adminTab) {
  adminTab.addEventListener('click', () => { loadThemes(); loadMusics(); });
}

window.deleteTheme = deleteTheme;
window.deleteMusic = deleteMusic;
