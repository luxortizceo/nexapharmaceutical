const Stripe = require('stripe');
const { computeOrderTotals } = require('./_catalog');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const CURRENCY = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items, promoCode, email } = req.body || {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Correo inválido' });
    }

    const totals = computeOrderTotals(items, promoCode);
    if (!totals.lines.length || totals.totalCents <= 0) {
      return res.status(400).json({ error: 'El carrito está vacío o es inválido' });
    }

    // Stripe requires a minimum charge (~$0.50 for USD); the flat shipping fee
    // already guarantees this, but guard anyway.
    if (totals.totalCents < 50) {
      return res.status(400).json({ error: 'Monto demasiado bajo para procesar' });
    }

    const cartSummary = totals.lines.map((l) => `${l.id}:${l.qty}`).join(',').slice(0, 490);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totals.totalCents,
      currency: CURRENCY,
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      metadata: {
        cart: cartSummary,
        promoCode: promoCode || '',
        subtotalCents: String(totals.subtotalCents),
        discountCents: String(totals.discountCents),
        shippingCents: String(totals.shippingCents),
        taxCents: String(totals.taxCents),
        email,
      },
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      totalCents: totals.totalCents,
    });
  } catch (err) {
    console.error('create-payment-intent error:', err);
    return res.status(500).json({ error: 'No se pudo iniciar el pago. Intenta de nuevo.' });
  }
};
