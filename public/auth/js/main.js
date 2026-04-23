import { playTransition } from './transition.js';

var mode = 'login';
var pendingEmail = '';
var resendTimer = null;

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
  });
  document.getElementById('screen-' + name).classList.add('active');
}

function setMsg(id, text, type) {
  var el = document.getElementById(id);
  el.className = 'msg' + (type ? ' ' + type : '');
  el.textContent = text;
}

function setLoading(btnId, loading, label) {
  var btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.textContent = '';
  if (loading) {
    var spinner = document.createElement('span');
    spinner.className = 'spinner';
    btn.appendChild(spinner);
  }
  var text = document.createTextNode(label);
  btn.appendChild(text);
}

function startResendCountdown(seconds) {
  var btn = document.getElementById('btn-resend');
  btn.disabled = true;
  var remaining = seconds;
  btn.textContent = 'Gửi lại sau ' + remaining + 's';
  resendTimer = setInterval(function() {
    remaining--;
    if (remaining <= 0) {
      clearInterval(resendTimer);
      btn.disabled = false;
      btn.textContent = 'Gửi lại OTP';
    } else {
      btn.textContent = 'Gửi lại sau ' + remaining + 's';
    }
  }, 1000);
}

function showOtpScreen(email, countdown) {
  pendingEmail = email;
  document.getElementById('otp-email-display').textContent = email;
  document.getElementById('otp').value = '';
  setMsg('msg-otp', '', '');
  setLoading('verify-btn', false, 'Xác thực');
  showScreen('otp');
  if (resendTimer) clearInterval(resendTimer);
  startResendCountdown(countdown || 60);
}

document.getElementById('tab-login').addEventListener('click', function() {
  mode = 'login';
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-register').classList.remove('active');
  setLoading('submit-btn', false, 'Đăng nhập');
  setMsg('msg-auth', '', '');
});

document.getElementById('tab-register').addEventListener('click', function() {
  mode = 'register';
  document.getElementById('tab-register').classList.add('active');
  document.getElementById('tab-login').classList.remove('active');
  setLoading('submit-btn', false, 'Đăng ký');
  setMsg('msg-auth', '', '');
});

document.getElementById('back-btn').addEventListener('click', function() {
  showScreen('auth');
});

document.getElementById('form-auth').addEventListener('submit', async function(e) {
  e.preventDefault();
  var email = document.getElementById('email').value;
  var password = document.getElementById('password').value;
  var label = mode === 'login' ? 'Đăng nhập' : 'Đăng ký';
  setMsg('msg-auth', '', '');
  setLoading('submit-btn', true, 'Đang xử lý...');

  try {
    var res = await fetch('/auth/' + mode, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
    });
    var data = await res.json();

    if (res.status === 403 && data.message && data.message.includes('not verified')) {
      showOtpScreen(email);
      return;
    }
    if (!res.ok) {
      setMsg('msg-auth', data.message || 'Có lỗi xảy ra', 'error');
      setLoading('submit-btn', false, label);
      return;
    }
    if (mode === 'register') {
      showOtpScreen(email);
      return;
    }
    localStorage.setItem('token', data.meta.token);
    localStorage.setItem('user', JSON.stringify(data.meta.user));
    setMsg('msg-auth', 'Thành công!', 'success');
    playTransition(data.meta.user.role === 'admin' ? '/admin/' : '/portal/');
  } catch(err) {
    setMsg('msg-auth', 'Lỗi kết nối server', 'error');
    setLoading('submit-btn', false, label);
  }
});

document.getElementById('form-otp').addEventListener('submit', async function(e) {
  e.preventDefault();
  var otp = document.getElementById('otp').value;
  setMsg('msg-otp', '', '');
  setLoading('verify-btn', true, 'Đang xác thực...');

  try {
    var res = await fetch('/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingEmail, otp: otp }),
    });
    var data = await res.json();
    if (!res.ok) {
      setMsg('msg-otp', data.message || 'OTP không hợp lệ', 'error');
      setLoading('verify-btn', false, 'Xác thực');
      return;
    }
    localStorage.setItem('token', data.meta.token);
    localStorage.setItem('user', JSON.stringify(data.meta.user));
    setMsg('msg-otp', 'Xác thực thành công!', 'success');
    playTransition(data.meta.user.role === 'admin' ? '/admin/' : '/portal/');
  } catch(err) {
    setMsg('msg-otp', 'Lỗi kết nối server', 'error');
    setLoading('verify-btn', false, 'Xác thực');
  }
});

document.getElementById('btn-resend').addEventListener('click', async function() {
  setMsg('msg-otp', '', '');
  try {
    var res = await fetch('/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingEmail }),
    });
    var data = await res.json();
    if (!res.ok) {
      setMsg('msg-otp', data.message || 'Lỗi gửi OTP', 'error');
      return;
    }
    setMsg('msg-otp', 'OTP đã được gửi lại!', 'success');
    startResendCountdown(60);
  } catch(err) {
    setMsg('msg-otp', 'Lỗi kết nối server', 'error');
  }
});
