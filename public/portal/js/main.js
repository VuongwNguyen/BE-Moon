const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/';

const user = JSON.parse(localStorage.getItem('user') || '{}');
document.getElementById('user-email').textContent = user.email || '';

// Admin: show admin panel button
if (user.role === 'admin') {
  const btn = document.getElementById('btn-admin-panel');
  const divider = document.getElementById('settings-divider');
  if (btn) {
    btn.style.display = '';
    if (divider) divider.style.display = '';
    btn.addEventListener('click', () => { window.location.href = '/admin/'; });
  }
}

// Settings dropdown
const settingsBtn = document.getElementById('btn-settings');
const settingsMenu = document.getElementById('settings-menu');
settingsBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  settingsMenu.classList.toggle('open');
});
document.addEventListener('click', function() { settingsMenu.classList.remove('open'); });

// Goto account tab from dropdown
document.getElementById('btn-goto-account').addEventListener('click', function() {
  settingsMenu.classList.remove('open');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-account').classList.add('active');
});

// Tab switching
document.querySelectorAll('.tab-btn[data-tab]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    const tab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('panel-' + tab).classList.add('active');
    if (tab === 'subscription' && window._loadSubscription) {
      window._loadSubscription();
    }
  });
});

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/auth/';
}

function openModal() {
  document.getElementById('modal').classList.add('open');
  document.getElementById('galaxy-name').value = '';
  document.getElementById('modal-msg').textContent = '';
  document.getElementById('btn-create').disabled = false;
  document.getElementById('btn-create').textContent = window.t.btnCreate;
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

async function loadGalaxies() {
  const grid = document.getElementById('galaxy-grid');
  grid.textContent = '';
  try {
    const res = await fetch('/galaxies/my', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.status === 401) { logout(); return; }
    const data = await res.json();
    renderGalaxies(grid, data.meta || []);
  } catch {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = window.t.errLoadData;
    grid.appendChild(p);
  }
}

function renderGalaxies(grid, galaxies) {
  grid.textContent = '';
  if (!galaxies.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = window.t.emptyGalaxies;
    grid.appendChild(p);
    return;
  }
  galaxies.forEach(function(g) {
    const card = document.createElement('div');
    card.className = 'galaxy-card';
    card.dataset.galaxyId = g._id;

    // ── Header: name + view shortcut ──────────────────
    const header = document.createElement('div');
    header.className = 'galaxy-card-header';

    const name = document.createElement('div');
    name.className = 'galaxy-name';
    name.textContent = g.name;

    const viewQuick = document.createElement('button');
    viewQuick.className = 'btn-view-quick';
    viewQuick.title = window.t.btnView || 'Xem';
    viewQuick.textContent = '↗';
    viewQuick.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(`/view/?galaxyId=${g._id}`, '_blank');
    });

    header.appendChild(name);
    header.appendChild(viewQuick);

    // ── Meta: template + status ────────────────────────
    const meta = document.createElement('div');
    meta.className = 'galaxy-meta';

    const tmpl = document.createElement('div');
    tmpl.className = 'galaxy-template-badge';
    tmpl.textContent = g.template === 'fall' ? '🍂 Fall' : '🌌 Galaxy';

    const status = document.createElement('div');
    status.className = `galaxy-status${g.status !== 'active' ? ' inactive' : ''}`;
    status.textContent = g.status;

    meta.appendChild(tmpl);
    meta.appendChild(status);

    // ── Actions: manage + copy link ───────────────────
    const actions = document.createElement('div');
    actions.className = 'galaxy-actions';

    const manageBtn = document.createElement('button');
    manageBtn.className = 'btn-manage';
    manageBtn.textContent = window.t.btnManage || 'Quản lý';
    manageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `/portal/galaxy.html?galaxyId=${g._id}`;
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-copy-link';
    copyBtn.title = 'Copy link chia sẻ';
    copyBtn.textContent = '🔗';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = `${window.location.origin}/view/?galaxyId=${g._id}`;
      const onCopied = () => {
        copyBtn.textContent = '✓';
        copyBtn.classList.add('copied');
        setTimeout(() => { copyBtn.textContent = '🔗'; copyBtn.classList.remove('copied'); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(onCopied);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        onCopied();
      }
    });

    actions.appendChild(manageBtn);
    actions.appendChild(copyBtn);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(actions);

    card.addEventListener('click', () => {
      window.location.href = `/portal/galaxy.html?galaxyId=${g._id}`;
    });

    grid.appendChild(card);
  });
}

