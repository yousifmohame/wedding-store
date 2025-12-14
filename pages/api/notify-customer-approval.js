// pages/api/notify-customer-approval.js
import nodemailer from "nodemailer";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { orderId } = req.body;

  try {
    // Get order details
    const orderDoc = await getDoc(doc(db, "orders", orderId));
    if (!orderDoc.exists()) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const order = orderDoc.data();
    const customerEmail = order.customerInfo?.email || order.customerEmail;

    if (!customerEmail) {
      return res
        .status(400)
        .json({ success: false, message: "Customer email not found" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"متجر المناسبات" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `تم قبول طلبك #${orderId.slice(0, 8)} - يرجى إتمام الدفع`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">تم قبول طلبك!</h2>
          <p>مرحباً ${order.customerInfo?.name || "عميلنا العزيز"},</p>
          
          <p>نود إعلامك بأن المورد قد قام بقبول طلبك رقم <strong>#${orderId.slice(
            0,
            8
          )}</strong>.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="margin-bottom: 10px;">ملخص الطلب:</h3>
            <p><strong>رقم الطلب:</strong> ${orderId.slice(0, 8)}</p>
            <p><strong>المجموع:</strong> ${order.totalAmount?.toFixed(
              2
            )} درهم</p>
            <p><strong>تاريخ المناسبة:</strong> ${
              order.eventDetails?.date || "غير محدد"
            }</p>
          </div>

          <p>الرجاء إتمام عملية الدفع لضمان حجز خدماتك:</p>
          
          <div style="margin: 25px 0; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/orders/${orderId}" 
               style="background-color: #D4AF37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              إتمام الدفع الآن
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            شكراً لاختيارك متجر المناسبات
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error notifying customer:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to notify customer",
      error: error.message,
    });
  }
}
