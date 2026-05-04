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

// ── Helpers ───────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtVND(n) { return Number(n).toLocaleString('vi-VN') + 'đ'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : '—'; }
function fmtDateTime(d) { return d ? new Date(d).toLocaleString('vi-VN') : '—'; }
function isBanned(u) { return u.lockedUntil && new Date(u.lockedUntil) > new Date(); }

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
  if (tab === 'media') { loadThemes(); loadMusics(); }
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
  tbody.innerHTML = `<tr><td colspan="6" class="loading">${window.t.adminLoading}</td></tr>`;
  try {
    const data = await api(`/admin/users?page=${usersPage}&limit=${USERS_LIMIT}&search=${encodeURIComponent(search)}&plan=${encodeURIComponent(plan)}`);
    const { users, total } = data.meta;
    usersTotal = total;
    renderUsersTable(users);
    updatePagination('users', usersPage, total, USERS_LIMIT);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">${esc(e.message)}</td></tr>`;
  }
}

function planBadge(sub) {
  if (!sub) return '<span class="badge badge-none">Không có</span>';
  return `<span class="badge badge-${esc(sub.plan)}">${esc(sub.plan.toUpperCase())}</span>`;
}

function roleBadge(role) {
  if (role === 'admin') return `<span class="badge badge-inactive">admin</span>`;
  if (role === 'partner') return `<span class="badge badge-partner">partner</span>`;
  return `<span class="badge badge-none">user</span>`;
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-tbody');
  if (!users.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Không có user nào</td></tr>'; return; }
  tbody.innerHTML = users.map(u => {
    const banned = isBanned(u);
    const statusBadge = banned
      ? `<span class="badge badge-banned">Banned</span>`
      : `<span class="badge ${u.isVerified ? 'badge-active' : 'badge-inactive'}">${u.isVerified ? 'Active' : 'Inactive'}</span>`;
    const uid = esc(u._id);
    const email = esc(u.email);
    return `
      <tr>
        <td>${email}</td>
        <td>${roleBadge(u.role)}</td>
        <td>${planBadge(u.subscription)}</td>
        <td>${u.subscription ? fmtDate(u.subscription.expiredAt) : '—'}</td>
        <td>${statusBadge}</td>
        <td style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="openDetail('${uid}','${email}')">Chi ti&#7871;t</button>
          <button class="btn btn-primary btn-sm" onclick="openGrant('${uid}','${email}')">C&#7845;p sub</button>
          <button class="btn ${banned ? 'btn-warning' : 'btn-danger'} btn-sm" onclick="banUser('${uid}','${email}',${!banned})">${banned ? 'Unban' : 'Ban'}</button>
        </td>
      </tr>
    `;
  }).join('');
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
  const email = document.getElementById('pay-search').value.trim();
  const status = document.getElementById('pay-status-filter').value;
  const plan = document.getElementById('pay-plan-filter').value;
  const tbody = document.getElementById('payments-tbody');
  tbody.innerHTML = `<tr><td colspan="6" class="loading">${window.t.adminLoading}</td></tr>`;
  try {
    const params = new URLSearchParams({ page: paymentsPage, limit: PAYMENTS_LIMIT });
    if (email) params.set('email', email);
    if (status) params.set('status', status);
    if (plan) params.set('plan', plan);
    const data = await api(`/admin/payments?${params}`);
    const { payments, total } = data.meta;
    paymentsTotal = total;
    if (!payments.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Không có kết quả</td></tr>'; return; }
    tbody.innerHTML = payments.map(p => `
      <tr>
        <td>${esc(p.buyerEmail)}</td>
        <td><span class="badge badge-${esc(p.plan)}">${esc(p.plan.toUpperCase())}</span></td>
        <td>${p.period === 'monthly' ? 'Tháng' : 'Năm'}</td>
        <td>${fmtVND(p.amount)}</td>
        <td><span class="badge badge-${esc(p.status)}">${esc(p.status)}</span></td>
        <td>${fmtDateTime(p.paidAt || p.createdAt)}</td>
      </tr>
    `).join('');
    updatePagination('payments', paymentsPage, total, PAYMENTS_LIMIT);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">${esc(e.message)}</td></tr>`;
  }
}

let paySearchTimer;
document.getElementById('pay-search').addEventListener('input', () => {
  clearTimeout(paySearchTimer);
  paySearchTimer = setTimeout(() => { paymentsPage = 1; loadPayments(); }, 400);
});
document.getElementById('pay-status-filter').addEventListener('change', () => { paymentsPage = 1; loadPayments(); });
document.getElementById('pay-plan-filter').addEventListener('change', () => { paymentsPage = 1; loadPayments(); });
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
    toast(window.t.adminGranted);
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
});

