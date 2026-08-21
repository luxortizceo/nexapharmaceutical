(() => {
  'use strict';

  // ===== Stripe setup =====
  // Publishable keys are not secret — safe to leave in this file. Get yours
  // from https://dashboard.stripe.com/apikeys (use the pk_test_... one while
  // testing, switch to pk_live_... only once you're ready to take real money).
  const STRIPE_PUBLISHABLE_KEY = 'pk_test_REPLACE_WITH_YOUR_KEY';
  // Must match STRIPE_CURRENCY on the server (api/create-payment-intent.js) —
  // and STORE_COUNTRY should be the two-letter country of your Stripe account,
  // used only to power the Apple Pay / Google Pay button.
  const STORE_CURRENCY = 'usd';
  const STORE_COUNTRY = 'US';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const fmt = (n) => `$${n.toFixed(2)}`;

  const LABELS = {
    creatina: 'CREATINA', preworkout: 'PRE-WKT', magnesium: 'MAG', d3k2: 'D3+K2',
    collagen: 'COLLAGEN', marine: 'MARINE', nad: 'NAD+', recovery: 'RECOVERY', secret: 'SECRET',
  };

  const TAX_RATE = 0.07;
  const SHIPPING = 150.00;

  const state = {
    cart: [], // { id, name, sub, price, qty, icon }
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

  // ---------- Product icon svgs ----------
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

  function iconFor(item) {
    const label = LABELS[item.id] || 'NEXA';
    return item.icon === 'pouch' ? pouchSvg(label) : bottleSvg(label);
  }

  // ---------- Cart state ----------
  function addToCart(item) {
    const existing = state.cart.find((l) => l.id === item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      state.cart.push({ ...item, qty: 1 });
    }
  }

  function changeQty(id, delta) {
    const line = state.cart.find((l) => l.id === id);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) state.cart = state.cart.filter((l) => l.id !== id);
    renderCart();
  }

  function removeLine(id) {
    state.cart = state.cart.filter((l) => l.id !== id);
    renderCart();
  }

  function cartCount() {
    return state.cart.reduce((sum, l) => sum + l.qty, 0);
  }

  function cartSubtotal() {
    return state.cart.reduce((sum, l) => sum + l.price * l.qty, 0);
  }

  // ---------- Rendering ----------
  const cartFabBadge = $('#cart-fab-badge');
  const cartLinesEl = $('#cart-lines');
  const cartEmptyEl = $('#cart-empty');
  const cartSummaryEl = $('#cart-summary');

  function renderCart() {
    const count = cartCount();
    cartFabBadge.textContent = String(count);
    cartFabBadge.hidden = count === 0;

    if (state.cart.length === 0) {
      cartEmptyEl.hidden = false;
      cartLinesEl.hidden = true;
      cartSummaryEl.hidden = true;
      cartLinesEl.innerHTML = '';
    } else {
      cartEmptyEl.hidden = true;
      cartLinesEl.hidden = false;
      cartSummaryEl.hidden = false;
      cartLinesEl.innerHTML = state.cart.map((line) => `
        <div class="cart-line" data-line="${line.id}">
          <div class="cart-line-visual">${iconFor(line)}</div>
          <div class="cart-line-info">
            <h4>${line.name}</h4>
            <span>${line.sub}</span>
            <div class="cart-line-price">${fmt(line.price * line.qty)}</div>
          </div>
          <div class="cart-line-side">
            <button type="button" class="cart-line-remove" data-remove="${line.id}" aria-label="Quitar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
            </button>
            <div class="cart-line-qty">
              <button type="button" class="qty-btn" data-qty-delta="-1" data-qty-id="${line.id}" aria-label="Restar">−</button>
              <span class="qty-value">${line.qty}</span>
              <button type="button" class="qty-btn" data-qty-delta="1" data-qty-id="${line.id}" aria-label="Sumar">+</button>
            </div>
          </div>
        </div>
      `).join('');
    }
    recalc();
  }

  cartLinesEl.addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('[data-qty-id]');
    if (qtyBtn) {
      changeQty(qtyBtn.dataset.qtyId, parseInt(qtyBtn.dataset.qtyDelta, 10));
      return;
    }
    const removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) removeLine(removeBtn.dataset.remove);
  });

  // ---------- Pricing ----------
  function cartTotals() {
    const subtotal = cartSubtotal();
    const discountAmount = subtotal * state.discount;
    const shipping = state.cart.length ? SHIPPING : 0;
    const taxable = subtotal - discountAmount;
    const tax = taxable * TAX_RATE;
    return { subtotal, discountAmount, shipping, tax, total: taxable + tax + shipping };
  }

  function cartTotal() {
    return cartTotals().total;
  }

  function recalc() {
    const { subtotal, discountAmount, shipping, tax, total } = cartTotals();
    if (paymentView && !paymentView.hidden) {
      updatePaymentRequestTotal(total);
    }

    $('#row-subtotal').textContent = fmt(subtotal);
    $('#row-shipping').textContent = fmt(shipping);
    $('#row-tax').textContent = fmt(tax);
    $('#row-total').textContent = fmt(total);
    $('#pay-btn-amount').textContent = fmt(total);
    $('#payment-recap-total').textContent = fmt(total);
    const count = cartCount();
    $('#payment-recap-count').textContent = `${count} artículo${count === 1 ? '' : 's'}`;

    const discountWrap = $('#row-discount-wrap');
    if (state.discount > 0) {
      discountWrap.hidden = false;
      $('#row-discount').textContent = `−${fmt(discountAmount)}`;
      $('#promo-tag').textContent = `(${state.promoCode})`;
    } else {
      discountWrap.hidden = true;
    }
  }

  // ---------- Drawer open/close ----------
  const cartFab = $('#cart-fab');
  const cartOverlay = $('#cart-overlay');
  const cartDrawer = $('#cart-drawer');
  const cartClose = $('#cart-close');
  const cartBack = $('#cart-back');
  const cartView = $('#cart-view');
  const paymentView = $('#payment-view');
  const drawerTitle = $('#cart-drawer-title');

  function openCart() {
    cartOverlay.classList.add('is-open');
    cartDrawer.classList.add('is-open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    cartOverlay.classList.remove('is-open');
    cartDrawer.classList.remove('is-open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showPaymentView() {
    cartView.hidden = true;
    paymentView.hidden = false;
    cartBack.hidden = false;
    drawerTitle.textContent = 'Pago seguro';
    ensureStripeElementsMounted();
    updatePaymentRequestTotal(cartTotal());
  }

  function showCartView() {
    paymentView.hidden = true;
    cartView.hidden = false;
    cartBack.hidden = true;
    drawerTitle.textContent = 'Tu carrito';
  }

  $$('[data-open-cart]').forEach((el) => el.addEventListener('click', openCart));
  $$('[data-close-cart]').forEach((el) => el.addEventListener('click', closeCart));
  cartClose.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);
  cartBack.addEventListener('click', showCartView);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartDrawer.classList.contains('is-open')) closeCart();
  });

  $('#checkout-btn').addEventListener('click', () => {
    if (!state.cart.length) return;
    showPaymentView();
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

  // ---------- Add to cart (product grid + formula CTA) ----------
  const toast = $('#add-toast');
  const toastText = $('#add-toast-text');
  let toastTimer = null;

  function showToast(name) {
    toastText.textContent = `${name} añadido a tu carrito`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
  }

  $$('.btn-add').forEach((btn) => {
    btn.addEventListener('click', () => {
      const source = btn.closest('[data-id]');
      if (!source) return;
      addToCart({
        id: source.dataset.id,
        name: source.dataset.name,
        sub: source.dataset.sub,
        price: parseFloat(source.dataset.price),
        icon: source.dataset.icon || 'bottle',
      });
      renderCart();
      showToast(source.dataset.name);

      cartFab.classList.remove('is-bump');
      void cartFab.offsetWidth;
      cartFab.classList.add('is-bump');

      $$('.btn-add').forEach((b) => b.classList.remove('is-added'));
      btn.classList.add('is-added');
      setTimeout(() => btn.classList.remove('is-added'), 1200);
    });
  });

  // ---------- Card visual (decorative) ----------
  const nameInput = $('#cardName');
  const previewName = $('#card-preview-name');
  const card3d = $('#card3d');

  nameInput.addEventListener('input', (e) => {
    previewName.textContent = e.target.value.trim() ? e.target.value.toUpperCase() : 'NOMBRE APELLIDO';
  });

  function brandSvg(brand) {
    const label = {
      visa: 'VISA', mastercard: '', amex: 'AMEX', discover: 'DISC', unknown: ''
    }[brand] ?? '';
    if (brand === 'mastercard') {
      return `<svg width="26" height="16" viewBox="0 0 26 16"><circle cx="9" cy="8" r="7" fill="#5eead4" opacity=".9"/><circle cx="17" cy="8" r="7" fill="#818cf8" opacity=".85"/></svg>`;
    }
    if (!label) {
      return `<svg width="24" height="16" viewBox="0 0 24 16"><rect width="24" height="16" rx="3" fill="#2A3344"/></svg>`;
    }
    return `<svg width="40" height="16" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#1c2333"/><text x="20" y="11.5" text-anchor="middle" font-family="Space Grotesk,sans-serif" font-size="7.5" font-weight="700" fill="#5eead4" letter-spacing="0.5">${label}</text></svg>`;
  }

  // ===== Stripe Elements (real, PCI-compliant card fields) =====
  // Stripe owns the card number / expiry / CVC digits from here on — they
  // live inside Stripe's own iframes, this page never sees or stores them.
  const stripe = (typeof Stripe === 'function')
    ? Stripe(STRIPE_PUBLISHABLE_KEY)
    : null;
  if (!stripe) console.warn('Stripe.js no cargó — revisa tu conexión o bloqueadores de anuncios.');

  const stripeElementStyle = {
    base: {
      fontSize: '15px',
      color: '#0f1420',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      '::placeholder': { color: '#a4abb8' },
    },
    invalid: { color: '#f87171' },
  };

  let elements = null;
  let cardNumberElement = null;
  let cardExpiryElement = null;
  let cardCvcElement = null;
  let paymentRequest = null;
  let prButton = null;
  let stripeReady = false;
  const fieldComplete = { cardNumber: false, cardExpiry: false, cardCvc: false };

  function wireStripeFieldErrors(element, mountId) {
    element.on('change', (event) => {
      fieldComplete[mountId] = event.complete;
      const errorEl = $(`#${mountId}-errors`);
      const mountEl = $(`#${mountId}`);
      if (event.error) {
        errorEl.textContent = event.error.message;
        mountEl.classList.add('is-invalid');
      } else {
        errorEl.textContent = '';
        mountEl.classList.remove('is-invalid');
      }
      if (mountId === 'cardNumber' && event.brand) {
        $('#scheme-badge').innerHTML = brandSvg(event.brand === 'unknown' ? 'generic' : event.brand);
      }
    });
  }

  function ensureStripeElementsMounted() {
    if (stripeReady || !stripe) return;
    elements = stripe.elements({ locale: 'es' });

    cardNumberElement = elements.create('cardNumber', { style: stripeElementStyle, placeholder: '1234 1234 1234 1234' });
    cardNumberElement.mount('#cardNumber');
    wireStripeFieldErrors(cardNumberElement, 'cardNumber');

    cardExpiryElement = elements.create('cardExpiry', { style: stripeElementStyle });
    cardExpiryElement.mount('#cardExpiry');
    wireStripeFieldErrors(cardExpiryElement, 'cardExpiry');

    cardCvcElement = elements.create('cardCvc', { style: stripeElementStyle });
    cardCvcElement.mount('#cardCvc');
    wireStripeFieldErrors(cardCvcElement, 'cardCvc');
    cardCvcElement.on('focus', () => card3d.classList.add('is-flipped'));
    cardCvcElement.on('blur', () => card3d.classList.remove('is-flipped'));

    setUpPaymentRequestButton();
    stripeReady = true;
  }

  function setUpPaymentRequestButton() {
    paymentRequest = stripe.paymentRequest({
      country: STORE_COUNTRY,
      currency: STORE_CURRENCY,
      total: { label: 'NexaPharm', amount: 100 },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    prButton = elements.create('paymentRequestButton', { paymentRequest });

    paymentRequest.canMakePayment().then((result) => {
      if (result) {
        prButton.mount('#payment-request-button');
        $('#payment-request-row').hidden = false;
        $('#card-divider').querySelector('span').textContent = 'o paga con tarjeta';
      }
    });

    paymentRequest.on('paymentmethod', async (ev) => {
      try {
        const clientSecret = await createPaymentIntent();
        const { error, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );
        if (error) {
          ev.complete('fail');
          showPaymentError(error.message);
          return;
        }
        ev.complete('success');
        if (paymentIntent.status === 'requires_action') {
          const { error: actionError } = await stripe.confirmCardPayment(clientSecret);
          if (actionError) {
            showPaymentError(actionError.message);
            return;
          }
        }
        onPaymentSuccess(paymentIntent.id);
      } catch (err) {
        ev.complete('fail');
        showPaymentError(err.message);
      }
    });
  }

  function updatePaymentRequestTotal(totalAmount) {
    if (!paymentRequest) return;
    paymentRequest.update({ total: { label: 'NexaPharm', amount: Math.round(totalAmount * 100) } });
  }

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

    if (!fieldComplete.cardNumber || !fieldComplete.cardExpiry || !fieldComplete.cardCvc) {
      if (!$('#cardNumber-errors').textContent) $('#cardNumber-errors').textContent = 'Completa los datos de tu tarjeta';
      valid = false;
    }

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
  const paymentErrorEl = $('#payment-error');

  function showPaymentError(message) {
    paymentErrorEl.textContent = message || 'No se pudo procesar el pago. Intenta de nuevo.';
    paymentErrorEl.hidden = false;
  }

  function clearPaymentError() {
    paymentErrorEl.hidden = true;
    paymentErrorEl.textContent = '';
  }

  async function createPaymentIntent() {
    const resp = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: state.cart.map((l) => ({ id: l.id, qty: l.qty })),
        promoCode: state.promoCode,
        email: $('#email').value.trim(),
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo iniciar el pago');
    return data.clientSecret;
  }

  function onPaymentSuccess(orderId) {
    $('#order-id').textContent = orderId;
    successOverlay.hidden = false;
    state.cart = [];
    state.discount = 0;
    renderCart();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearPaymentError();
    if (!validateForm()) {
      payBtn.classList.add('is-shake');
      setTimeout(() => payBtn.classList.remove('is-shake'), 400);
      return;
    }
    if (!stripe) {
      showPaymentError('Stripe no está disponible en este momento.');
      return;
    }

    payBtn.classList.add('is-loading');
    payBtn.disabled = true;
    try {
      const clientSecret = await createPaymentIntent();
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: nameInput.value.trim(),
            email: $('#email').value.trim(),
            address: {
              country: $('#country').value,
              postal_code: $('#zip').value.trim(),
            },
          },
        },
      });
      if (error) throw new Error(error.message || 'El pago no pudo procesarse');
      onPaymentSuccess(paymentIntent.id);
    } catch (err) {
      showPaymentError(err.message);
    } finally {
      payBtn.classList.remove('is-loading');
      payBtn.disabled = false;
    }
  });

  $('#reset-btn').addEventListener('click', () => {
    successOverlay.hidden = true;
    form.reset();
    previewName.textContent = 'NOMBRE APELLIDO';
    if (cardNumberElement) cardNumberElement.clear();
    if (cardExpiryElement) cardExpiryElement.clear();
    if (cardCvcElement) cardCvcElement.clear();
    fieldComplete.cardNumber = false;
    fieldComplete.cardExpiry = false;
    fieldComplete.cardCvc = false;
    clearPaymentError();
    $('#promo-msg').textContent = '';
    $('#promo-input').value = '';
    showCartView();
    closeCart();
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

  renderCart();
})();
