// public/portal/js/subscription.js
(function () {
  const token = localStorage.getItem('token');

  const PLANS = {
    plus: { label: 'Plus',  monthly: 10000, yearly: 109000, features: ['Themes'] },
    pro:  { label: 'Pro',   monthly: 19000, yearly: 159000, features: ['Themes', 'Nhac nen', 'Text / Caption'] },
  };

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
    showToast('Thanh toan thanh cong! Subscription da duoc kich hoat.', 'success');
    history.replaceState({}, '', '/portal/');
  } else if (params.get('payment') === 'cancel') {
    showToast('Thanh toan bi huy.', 'error');
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
    expiry.textContent = 'Het han: ' + new Date(sub.expiredAt).toLocaleDateString('vi-VN');
    div.appendChild(label);
    div.appendChild(expiry);
    return div;
  }

  function renderPeriodToggle(sub) {
    const toggle = el('div', 'period-toggle');
    ['monthly', 'yearly'].forEach(function (p) {
      const btn = el('button', 'period-btn' + (p === selectedPeriod ? ' active' : ''));
      btn.textContent = p === 'monthly' ? 'Theo thang' : 'Theo nam';
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
    plan.features.forEach(function (f) {
      const line = document.createElement('div');
      line.textContent = f;
      featuresEl.appendChild(line);
    });

    const priceEl = el('div', 'plan-price');
    const strong = document.createElement('strong');
    strong.textContent = fmtVND(plan[selectedPeriod]);
    priceEl.appendChild(strong);
    const periodText = document.createTextNode(' / ' + (selectedPeriod === 'monthly' ? 'thang' : 'nam'));
    priceEl.appendChild(periodText);

    const isCurrent = sub && sub.plan === planKey;
    const btn = el('button', 'btn-subscribe');
    btn.textContent = isCurrent ? 'Gia han' : ('Nang len ' + plan.label);
    btn.addEventListener('click', function () {
      handleSubscribe(btn, planKey, selectedPeriod, plan.label);
    });

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

  async function loadSubscription() {
    const section = document.getElementById('sub-section');
    while (section.firstChild) section.removeChild(section.firstChild);
    const loading = el('div', 'empty');
    loading.textContent = 'Dang tai...';
    section.appendChild(loading);

    try {
      const res = await fetch('/payment/status', {
        headers: { 'Authorization': 'Bearer ' + token },
      });
      if (res.status === 401) return;
      const data = await res.json();
      render(data.meta || null);
    } catch {
      while (section.firstChild) section.removeChild(section.firstChild);
      const errEl = el('div', 'empty');
      errEl.textContent = 'Loi tai subscription';
      section.appendChild(errEl);
    }
  }

  async function handleSubscribe(btn, plan, period, planLabel) {
    btn.disabled = true;
    btn.textContent = 'Dang xu ly...';
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
        showToast(data.message || 'Loi tao link thanh toan', 'error');
        btn.disabled = false;
        btn.textContent = 'Nang len ' + planLabel;
        return;
      }
      window.location.href = data.meta.checkoutUrl;
    } catch {
      showToast('Loi ket noi', 'error');
      btn.disabled = false;
      btn.textContent = 'Nang len ' + planLabel;
    }
  }

  window._loadSubscription = loadSubscription;
})();