// ── Ban / Unban ───────────────────────────────────
async function banUser(userId, email, ban) {
  if (!confirm(ban ? `Ban user "${email}"?` : `Unban user "${email}"?`)) return;
  try {
    await api(`/admin/users/${userId}/ban`, { method: 'PATCH', body: JSON.stringify({ banned: ban }) });
    toast(ban ? `Đã ban ${email}` : `Đã unban ${email}`);
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
}

// ── User Detail Modal ─────────────────────────────
async function openDetail(userId, email) {
  document.getElementById('detail-title').textContent = email;
  document.getElementById('detail-content').innerHTML = `<div class="loading">${window.t.adminLoading}</div>`;
  document.getElementById('detail-modal').classList.add('open');
  try {
    const data = await api(`/admin/users/${userId}`);
    const { user, subscription, galaxies, payments } = data.meta;
    const banned = isBanned(user);
    const uid = esc(userId);
    const safeEmail = esc(user.email || email);

    const subSection = subscription
      ? `<div class="detail-row"><span class="key">Plan</span><span class="badge badge-${esc(subscription.plan)}">${esc(subscription.plan.toUpperCase())}</span></div>
         <div class="detail-row"><span class="key">${window.t.adminExpiry}</span><span>${fmtDate(subscription.expiredAt)}</span></div>
         <div class="detail-actions">
           <button class="btn btn-danger btn-sm" onclick="revokeSubscription('${uid}','${safeEmail}')">${window.t.adminRevokeBtn}</button>
         </div>`
      : `<div style="color:rgba(255,255,255,0.3);font-size:13px">${window.t.adminNoSub}</div>`;

    const galaxyRows = galaxies.length
      ? galaxies.map(g => `<div class="detail-row"><span class="key">${esc(g.name)}</span><span class="badge badge-${g.status === 'active' ? 'active' : 'inactive'}">${esc(g.status)}</span></div>`).join('')
      : `<div style="color:rgba(255,255,255,0.3);font-size:13px">${window.t.adminNoGalaxy}</div>`;

    const paymentRows = payments.length
      ? payments.map(p => `<div class="detail-row"><span class="key">${fmtDate(p.paidAt || p.createdAt)}</span><span><span class="badge badge-${esc(p.plan)}">${esc(p.plan)}</span> ${fmtVND(p.amount)} <span class="badge badge-${esc(p.status)}">${esc(p.status)}</span></span></div>`).join('')
      : '<div style="color:rgba(255,255,255,0.3);font-size:13px">Chưa có payment</div>';

    document.getElementById('detail-content').innerHTML = `
      <div class="detail-section">
        <h4>Thông tin</h4>
        <div class="detail-row">
          <span class="key">Role</span>
          <div style="display:flex;gap:6px;align-items:center">
            <select id="detail-role-select" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;color:#fff;font-size:12px;outline:none">
              <option value="user" ${user.role === 'user' ? 'selected' : ''}>user</option>
              <option value="partner" ${user.role === 'partner' ? 'selected' : ''}>partner</option>
              <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
            </select>
            <button class="btn btn-ghost btn-sm" onclick="saveRole('${uid}')">Lưu</button>
          </div>
        </div>
        <div class="detail-row">
          <span class="key">Verified</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span>${user.isVerified ? '✅ Active' : '❌ Inactive'}</span>
            <button class="btn btn-ghost btn-sm" onclick="toggleVerified('${uid}',${!user.isVerified},'${safeEmail}')">${user.isVerified ? 'Khoá' : 'Mở'}</button>
          </div>
        </div>
        <div class="detail-row"><span class="key">Tham gia</span><span>${fmtDate(user.createdAt)}</span></div>
        <div class="detail-row">
          <span class="key">Ban</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span>${banned ? `<span class="badge badge-banned">Đến ${fmtDate(user.lockedUntil)}</span>` : '<span style="color:rgba(255,255,255,0.35)">Bình thường</span>'}</span>
            <button class="btn ${banned ? 'btn-warning' : 'btn-danger'} btn-sm" onclick="banUser('${uid}','${safeEmail}',${!banned})">${banned ? 'Unban' : 'Ban'}</button>
          </div>
        </div>
      </div>
      <div class="detail-section"><h4>Subscription hiện tại</h4>${subSection}</div>
      <div class="detail-section"><h4>Galaxies (${galaxies.length})</h4>${galaxyRows}</div>
      <div class="detail-section"><h4>Lịch sử thanh toán</h4>${paymentRows}</div>
    `;
  } catch (e) {
    document.getElementById('detail-content').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}
document.getElementById('detail-close').addEventListener('click', () => document.getElementById('detail-modal').classList.remove('open'));

async function saveRole(userId) {
  const role = document.getElementById('detail-role-select').value;
  try {
    await api(`/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
    toast(window.t.adminRoleUpdated);
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
}

async function toggleVerified(userId, isVerified, email) {
  try {
    await api(`/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ isVerified }) });
    toast(isVerified ? window.t.adminUnlocked : window.t.adminLocked);
    openDetail(userId, email);
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
}

