// pages/api/create-stripe-session.js

import { buffer } from "micro";
import Stripe from "stripe";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15", // Use the latest API version available
});

export const config = {
  api: {
    bodyParser: false, // Disable default body parser to handle raw body for webhook verification (if needed)
  },
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // Get raw body for Stripe signature verification (optional)
      const rawBody = await buffer(req);
      const signature = req.headers["stripe-signature"];

      let event;
      try {
        // Verify webhook signature if applicable (not required for session creation)
        // event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.error(
          `⚠️ Webhook signature verification failed: ${err.message}`
        );
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Parse the request body
      const payload = JSON.parse(rawBody.toString());

      // Extract order details from the payload
      const { orderId, amount, currency, customerEmail } = payload;

      if (!orderId || !amount || !currency || !customerEmail) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      // Create a Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: `Order #${orderId}`,
              },
              unit_amount: Math.round(amount * 100), // Convert to cents (or smallest currency unit)
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/successpay?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/cancel`,
        customer_email: customerEmail,
        metadata: {
          orderId: orderId,
        },
      });

      // Return the session ID to the client
      return res.status(200).json({ id: session.id });
    } catch (error) {
      console.error("Error creating Stripe session:", error);
      return res
        .status(500)
        .json({ error: `Failed to create session: ${error.message}` });
    }
  } else {
    // Handle unsupported HTTP methods
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
}
