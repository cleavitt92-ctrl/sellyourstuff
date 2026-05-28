import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PRICE_CREDITS = {
  "price_1TbKkoLr6wY7Jbr15EyFxLe4": 5,   // 5 pack
  "price_1TbKlDLr6wY7Jbr1x7AluGHw": 20,  // 20 pack
  "price_1TbKlkLr6wY7Jbr1g8aJjfBW": 9999, // unlimited monthly
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email;
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;
    const creditsToAdd = PRICE_CREDITS[priceId] || 0;

    if (customerEmail && creditsToAdd > 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, credits")
        .eq("email", customerEmail)
        .single();

      if (profile) {
        const newCredits = creditsToAdd === 9999 ? 9999 : (profile.credits || 0) + creditsToAdd;
        await supabase
          .from("profiles")
          .update({ credits: newCredits, plan: creditsToAdd === 9999 ? "monthly" : "pack" })
          .eq("id", profile.id);
      }
    }
  }

  res.status(200).json({ received: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 30,
};
