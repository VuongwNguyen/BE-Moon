const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/';

const user = JSON.parse(localStorage.getItem('user') || '{}');
document.getElementById('user-email').textContent = user.email || '';

// Admin: show admin tab
if (user.role === 'admin') {
  document.getElementById('tab-admin').style.display = '';
}

// Tab switching
document.querySelectorAll('.tab-btn[data-tab]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    const tab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('panel-' + tab).classList.add('active');
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
  document.getElementById('btn-create').textContent = 'Tạo';
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
    p.textContent = 'Lỗi tải dữ liệu';
    grid.appendChild(p);
  }
}

function renderGalaxies(grid, galaxies) {
  grid.textContent = '';
  if (!galaxies.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Chưa có galaxy nào. Tạo ngay!';
    grid.appendChild(p);
    return;
  }
  galaxies.forEach(function(g) {
    const card = document.createElement('div');
    card.className = 'galaxy-card';
    card.dataset.galaxyId = g._id;

    const name = document.createElement('div');
    name.className = 'galaxy-name';
    name.textContent = g.name;

    const status = document.createElement('div');
    status.className = 'galaxy-status';
    status.textContent = g.status;

    const idRow = document.createElement('div');
    idRow.className = 'galaxy-id-row';

    const id = document.createElement('div');
    id.className = 'galaxy-id';
    id.textContent = g._id;

    const copyIdBtn = document.createElement('button');
    copyIdBtn.className = 'btn-copy-id';
    copyIdBtn.title = 'Copy ID';
    copyIdBtn.textContent = '⎘';
    copyIdBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const link = `${window.location.origin}/galaxy-moon/?galaxyId=${g._id}`;
      navigator.clipboard.writeText(link).then(() => {
        copyIdBtn.textContent = '✓';
        setTimeout(() => { copyIdBtn.textContent = '⎘'; }, 1500);
      });
    });

    idRow.appendChild(id);
    idRow.appendChild(copyIdBtn);

    const actions = document.createElement('div');
    actions.className = 'galaxy-actions';

    const manageBtn = document.createElement('button');
    manageBtn.className = 'btn-manage';
    manageBtn.textContent = 'Manage';
    manageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `/portal/galaxy.html?galaxyId=${g._id}`;
    });

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn-view';
    viewBtn.textContent = 'View ↗';
    viewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(`/galaxy-moon/?galaxyId=${g._id}`, '_blank');
    });

    actions.appendChild(manageBtn);
    actions.appendChild(viewBtn);
    card.appendChild(name);
    card.appendChild(status);
    card.appendChild(idRow);
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
  if (!name) { msg.textContent = 'Nhập tên galaxy'; return; }
  btn.disabled = true;
  btn.textContent = 'Đang tạo...';
  try {
    const res = await fetch('/galaxies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ name: name })
    });
    const data = await res.json();
    if (!res.ok) {
      msg.textContent = data.message || 'Lỗi';
      btn.disabled = false;
      btn.textContent = 'Tạo';
      return;
    }
    closeModal();
    loadGalaxies();
  } catch {
    msg.textContent = 'Lỗi kết nối';
    btn.disabled = false;
    btn.textContent = 'Tạo';
  }
});

loadGalaxies();
