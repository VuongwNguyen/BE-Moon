const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// Guard: non-admin bị redirect về portal
if (!token || user.role !== 'admin') {
  window.location.href = token ? '/portal/' : '/auth/';
}

document.getElementById('admin-email').textContent = user.email || '';

document.getElementById('btn-logout').addEventListener('click', function() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/auth/';
});

document.getElementById('btn-portal').addEventListener('click', function() {
  window.location.href = '/portal/';
});
