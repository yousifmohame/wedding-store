// pages/api/verify-stripe-session.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { session_id } = req.query;

      if (!session_id) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["payment_intent"],
      });

      return res.status(200).json({
        orderId: session.metadata.orderId,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
      });
    } catch (error) {
      console.error("Error verifying Stripe session:", error);
      return res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
  }
}
