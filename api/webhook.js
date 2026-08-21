// Stripe calls this endpoint directly (never the browser) once a payment
// actually succeeds. This is the only place that writes an order to Google
// Sheets — the client can't be trusted to report its own "success".
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function centsToStr(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

async function logOrderToSheet(paymentIntent) {
  const sheetsUrl = process.env.SHEETS_WEBHOOK_URL;
  if (!sheetsUrl) {
    console.warn('SHEETS_WEBHOOK_URL not set — skipping order log.');
    return;
  }
  const m = paymentIntent.metadata || {};
  const payload = {
    orderId: paymentIntent.id,
    date: new Date().toISOString(),
    email: m.email || paymentIntent.receipt_email || '',
    cart: m.cart || '',
    subtotal: centsToStr(m.subtotalCents),
    discount: centsToStr(m.discountCents),
    shipping: centsToStr(m.shippingCents),
    tax: centsToStr(m.taxCents),
    total: centsToStr(paymentIntent.amount),
    currency: paymentIntent.currency,
    promoCode: m.promoCode || '',
    paymentMethod: 'Stripe',
  };

  const resp = await fetch(sheetsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    throw new Error(`Sheets webhook respondió ${resp.status}`);
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    try {
      await logOrderToSheet(paymentIntent);
    } catch (err) {
      // Log but still return 200 — a Sheets hiccup shouldn't make Stripe
      // retry this webhook indefinitely.
      console.error('Failed to log order to Sheets:', err);
    }
  }

  return res.status(200).json({ received: true });
}

handler.config = { api: { bodyParser: false } };
module.exports = handler;
