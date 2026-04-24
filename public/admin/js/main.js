const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'admin') {
  window.location.href = token ? '/portal/' : '/auth/';
}

document.getElementById('admin-email').textContent = user.email || '';
document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('token'); localStorage.removeItem('user');
  window.location.href = '/auth/';
});
document.getElementById('btn-portal').addEventListener('click', () => { window.location.href = '/portal/'; });

// ── Toast ─────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'toast show ' + type;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── API helper ────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error');
  return data;
}

function fmtVND(n) { return Number(n).toLocaleString('vi-VN') + 'đ'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : '—'; }
function fmtDateTime(d) { return d ? new Date(d).toLocaleString('vi-VN') : '—'; }

// ── Tab navigation ────────────────────────────────
const tabLoaded = {};
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-' + tab).classList.add('active');
    if (!tabLoaded[tab]) { tabLoaded[tab] = true; loadTab(tab); }
  });
});

function loadTab(tab) {
  if (tab === 'users') loadUsers();
  if (tab === 'payments') loadPayments();
}

// ── Dashboard ─────────────────────────────────────
async function loadStats() {
  try {
    const data = await api('/admin/stats');
    const s = data.meta;
    document.getElementById('stat-users').textContent = s.totalUsers;
    document.getElementById('stat-subs').textContent = s.activeSubs;
    document.getElementById('stat-revenue').textContent = fmtVND(s.monthRevenue);
    document.getElementById('stat-payments').textContent = s.totalPayments;
  } catch (e) { toast(e.message, 'error'); }
}

// ── Users ─────────────────────────────────────────
let usersPage = 1, usersTotal = 0;
const USERS_LIMIT = 20;

async function loadUsers() {
  const search = document.getElementById('user-search').value.trim();
  const plan = document.getElementById('user-plan-filter').value;
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading">Đang tải…</td></tr>';
  try {
    const data = await api(`/admin/users?page=${usersPage}&limit=${USERS_LIMIT}&search=${encodeURIComponent(search)}&plan=${plan}`);
    const { users, total } = data.meta;
    usersTotal = total;
    renderUsersTable(users);
    updatePagination('users', usersPage, total, USERS_LIMIT);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">${e.message}</td></tr>`;
  }
}

function planBadge(sub) {
  if (!sub) return '<span class="badge badge-none">Không có</span>';
  return `<span class="badge badge-${sub.plan}">${sub.plan.toUpperCase()}</span>`;
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-tbody');
  if (!users.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Không có user nào</td></tr>'; return; }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.email}</td>
      <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : u.role === 'partner' ? 'badge-pro' : 'badge-none'}">${u.role}</span></td>
      <td>${planBadge(u.subscription)}</td>
      <td>${u.subscription ? fmtDate(u.subscription.expiredAt) : '—'}</td>
      <td><span class="badge ${u.isVerified ? 'badge-active' : 'badge-inactive'}">${u.isVerified ? 'Active' : 'Inactive'}</span></td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" onclick="openDetail('${u._id}','${u.email}')">Chi tiết</button>
        <button class="btn btn-primary btn-sm" onclick="openGrant('${u._id}','${u.email}')">Cấp sub</button>
        <button class="btn btn-danger btn-sm" onclick="toggleStatus('${u._id}',${!u.isVerified})">${u.isVerified ? 'Khoá' : 'Mở'}</button>
      </td>
    </tr>
  `).join('');
}

let searchTimer;
document.getElementById('user-search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { usersPage = 1; loadUsers(); }, 400);
});
document.getElementById('user-plan-filter').addEventListener('change', () => { usersPage = 1; loadUsers(); });
document.getElementById('users-prev').addEventListener('click', () => { if (usersPage > 1) { usersPage--; loadUsers(); } });
document.getElementById('users-next').addEventListener('click', () => { if (usersPage * USERS_LIMIT < usersTotal) { usersPage++; loadUsers(); } });

// ── Payments ──────────────────────────────────────
let paymentsPage = 1, paymentsTotal = 0;
const PAYMENTS_LIMIT = 20;

async function loadPayments() {
  const tbody = document.getElementById('payments-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading">Đang tải…</td></tr>';
  try {
    const data = await api(`/admin/payments?page=${paymentsPage}&limit=${PAYMENTS_LIMIT}`);
    const { payments, total } = data.meta;
    paymentsTotal = total;
    if (!payments.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Chưa có payment nào</td></tr>'; return; }
    tbody.innerHTML = payments.map(p => `
      <tr>
        <td>${p.buyerEmail}</td>
        <td><span class="badge badge-${p.plan}">${p.plan.toUpperCase()}</span></td>
        <td>${p.period === 'monthly' ? 'Tháng' : 'Năm'}</td>
        <td>${fmtVND(p.amount)}</td>
        <td><span class="badge badge-${p.status}">${p.status}</span></td>
        <td>${fmtDateTime(p.paidAt || p.createdAt)}</td>
      </tr>
    `).join('');
    updatePagination('payments', paymentsPage, total, PAYMENTS_LIMIT);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">${e.message}</td></tr>`;
  }
}