document.getElementById('btn-logout').addEventListener('click', logout);
document.getElementById('btn-open-modal').addEventListener('click', openModal);
document.getElementById('btn-cancel').addEventListener('click', closeModal);

document.getElementById('btn-create').addEventListener('click', async function() {
  const name = document.getElementById('galaxy-name').value.trim();
  const msg = document.getElementById('modal-msg');
  const btn = document.getElementById('btn-create');
  if (!name) { msg.textContent = window.t.errGalaxyName; return; }
  btn.disabled = true;
  btn.textContent = window.t.creating;
  try {
    const res = await fetch('/galaxies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ name: name })
    });
    const data = await res.json();
    if (!res.ok) {
      msg.textContent = data.message || window.t.errGeneric;
      btn.disabled = false;
      btn.textContent = window.t.btnCreate;
      return;
    }
    closeModal();
    loadGalaxies();
  } catch {
    msg.textContent = window.t.errConnect;
    btn.disabled = false;
    btn.textContent = window.t.btnCreate;
  }
});

loadGalaxies();

// ── Account tab ───────────────────────────────────────────────────────────────

function setAccMsg(id, text, isError) {
  var el = document.getElementById(id);
  el.textContent = text;
  el.style.color = isError ? 'var(--red)' : 'var(--green)';
}

document.getElementById('btn-change-pw').addEventListener('click', async function() {
  var currentPw = document.getElementById('acc-current-pw').value;
  var newPw = document.getElementById('acc-new-pw').value;
  var confirmPw = document.getElementById('acc-confirm-pw').value;
  setAccMsg('msg-change-pw', '', false);

  if (newPw !== confirmPw) { setAccMsg('msg-change-pw', window.t.errPasswordMismatch, true); return; }

  var btn = this;
  btn.disabled = true;
  btn.textContent = window.t.processing;
  try {
    var res = await fetch('/auth/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    var data = await res.json();
    if (!res.ok) { setAccMsg('msg-change-pw', data.message || window.t.errGeneric, true); return; }
    setAccMsg('msg-change-pw', window.t.changePasswordSuccess, false);
    document.getElementById('acc-current-pw').value = '';
    document.getElementById('acc-new-pw').value = '';
    document.getElementById('acc-confirm-pw').value = '';
    setTimeout(logout, 2000);
  } catch { setAccMsg('msg-change-pw', window.t.errConnect, true); }
  finally { btn.disabled = false; btn.textContent = window.t.btnChangePassword; }
});

document.getElementById('btn-delete-account').addEventListener('click', async function() {
  var pw = document.getElementById('acc-delete-pw').value;
  setAccMsg('msg-delete-account', '', false);
  if (!pw) { setAccMsg('msg-delete-account', window.t.placeholderPassword, true); return; }

  var btn = this;
  btn.disabled = true;
  try {
    var res = await fetch('/auth/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ password: pw }),
    });
    var data = await res.json();
    if (!res.ok) { setAccMsg('msg-delete-account', data.message || window.t.errGeneric, true); return; }
    setAccMsg('msg-delete-account', window.t.deleteAccountSuccess, false);
    setTimeout(logout, 1500);
  } catch { setAccMsg('msg-delete-account', window.t.errConnect, true); }
  finally { btn.disabled = false; }
});
