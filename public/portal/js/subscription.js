// public/portal/js/subscription.js
(function () {
  const token = localStorage.getItem('token');

  const PLANS = {
    plus: { label: 'Plus',  monthly: 10000, yearly: 109000, features: ['Themes'] },
    pro:  { label: 'Pro',   monthly: 19000, yearly: 159000, features: ['Themes', 'Nhạc nền', 'Text / Caption'] },
  };
  const PLAN_RANK = { plus: 1, pro: 2 };

  let selectedPeriod = 'monthly';

  function fmtVND(amount) {
    return amount.toLocaleString('vi-VN') + 'd';
  }

  function showToast(msg, type) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast ' + (type || '');
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 3500);
  }

  // Handle ?payment= query param
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    showToast('Thanh toán thành công! Subscription đã được kích hoạt.', 'success');
    history.replaceState({}, '', '/portal/');
  } else if (params.get('payment') === 'cancel') {
    showToast('Thanh toán bị huỷ.', 'error');
    history.replaceState({}, '', '/portal/');
  }

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function renderCurrentPlan(sub) {
    const div = el('div', 'sub-current');
    const label = el('div', 'plan-label');
    const planInfo = PLANS[sub.plan];
    label.textContent = (planInfo ? planInfo.label : sub.plan) + ' Plan';
    const expiry = el('div', 'plan-expiry');
    expiry.textContent = 'Hết hạn: ' + new Date(sub.expiredAt).toLocaleDateString('vi-VN');
    div.appendChild(label);
    div.appendChild(expiry);
    return div;
  }

  function renderPeriodToggle(sub) {
    const toggle = el('div', 'period-toggle');
    ['monthly', 'yearly'].forEach(function (p) {
      const btn = el('button', 'period-btn' + (p === selectedPeriod ? ' active' : ''));
      btn.textContent = p === 'monthly' ? 'Theo tháng' : 'Theo năm';
      btn.addEventListener('click', function () {
        selectedPeriod = p;
        render(sub);
      });
      toggle.appendChild(btn);
    });
    return toggle;
  }

  function renderPlanCard(planKey, plan, sub) {
    const card = el('div', 'plan-card');

    const nameEl = el('div', 'plan-name');
    nameEl.textContent = plan.label;

    const featuresEl = el('div', 'plan-features');
    const maxLine = document.createElement('div');
    maxLine.textContent = '🌌 Tối đa ' + (planKey === 'plus' ? '3' : '10') + ' galaxies';
    maxLine.style.fontWeight = '500';
    featuresEl.appendChild(maxLine);
    plan.features.forEach(function (f) {
      const line = document.createElement('div');
      line.textContent = f;
      featuresEl.appendChild(line);
    });

    const priceEl = el('div', 'plan-price');
    const strong = document.createElement('strong');
    strong.textContent = fmtVND(plan[selectedPeriod]);
    priceEl.appendChild(strong);
    const periodText = document.createTextNode(' / ' + (selectedPeriod === 'monthly' ? 'tháng' : 'năm'));
    priceEl.appendChild(periodText);

    const isCurrent = sub && sub.plan === planKey;
    const currentRank = sub ? (PLAN_RANK[sub.plan] || 0) : 0;
    const cardRank = PLAN_RANK[planKey] || 0;
    const isIncluded = currentRank > cardRank;

    const btn = el('button', 'btn-subscribe');
    if (isIncluded) {
      btn.textContent = 'Đã bao gồm';
      btn.disabled = true;
    } else {
      btn.textContent = isCurrent ? 'Gia hạn' : ('Nâng lên ' + plan.label);
      btn.addEventListener('click', function () {
        handleSubscribe(btn, planKey, selectedPeriod, plan.label);
      });
    }

    card.appendChild(nameEl);
    card.appendChild(featuresEl);
    card.appendChild(priceEl);
    card.appendChild(btn);
    return card;
  }

  function render(sub) {
    const section = document.getElementById('sub-section');
    while (section.firstChild) section.removeChild(section.firstChild);

    if (sub) {
      section.appendChild(renderCurrentPlan(sub));
    }

    section.appendChild(renderPeriodToggle(sub));

    const grid = el('div', 'sub-plans');
    Object.keys(PLANS).forEach(function (planKey) {
      grid.appendChild(renderPlanCard(planKey, PLANS[planKey], sub));
    });
    section.appendChild(grid);
  }

  function updatePlanBadges(sub) {
    const planLabel = sub ? (PLANS[sub.plan] ? PLANS[sub.plan].label.toUpperCase() : sub.plan.toUpperCase()) : null;
    // admin hiện "ADMIN" thay vì plan name

    // Badge trong header (cạnh email)
    const userInfoEl = document.getElementById('user-email');
    if (userInfoEl) {
      let badge = document.getElementById('plan-badge-header');
      if (!badge) {
        badge = document.createElement('span');
        badge.id = 'plan-badge-header';
        badge.className = 'plan-badge';
        userInfoEl.appendChild(badge);
      }
      badge.textContent = planLabel || '';
      badge.style.display = planLabel ? '' : 'none';
    }

    // Badge trên tab button
    const tabBtn = document.querySelector('.tab-btn[data-tab="subscription"]');
    if (tabBtn) {
      let tabText = tabBtn.querySelector('.tab-text');
      let tabBadge = tabBtn.querySelector('.plan-badge');
      if (!tabText) {
        // Wrap existing text in span
        const text = document.createElement('span');
        text.className = 'tab-text';
        text.textContent = 'Subscription';
        while (tabBtn.firstChild) tabBtn.removeChild(tabBtn.firstChild);
        tabBtn.appendChild(text);
      }
      let badge = tabBtn.querySelector('.plan-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'plan-badge';
        tabBtn.appendChild(badge);
      }
      badge.textContent = planLabel ? planLabel + ' ✓' : '';
      badge.style.display = planLabel ? '' : 'none';
    }
  }

  async function loadSubscription() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isPrivileged = user.role === 'admin' || user.role === 'partner';

    const section = document.getElementById('sub-section');
    while (section.firstChild) section.removeChild(section.firstChild);
    const loading = el('div', 'empty');
    loading.textContent = 'Đang tải...';
    section.appendChild(loading);

    try {
      const res = await fetch('/payment/status', {
        headers: { 'Authorization': 'Bearer ' + token },
      });
      if (res.status === 401) return;
      const data = await res.json();
      const sub = data.meta || null;
      render(sub);
      if (!isPrivileged) updatePlanBadges(sub);
    } catch {
      while (section.firstChild) section.removeChild(section.firstChild);
      const errEl = el('div', 'empty');
      errEl.textContent = 'Lỗi tải subscription';
      section.appendChild(errEl);
    }
  }

  // Fetch status lúc load trang để hiện badge ngay (không cần click tab)
  async function initBadges() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin' || user.role === 'partner') {
      updatePlanBadges({ plan: user.role, expiredAt: null });
      return;
    }
    try {
      const res = await fetch('/payment/status', {
        headers: { 'Authorization': 'Bearer ' + token },
      });
      if (res.status === 401) return;
      const data = await res.json();
      updatePlanBadges(data.meta || null);
    } catch { /* silent */ }
  }

  initBadges();

  async function handleSubscribe(btn, plan, period, planLabel) {
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Đang xử lý...';
    try {
      const res = await fetch('/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ plan: plan, period: period }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Lỗi tạo link thanh toán', 'error');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }
      window.location.href = data.meta.checkoutUrl;
    } catch {
      showToast('Lỗi kết nối', 'error');
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  window._loadSubscription = loadSubscription;
})();