async function revokeSubscription(userId, email) {
  if (!confirm(window.t.adminConfirmRevoke)) return;
  try {
    await api(`/admin/users/${userId}/subscription`, { method: 'DELETE' });
    toast(window.t.adminRevoked);
    openDetail(userId, email);
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
}

// ── Init ──────────────────────────────────────────
loadStats();
loadAnalytics();
tabLoaded['dashboard'] = true;

// ── Media: Themes ─────────────────────────────────
async function loadThemes() {
  const tbody = document.getElementById('theme-table');
  tbody.innerHTML = `<tr><td colspan="4" class="loading">${window.t.adminLoading}</td></tr>`;
  try {
    const data = await api('/media/themes');
    const themes = data.meta || [];
    if (!themes.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">No themes yet</td></tr>'; return; }
    tbody.innerHTML = themes.map(t => {
      const colors = [t.colors?.primary, t.colors?.secondary, t.colors?.background].filter(Boolean)
        .map(c => `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${c};border:1px solid rgba(255,255,255,0.15);margin-right:3px" title="${c}"></span>`).join('');
      return `<tr>
        <td>${esc(t.name)}</td>
        <td>${colors}</td>
        <td><span class="badge ${t.status === 'active' ? 'badge-active' : 'badge-inactive'}">${esc(t.status)}</span></td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteTheme('${esc(t._id)}')">Delete</button></td>
      </tr>`;
    }).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteTheme(id) {
  if (!confirm('Delete this theme?')) return;
  try {
    await api(`/media/themes/${id}`, { method: 'DELETE' });
    toast('Theme deleted');
    loadThemes();
  } catch (e) { toast(e.message, 'error'); }
}

// Theme modal
document.getElementById('btn-add-theme').addEventListener('click', () => {
  document.getElementById('theme-modal').classList.add('open');
  document.getElementById('theme-modal-msg').textContent = '';
  const sync = (pickerId, textId) => {
    const picker = document.getElementById(pickerId), text = document.getElementById(textId);
    picker.addEventListener('input', () => { text.value = picker.value; });
    text.addEventListener('input', () => { if (/^#[0-9a-fA-F]{6}$/.test(text.value)) picker.value = text.value; });
  };
  sync('theme-primary-picker', 'theme-primary');
  sync('theme-secondary-picker', 'theme-secondary');
  sync('theme-bg-picker', 'theme-bg');
});
document.getElementById('btn-cancel-theme').addEventListener('click', () => {
  document.getElementById('theme-modal').classList.remove('open');
});
document.getElementById('btn-save-theme').addEventListener('click', async () => {
  const name = document.getElementById('theme-name').value.trim();
  const primary = document.getElementById('theme-primary').value.trim() || document.getElementById('theme-primary-picker').value;
  const secondary = document.getElementById('theme-secondary').value.trim() || document.getElementById('theme-secondary-picker').value;
  const bg = document.getElementById('theme-bg').value.trim() || document.getElementById('theme-bg-picker').value;
  const msgEl = document.getElementById('theme-modal-msg');
  if (!name) { msgEl.textContent = 'Theme name is required'; return; }
  try {
    await api('/media/themes', { method: 'POST', body: JSON.stringify({ name, colors: { primary, secondary, background: bg } }) });
    document.getElementById('theme-modal').classList.remove('open');
    document.getElementById('theme-name').value = '';
    toast('Theme added!');
    loadThemes();
  } catch (e) { msgEl.textContent = e.message; }
});

// ── Media: Music ──────────────────────────────────
async function loadMusics() {
  const tbody = document.getElementById('music-table');
  tbody.innerHTML = `<tr><td colspan="4" class="loading">${window.t.adminLoading}</td></tr>`;
  try {
    const data = await api('/media/musics');
    const musics = data.meta || [];
    if (!musics.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">No music yet</td></tr>'; return; }
    tbody.innerHTML = musics.map(m => `<tr>
      <td>${esc(m.name)}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,0.4);font-size:12px" title="${esc(m.url)}">${esc(m.url)}</td>
      <td><span class="badge ${m.status === 'active' ? 'badge-active' : 'badge-inactive'}">${esc(m.status)}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteMusic('${esc(m._id)}')">Delete</button></td>
    </tr>`).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteMusic(id) {
  if (!confirm('Delete this music?')) return;
  try {
    await api(`/media/musics/${id}`, { method: 'DELETE' });
    toast('Music deleted');
    loadMusics();
  } catch (e) { toast(e.message, 'error'); }
}

// Music modal
document.getElementById('btn-add-music').addEventListener('click', () => {
  document.getElementById('music-modal').classList.add('open');
});
document.getElementById('btn-cancel-music').addEventListener('click', () => {
  document.getElementById('music-modal').classList.remove('open');
  document.getElementById('music-name').value = '';
  document.getElementById('music-file').value = '';
});
document.getElementById('btn-save-music').addEventListener('click', async () => {
  const name = document.getElementById('music-name').value.trim();
  const file = document.getElementById('music-file').files[0];
  if (!name || !file) { toast('Name and file required', 'error'); return; }
  const btn = document.getElementById('btn-save-music');
  btn.disabled = true; btn.textContent = 'Uploading…';
  try {
    const formData = new FormData();
    formData.append('file', file);
    const uploadRes = await fetch('/media/upload-music', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: formData,
    });
    if (!uploadRes.ok) throw new Error('Upload failed');
    const uploadData = await uploadRes.json();
    await api('/media/musics', { method: 'POST', body: JSON.stringify({ name, url: uploadData.meta.url }) });
    document.getElementById('music-modal').classList.remove('open');
    document.getElementById('music-name').value = '';
    document.getElementById('music-file').value = '';
    toast('Music added!');
    loadMusics();
  } catch (e) { toast(e.message, 'error'); }
  btn.disabled = false; btn.textContent = 'Save';
});

// ── Analytics ─────────────────────────────────────
let cancelChart = null;

async function loadAnalytics() {
  try {
    const [statsData, paymentsData, chartData] = await Promise.all([
      api('/admin/stats'),
      api('/admin/payments?page=1&limit=10'),
      api('/admin/cancellation-chart?days=30'),
    ]);
    const s = statsData.meta;
    // stats already rendered by loadStats(), skip duplicate update

    const canvas = document.getElementById('aa-cancel-chart');
    if (canvas && window.Chart) {
      const labels = chartData.meta.map(d => d.date.slice(5));
      const rates = chartData.meta.map(d => d.rate);
      const successRates = chartData.meta.map(d => d.total > 0 ? Math.round((d.total - d.cancelled) / d.total * 100) : 0);
      if (cancelChart) cancelChart.destroy();
      cancelChart = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: window.t.adminChartSuccess, data: successRates, borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.08)', borderWidth: 2, pointRadius: 3, fill: true, tension: 0.3 },
            { label: window.t.adminChartCancel, data: rates, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)', borderWidth: 2, pointRadius: 3, fill: true, tension: 0.3 },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: 'rgba(255,255,255,0.5)', font: { size: 12 } } } },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { min: 0, max: 100, ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 11 }, callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          },
        },
      });
    }

    const tbody = document.getElementById('aa-payments-tbody');
    const payments = paymentsData.meta.payments;
    if (!payments.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">Chưa có payment</td></tr>'; return; }
    tbody.innerHTML = payments.map(p => {
      const bg = p.status === 'paid' ? 'badge-paid' : p.status === 'cancelled' ? 'badge-cancelled' : 'badge-pending';
      return `<tr>
        <td>${esc(p.buyerEmail)}</td>
        <td><span class="badge badge-${esc(p.plan)}">${esc(p.plan.toUpperCase())}</span></td>
        <td>${fmtVND(p.amount)}</td>
        <td><span class="badge ${bg}">${esc(p.status)}</span></td>
        <td>${fmtDateTime(p.paidAt || p.createdAt)}</td>
      </tr>`;
    }).join('');
  } catch (e) { toast(e.message, 'error'); }
}
