import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  price_5pack: { name: "5 Listings Pack", amount: 799, currency: "usd", mode: "payment" },
  price_20pack: { name: "20 Listings Pack", amount: 1999, currency: "usd", mode: "payment" },
  price_monthly: { name: "Unlimited Monthly", amount: 1499, currency: "usd", mode: "subscription" },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { priceId, mode } = req.body;
  const price = PRICES[priceId];
  if (!price) return res.status(400).json({ error: "Invalid price ID" });
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: price.currency,
          product_data: { name: price.name },
          unit_amount: price.amount,
          ...(mode === "subscription" ? { recurring: { interval: "month" } } : {}),
        },
        quantity: 1,
      }],
      mode,
      success_url: `${req.headers.origin}/?payment=success&plan=${priceId}`,
      cancel_url: `${req.headers.origin}/?payment=cancelled`,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export const config = { api: { bodyParser: true }, maxDuration: 30 };
