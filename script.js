(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const fmt = (n) => `$${n.toFixed(2)}`;

  const LABELS = {
    renew: 'RENEW', omega: 'OMEGA+', magnesium: 'MAG', d3k2: 'D3+K2',
    collagen: 'COLLAGEN', marine: 'MARINE', nad: 'NAD+', recovery: 'RECOVERY',
  };

  const TAX_RATE = 0.07;

  const state = {
    product: { id: 'renew', name: 'NexaPharm® Renew', sub: 'Complejo avanzado de salud celular — fórmula clínica, 90 cápsulas', eyebrow: 'Compra única · Envío prioritario', price: 89.00, icon: 'bottle' },
    plan: 'onetime',
    discount: 0,
    promoCode: '',
  };

  // ---------- Mobile nav ----------
  const navToggle = $('#nav-toggle');
  const navLinks = $('#nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    $$('a', navLinks).forEach((a) => a.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  // ---------- Product visuals ----------
  function bottleSvg(label) {
    return `<svg viewBox="0 0 120 160" class="bottle" width="88" height="118">
      <defs>
        <linearGradient id="coBottleGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#a7f3d0"/><stop offset="55%" stop-color="#5eead4"/><stop offset="100%" stop-color="#6366f1"/>
        </linearGradient>
        <linearGradient id="coCapGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e2e8f0"/><stop offset="100%" stop-color="#94a3b8"/>
        </linearGradient>
      </defs>
      <rect x="38" y="10" width="44" height="22" rx="4" fill="url(#coCapGrad)"/>
      <rect x="42" y="4" width="36" height="10" rx="3" fill="#cbd5e1"/>
      <path d="M32 32h56c6 0 10 5 10 12v96c0 8-6 14-14 14H36c-8 0-14-6-14-14V44c0-7 4-12 10-12z" fill="url(#coBottleGrad)" opacity="0.95"/>
      <rect x="24" y="76" width="72" height="46" rx="6" fill="rgba(6,10,18,0.55)"/>
      <text x="60" y="103" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="11" font-weight="700" fill="#f8fafc">${label}</text>
    </svg>`;
  }

  function pouchSvg(label) {
    return `<svg viewBox="0 0 120 160" class="bottle" width="88" height="118">
      <defs>
        <linearGradient id="coPouchGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#c7d2fe"/><stop offset="60%" stop-color="#818cf8"/><stop offset="100%" stop-color="#4338ca"/>
        </linearGradient>
      </defs>
      <path d="M22 40 C22 28,29 18,40 12 L80 12 C91 18,98 28,98 40 L98 138 C98 147,91 154,82 154 L38 154 C29 154,22 147,22 138 Z" fill="url(#coPouchGrad)"/>
      <rect x="22" y="50" width="76" height="7" fill="rgba(6,10,18,0.35)"/>
      <rect x="30" y="88" width="60" height="50" rx="6" fill="rgba(6,10,18,0.55)"/>
      <text x="60" y="118" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="10" font-weight="700" fill="#f8fafc">${label}</text>
    </svg>`;
  }

  const coVisual = $('#co-visual');
  const coEyebrow = $('#co-eyebrow');
  const coName = $('#co-name');
  const coSub = $('#co-sub');
  const planOnetimePrice = $('#plan-onetime-price');
  const planSubscribePrice = $('#plan-subscribe-price');

  function applyProductToCheckout(highlight) {
    const p = state.product;
    const label = LABELS[p.id] || 'NEXA';
    coVisual.innerHTML = `<div class="visual-glow"></div>${p.icon === 'pouch' ? pouchSvg(label) : bottleSvg(label)}`;
    coEyebrow.textContent = p.eyebrow;
    coName.textContent = p.name;
    coSub.textContent = p.sub;
    planOnetimePrice.textContent = fmt(p.price);
    planSubscribePrice.textContent = fmt(p.price * 0.8);
    recalc();
    if (highlight) {
      const card = $('.glass-card');
      card.classList.remove('is-flash');
      void card.offsetWidth;
      card.classList.add('is-flash');
    }
  }

  // ---------- Pricing ----------
  function recalc() {
    const planPrice = state.plan === 'subscribe' ? state.product.price * 0.8 : state.product.price;
    const discountAmount = planPrice * state.discount;
    const taxable = planPrice - discountAmount;
    const tax = taxable * TAX_RATE;
    const total = taxable + tax;

    $('#row-subtotal').textContent = fmt(planPrice);
    $('#row-tax').textContent = fmt(tax);
    $('#row-total').textContent = fmt(total);
    $('#pay-btn-amount').textContent = fmt(total);

    const discountWrap = $('#row-discount-wrap');
    if (state.discount > 0) {
      discountWrap.hidden = false;
      $('#row-discount').textContent = `−${fmt(discountAmount)}`;
      $('#promo-tag').textContent = `(${state.promoCode})`;
    } else {
      discountWrap.hidden = true;
    }
  }

  $$('input[name="plan"]').forEach((input) => {
    input.addEventListener('change', (e) => {
      state.plan = e.target.value;
      recalc();
    });
  });

  // ---------- Add to order ----------
  const toast = $('#add-toast');
  const toastText = $('#add-toast-text');
  let toastTimer = null;

  function showToast(name) {
    toastText.textContent = `${name} añadido a tu pedido`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
  }

  $$('.btn-add').forEach((btn) => {
    btn.addEventListener('click', () => {
      const source = btn.closest('[data-id]');
      if (!source) return;
      state.product = {
        id: source.dataset.id,
        name: source.dataset.name,
        sub: source.dataset.sub,
        eyebrow: source.dataset.eyebrow || 'Compra única · Envío prioritario',
        price: parseFloat(source.dataset.price),
        icon: source.dataset.icon || 'bottle',
      };
      state.plan = 'onetime';
      $$('input[name="plan"]').forEach((r) => { r.checked = r.value === 'onetime'; });
      applyProductToCheckout(true);
      showToast(state.product.name);

      $$('.btn-add').forEach((b) => b.classList.remove('is-added'));
      btn.classList.add('is-added');
      setTimeout(() => btn.classList.remove('is-added'), 1200);
    });
  });

  // ---------- Promo code ----------
  const VALID_PROMOS = { NEXA10: 0.10, RENEW20: 0.20 };
  $('#promo-apply').addEventListener('click', () => {
    const raw = $('#promo-input').value.trim().toUpperCase();
    const msg = $('#promo-msg');
    if (!raw) return;
    if (VALID_PROMOS[raw]) {
      state.discount = VALID_PROMOS[raw];
      state.promoCode = raw;
      msg.textContent = `Código aplicado: ${Math.round(VALID_PROMOS[raw] * 100)}% de descuento`;
      msg.classList.remove('is-error');
    } else {
      state.discount = 0;
      msg.textContent = 'Código no válido. Prueba con NEXA10 o RENEW20.';
      msg.classList.add('is-error');
    }
    recalc();
  });

  // ---------- Card visual + formatting ----------
  const cardNumberInput = $('#cardNumber');
  const expiryInput = $('#expiry');
  const cvcInput = $('#cvc');
  const nameInput = $('#cardName');

  const previewNumber = $('#card-preview-number');
  const previewName = $('#card-preview-name');
  const previewExpiry = $('#card-preview-expiry');
  const previewCvc = $('#card-preview-cvc');
  const card3d = $('#card3d');
  const brandIcon = $('#brand-icon');

  function detectBrand(digits) {
    if (/^4/.test(digits)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
    if (/^3[47]/.test(digits)) return 'amex';
    if (/^6(011|5)/.test(digits)) return 'discover';
    return 'generic';
  }

  function groupsFor(brand) {
    return brand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4];
  }

  function formatCardNumber(digits, brand) {
    const groups = groupsFor(brand);
    let out = [];
    let idx = 0;
    for (const g of groups) {
      const chunk = digits.slice(idx, idx + g);
      if (!chunk) break;
      out.push(chunk);
      idx += g;
    }
    return out.join(' ');
  }

  function brandSvg(brand) {
    const label = {
      visa: 'VISA', mastercard: '', amex: 'AMEX', discover: 'DISC', generic: ''
    }[brand];
    if (brand === 'mastercard') {
      return `<svg width="26" height="16" viewBox="0 0 26 16"><circle cx="9" cy="8" r="7" fill="#5eead4" opacity=".9"/><circle cx="17" cy="8" r="7" fill="#818cf8" opacity=".85"/></svg>`;
    }
    if (!label) {
      return `<svg width="24" height="16" viewBox="0 0 24 16"><rect width="24" height="16" rx="3" fill="#2A3344"/></svg>`;
    }
    return `<svg width="40" height="16" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#1c2333"/><text x="20" y="11.5" text-anchor="middle" font-family="Space Grotesk,sans-serif" font-size="7.5" font-weight="700" fill="#5eead4" letter-spacing="0.5">${label}</text></svg>`;
  }

  cardNumberInput.addEventListener('input', (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
    const brand = detectBrand(digits);
    e.target.value = formatCardNumber(digits, brand);
    brandIcon.innerHTML = brandSvg(brand);
    previewNumber.textContent = buildMaskedPreview(digits, brand);
  });

  function buildMaskedPreview(digits, brand) {
    const groups = groupsFor(brand);
    let idx = 0;
    const parts = [];
    groups.forEach((g, gi) => {
      const chunk = digits.slice(idx, idx + g);
      const isLast = gi === groups.length - 1;
      if (chunk.length === 0) {
        parts.push('•'.repeat(g));
      } else if (chunk.length < g) {
        parts.push(chunk.padEnd(g, '•'));
      } else {
        parts.push(isLast || digits.length <= idx + g ? chunk : '•'.repeat(g));
      }
      idx += g;
    });
    return parts.join(' ');
  }

  expiryInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    e.target.value = v;
    previewExpiry.textContent = v || 'MM/YY';
  });

  cvcInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    previewCvc.textContent = e.target.value.padEnd(3, '•') || '•••';
  });
  cvcInput.addEventListener('focus', () => card3d.classList.add('is-flipped'));
  cvcInput.addEventListener('blur', () => card3d.classList.remove('is-flipped'));

  nameInput.addEventListener('input', (e) => {
    previewName.textContent = e.target.value.trim() ? e.target.value.toUpperCase() : 'NOMBRE APELLIDO';
  });

  // ---------- Express pay buttons ----------
  $$('.express-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      runPaymentFlow();
    });
  });

  // ---------- Validation ----------
  function setError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorEl = document.querySelector(`.field-error[data-for="${fieldId}"]`);
    if (message) {
      input.classList.add('is-invalid');
      if (errorEl) errorEl.textContent = message;
    } else {
      input.classList.remove('is-invalid');
      if (errorEl) errorEl.textContent = '';
    }
  }

  function validateForm() {
    let valid = true;

    const email = $('#email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('email', 'Ingresa un correo válido');
      valid = false;
    } else setError('email', '');

    const digits = cardNumberInput.value.replace(/\D/g, '');
    if (digits.length < 13) {
      setError('cardNumber', 'Número de tarjeta incompleto');
      valid = false;
    } else setError('cardNumber', '');

    const expiry = expiryInput.value;
    const expMatch = /^(\d{2})\/(\d{2})$/.exec(expiry);
    if (!expMatch || Number(expMatch[1]) < 1 || Number(expMatch[1]) > 12) {
      setError('expiry', 'Fecha inválida');
      valid = false;
    } else setError('expiry', '');

    if (cvcInput.value.length < 3) {
      setError('cvc', 'CVC inválido');
      valid = false;
    } else setError('cvc', '');

    if (!nameInput.value.trim()) {
      setError('cardName', 'Requerido');
      valid = false;
    } else setError('cardName', '');

    const zip = $('#zip').value.trim();
    if (!zip) {
      setError('zip', 'Requerido');
      valid = false;
    } else setError('zip', '');

    return valid;
  }

  // ---------- Submit ----------
  const form = $('#checkout-form');
  const payBtn = $('#pay-btn');
  const successOverlay = $('#success-overlay');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm()) {
      payBtn.classList.add('is-shake');
      setTimeout(() => payBtn.classList.remove('is-shake'), 400);
      return;
    }
    runPaymentFlow();
  });

  function runPaymentFlow() {
    payBtn.classList.add('is-loading');
    payBtn.disabled = true;
    setTimeout(() => {
      payBtn.classList.remove('is-loading');
      payBtn.disabled = false;
      const orderId = '#NX-' + Math.floor(100000 + Math.random() * 900000);
      $('#order-id').textContent = orderId;
      successOverlay.hidden = false;
    }, 1600);
  }

  $('#reset-btn').addEventListener('click', () => {
    successOverlay.hidden = true;
    form.reset();
    previewNumber.textContent = '•••• •••• •••• ••••';
    previewName.textContent = 'NOMBRE APELLIDO';
    previewExpiry.textContent = 'MM/YY';
    previewCvc.textContent = '•••';
    brandIcon.innerHTML = brandSvg('generic');
    state.discount = 0;
    $('#promo-msg').textContent = '';
    $('#promo-input').value = '';
    recalc();
  });

  // ---------- Subtle parallax on orbs ----------
  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    $$('.orb').forEach((orb, i) => {
      const depth = (i + 1) * 0.6;
      orb.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
    });
  });

  recalc();
})();
