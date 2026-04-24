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

// ── Admin API helper ──────────────────────────────
async function adminApi(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error');
  return data;
}

function fmtVND(n) { return Number(n).toLocaleString('vi-VN') + 'đ'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : '—'; }

// ── Users ─────────────────────────────────────────
let auPage = 1, auTotal = 0;

async function loadAdminUsers() {
  const search = document.getElementById('au-search')?.value.trim() || '';
  const plan = document.getElementById('au-plan')?.value || '';
  const tbody = document.getElementById('au-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="padding:28px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px">Đang tải…</td></tr>';
  try {
    const data = await adminApi(`/admin/users?page=${auPage}&limit=15&search=${encodeURIComponent(search)}&plan=${plan}`);
    const { users, total } = data.meta;
    auTotal = total;
    if (!users.length) { tbody.innerHTML = '<tr><td colspan="6" style="padding:28px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px">Không có user</td></tr>'; }
    else tbody.innerHTML = users.map(u => `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
        <td style="padding:11px 12px;font-size:13px">${u.email}</td>
        <td style="padding:11px 12px;font-size:12px;color:rgba(255,255,255,0.45)">${u.role}</td>
        <td style="padding:11px 12px">${u.subscription ? `<span style="background:rgba(139,92,246,0.2);color:#a78bfa;padding:2px 8px;border-radius:99px;font-size:11px">${u.subscription.plan.toUpperCase()}</span>` : '<span style="color:rgba(255,255,255,0.25);font-size:12px">—</span>'}</td>
        <td style="padding:11px 12px;font-size:12px;color:rgba(255,255,255,0.4)">${u.subscription ? fmtDate(u.subscription.expiredAt) : '—'}</td>
        <td style="padding:11px 12px"><span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${u.isVerified ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};color:${u.isVerified ? '#4ade80' : '#f87171'}">${u.isVerified ? 'Active' : 'Inactive'}</span></td>
        <td style="padding:11px 12px;display:flex;gap:6px">
          <button class="btn-view" style="padding:4px 10px;font-size:12px" onclick="openAuGrant('${u._id}','${u.email}')">Cấp sub</button>
          ${u.email !== (JSON.parse(localStorage.getItem('user')||'{}').email) ? `<button class="btn-delete-row" onclick="auToggle('${u._id}',${!u.isVerified})">${u.isVerified ? 'Khoá' : 'Mở'}</button>` : ''}
        </td>
      </tr>`).join('');
    const from = total === 0 ? 0 : (auPage - 1) * 15 + 1;
    const to = Math.min(auPage * 15, total);
    const info = document.getElementById('au-page-info');
    if (info) info.textContent = `${from}–${to} / ${total}`;
    const prev = document.getElementById('au-prev');
    const next = document.getElementById('au-next');
    if (prev) prev.disabled = auPage <= 1;
    if (next) next.disabled = auPage * 15 >= total;
  } catch (e) { showAdminToast(e.message, 'error'); }
}

let auSearchTimer;
document.getElementById('au-search')?.addEventListener('input', () => { clearTimeout(auSearchTimer); auSearchTimer = setTimeout(() => { auPage = 1; loadAdminUsers(); }, 400); });
document.getElementById('au-plan')?.addEventListener('change', () => { auPage = 1; loadAdminUsers(); });
document.getElementById('au-prev')?.addEventListener('click', () => { if (auPage > 1) { auPage--; loadAdminUsers(); } });
document.getElementById('au-next')?.addEventListener('click', () => { if (auPage * 15 < auTotal) { auPage++; loadAdminUsers(); } });

async function auToggle(userId, isVerified) {
  try {
    await adminApi(`/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ isVerified }) });
    showAdminToast(isVerified ? 'Đã mở khoá' : 'Đã khoá user', 'success');
    loadAdminUsers();
  } catch (e) { showAdminToast(e.message, 'error'); }
}

// Grant sub modal (inline)
let auGrantId = null;
function openAuGrant(userId, email) {
  auGrantId = userId;
  let modal = document.getElementById('au-grant-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'au-grant-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <h3>Cấp Subscription</h3>
        <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:14px">User: <strong id="au-grant-email" style="color:#c4b5fd"></strong></div>
        <label style="font-size:12px;color:rgba(255,255,255,0.4);display:block;margin-bottom:6px">Plan</label>
        <select id="au-grant-plan" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:9px 12px;color:#fff;font-size:13px;outline:none;margin-bottom:14px">
          <option value="plus">Plus</option>
          <option value="pro">Pro</option>
        </select>
        <label style="font-size:12px;color:rgba(255,255,255,0.4);display:block;margin-bottom:6px">Số ngày</label>
        <input type="number" id="au-grant-days" value="30" min="1" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:9px 12px;color:#fff;font-size:13px;outline:none;margin-bottom:18px" />
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn-cancel" id="au-grant-cancel">Huỷ</button>
          <button class="btn-create" id="au-grant-confirm">Cấp</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('au-grant-cancel').addEventListener('click', () => modal.classList.remove('open'));
    document.getElementById('au-grant-confirm').addEventListener('click', async () => {
      const plan = document.getElementById('au-grant-plan').value;
      const days = parseInt(document.getElementById('au-grant-days').value);
      try {
        await adminApi(`/admin/users/${auGrantId}/subscription`, { method: 'PATCH', body: JSON.stringify({ plan, days }) });
        modal.classList.remove('open');
        showAdminToast('Đã cấp subscription!', 'success');
        loadAdminUsers();
      } catch (e) { showAdminToast(e.message, 'error'); }
    });
  }
  document.getElementById('au-grant-email').textContent = email;
  modal.classList.add('open');
}

// ── Analytics ─────────────────────────────────────
let cancelChart = null;

async function loadAnalytics() {
  try {
    const [statsData, paymentsData, chartData] = await Promise.all([
      adminApi('/admin/stats'),
      adminApi('/admin/payments?page=1&limit=10'),
      adminApi('/admin/cancellation-chart?days=30'),
    ]);
    const s = statsData.meta;
    document.getElementById('aa-total-users').textContent = s.totalUsers;
    document.getElementById('aa-active-subs').textContent = s.activeSubs;
    document.getElementById('aa-revenue').textContent = fmtVND(s.monthRevenue);
    document.getElementById('aa-payments').textContent = s.totalPayments;

    // Chart
    const canvas = document.getElementById('aa-cancel-chart');
    if (canvas) {
      const labels = chartData.meta.map(d => d.date.slice(5)); // MM-DD
      const rates = chartData.meta.map(d => d.rate);
      const successRates = chartData.meta.map(d => d.total > 0 ? Math.round((d.total - d.cancelled) / d.total * 100) : 0);
      if (cancelChart) cancelChart.destroy();
      cancelChart = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Tỉ lệ thành công (%)',
              data: successRates,
              borderColor: '#4ade80',
              backgroundColor: 'rgba(74,222,128,0.08)',
              borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#4ade80',
              fill: true, tension: 0.3,
            },
            {
              label: 'Tỉ lệ hủy (%)',
              data: rates,
              borderColor: '#f87171',
              backgroundColor: 'rgba(248,113,113,0.08)',
              borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#f87171',
              fill: true, tension: 0.3,
            },
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
    if (!payments.length) { tbody.innerHTML = '<tr><td colspan="5" style="padding:28px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px">Chưa có payment</td></tr>'; return; }
    tbody.innerHTML = payments.map(p => `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
        <td style="padding:11px 12px;font-size:13px">${p.buyerEmail}</td>
        <td style="padding:11px 12px"><span style="background:rgba(139,92,246,0.2);color:#a78bfa;padding:2px 8px;border-radius:99px;font-size:11px">${p.plan.toUpperCase()}</span></td>
        <td style="padding:11px 12px;font-size:13px">${fmtVND(p.amount)}</td>
        <td style="padding:11px 12px"><span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${p.status === 'paid' ? 'rgba(34,197,94,0.15)' : p.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'};color:${p.status === 'paid' ? '#4ade80' : p.status === 'cancelled' ? '#f87171' : '#fbbf24'}">${p.status}</span></td>
        <td style="padding:11px 12px;font-size:12px;color:rgba(255,255,255,0.4)">${fmtDate(p.paidAt || p.createdAt)}</td>
      </tr>`).join('');
  } catch (e) { showAdminToast(e.message, 'error'); }
}

// Hook vào nav
document.querySelectorAll('.admin-nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if (item.dataset.section === 'users') loadAdminUsers();
    if (item.dataset.section === 'analytics') loadAnalytics();
  });
});

window.auToggle = auToggle;
window.openAuGrant = openAuGrant;