document.getElementById('payments-prev').addEventListener('click', () => { if (paymentsPage > 1) { paymentsPage--; loadPayments(); } });
document.getElementById('payments-next').addEventListener('click', () => { if (paymentsPage * PAYMENTS_LIMIT < paymentsTotal) { paymentsPage++; loadPayments(); } });

// ── Pagination helper ─────────────────────────────
function updatePagination(prefix, page, total, limit) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  document.getElementById(prefix + '-page-info').textContent = `${from}–${to} / ${total}`;
  document.getElementById(prefix + '-prev').disabled = page <= 1;
  document.getElementById(prefix + '-next').disabled = page * limit >= total;
}

// ── Grant Sub Modal ───────────────────────────────
let grantUserId = null;
function openGrant(userId, email) {
  grantUserId = userId;
  document.getElementById('grant-email').textContent = email;
  document.getElementById('grant-modal').classList.add('open');
}
document.getElementById('grant-cancel').addEventListener('click', () => document.getElementById('grant-modal').classList.remove('open'));
document.getElementById('grant-confirm').addEventListener('click', async () => {
  const plan = document.getElementById('grant-plan').value;
  const days = parseInt(document.getElementById('grant-days').value);
  try {
    await api(`/admin/users/${grantUserId}/subscription`, { method: 'PATCH', body: JSON.stringify({ plan, days }) });
    document.getElementById('grant-modal').classList.remove('open');
    toast('Đã cấp subscription!');
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
});

// ── Toggle Status ─────────────────────────────────
async function toggleStatus(userId, isVerified) {
  try {
    await api(`/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ isVerified }) });
    toast(isVerified ? 'Đã mở khoá user' : 'Đã khoá user');
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
}

// ── User Detail Modal ─────────────────────────────
async function openDetail(userId, email) {
  document.getElementById('detail-title').textContent = email;
  document.getElementById('detail-content').innerHTML = '<div class="loading">Đang tải…</div>';
  document.getElementById('detail-modal').classList.add('open');
  try {
    const data = await api(`/admin/users/${userId}`);
    const { user, subscription, galaxies, payments } = data.meta;
    document.getElementById('detail-content').innerHTML = `
      <div class="detail-section">
        <h4>Thông tin</h4>
        <div class="detail-row"><span class="key">Role</span><span>${user.role}</span></div>
        <div class="detail-row"><span class="key">Verified</span><span>${user.isVerified ? '✅' : '❌'}</span></div>
        <div class="detail-row"><span class="key">Tham gia</span><span>${fmtDate(user.createdAt)}</span></div>
      </div>
      <div class="detail-section">
        <h4>Subscription hiện tại</h4>
        ${subscription
          ? `<div class="detail-row"><span class="key">Plan</span><span class="badge badge-${subscription.plan}">${subscription.plan.toUpperCase()}</span></div>
             <div class="detail-row"><span class="key">Hết hạn</span><span>${fmtDate(subscription.expiredAt)}</span></div>`
          : '<div style="color:rgba(255,255,255,0.3);font-size:13px">Không có subscription</div>'
        }
      </div>
      <div class="detail-section">
        <h4>Galaxies (${galaxies.length})</h4>
        ${galaxies.length ? galaxies.map(g => `
          <div class="detail-row"><span class="key">${g.name}</span><span class="badge badge-${g.status === 'active' ? 'active' : 'inactive'}">${g.status}</span></div>
        `).join('') : '<div style="color:rgba(255,255,255,0.3);font-size:13px">Chưa có galaxy</div>'}
      </div>
      <div class="detail-section">
        <h4>Lịch sử thanh toán</h4>
        ${payments.length ? payments.map(p => `
          <div class="detail-row">
            <span class="key">${fmtDate(p.paidAt || p.createdAt)}</span>
            <span><span class="badge badge-${p.plan}">${p.plan}</span> ${fmtVND(p.amount)} <span class="badge badge-${p.status}">${p.status}</span></span>
          </div>
        `).join('') : '<div style="color:rgba(255,255,255,0.3);font-size:13px">Chưa có payment</div>'}
      </div>
    `;
  } catch (e) {
    document.getElementById('detail-content').innerHTML = `<div class="empty">${e.message}</div>`;
  }
}
document.getElementById('detail-close').addEventListener('click', () => document.getElementById('detail-modal').classList.remove('open'));

// ── Init ──────────────────────────────────────────
loadStats();
tabLoaded['dashboard'] = true;
