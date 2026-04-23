const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/';

const user = JSON.parse(localStorage.getItem('user') || '{}');
document.getElementById('user-email').textContent = user.email || '';

// Admin: show link to admin panel
if (user.role === 'admin') {
  const adminLink = document.createElement('a');
  adminLink.href = '/admin/';
  adminLink.textContent = '🛡️ Admin Panel';
  adminLink.style.cssText = 'font-size:13px;color:#ff9f9f;text-decoration:none;margin-left:12px;opacity:0.8;';
  document.getElementById('user-email').appendChild(adminLink);
}

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
    const a = document.createElement('a');
    a.className = 'galaxy-card';
    a.href = '/galaxy-moon/?galaxyId=' + g._id;
    a.target = '_blank';

    const name = document.createElement('div');
    name.className = 'galaxy-name';
    name.textContent = g.name;

    const status = document.createElement('div');
    status.className = 'galaxy-status';
    status.textContent = g.status;

    const id = document.createElement('div');
    id.className = 'galaxy-id';
    id.textContent = g._id;

    a.appendChild(name);
    a.appendChild(status);
    a.appendChild(id);
    grid.appendChild(a);
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
