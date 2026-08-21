// Server-side source of truth for prices. Keep this in sync with the
// data-price attributes in index.html — the client's total is never
// trusted, this is what actually gets charged.
//
// When you add a product in index.html, add its data-id and data-price here too.
const CATALOG = {
  creatina: 36.00,
  preworkout: 44.00,
  magnesium: 34.00,
  d3k2: 29.00,
  collagen: 59.00,
  marine: 69.00,
  nad: 99.00,
  recovery: 64.00,
  secret: 79.00,
};

const SHIPPING = 150.00;
const TAX_RATE = 0.07;

// Keep in sync with VALID_PROMOS in script.js.
const VALID_PROMOS = { NEXA10: 0.10, RENEW20: 0.20 };

// Rounds to cents to avoid floating point drift, returns integer cents (what Stripe expects).
function toCents(amount) {
  return Math.round(amount * 100);
}

// items: [{ id, qty }]. Ignores unknown ids and non-positive quantities.
// promoCode is optional; unrecognized codes are silently ignored (no discount), never trusted for the amount itself.
function computeOrderTotals(items, promoCode) {
  let subtotalCents = 0;
  const lines = [];
  for (const item of Array.isArray(items) ? items : []) {
    const price = CATALOG[item && item.id];
    const qty = Number(item && item.qty);
    if (!price || !Number.isInteger(qty) || qty <= 0 || qty > 50) continue;
    const lineCents = toCents(price) * qty;
    subtotalCents += lineCents;
    lines.push({ id: item.id, qty, unitPriceCents: toCents(price), lineTotalCents: lineCents });
  }
  const discountRate = VALID_PROMOS[String(promoCode || '').toUpperCase()] || 0;
  const discountCents = Math.round(subtotalCents * discountRate);
  const shippingCents = lines.length ? toCents(SHIPPING) : 0;
  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round(taxableCents * TAX_RATE);
  const totalCents = taxableCents + taxCents + shippingCents;
  return { lines, subtotalCents, discountCents, shippingCents, taxCents, totalCents };
}

module.exports = { CATALOG, SHIPPING, TAX_RATE, VALID_PROMOS, toCents, computeOrderTotals };
