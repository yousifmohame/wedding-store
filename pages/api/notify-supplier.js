// pages/api/notify-supplier.js
import nodemailer from "nodemailer";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { orderId, supplierId } = req.body;

  try {
    // Get supplier details
    const supplierDoc = await getDoc(doc(db, "users", supplierId));
    if (!supplierDoc.exists()) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }

    const supplier = supplierDoc.data();
    const orderDoc = await getDoc(doc(db, "orders", orderId));
    const order = orderDoc.data();

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
      to: supplier.email,
      subject: `طلب جديد يحتاج إلى موافقة - ${orderId}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">طلب جديد لخدماتك</h2>
          <p>مرحباً ${supplier.displayName},</p>
          <p>تم استلام طلب جديد لخدماتك في ${supplier.businessName}.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="margin-bottom: 10px;">معلومات الطلب:</h3>
            <p><strong>رقم الطلب:</strong> ${orderId}</p>
            <p><strong>تاريخ المناسبة:</strong> ${order.eventDetails.date}</p>
            <p><strong>نوع المناسبة:</strong> ${order.eventDetails.type}</p>
          </div>

          <p>الرجاء مراجعة الطلب والموافقة عليه أو رفضه خلال 24 ساعة:</p>
          
          <div style="margin: 25px 0; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/supplier/orders/${orderId}" 
               style="background-color: #D4AF37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              عرض تفاصيل الطلب
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            فريق متجر المناسبات
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error notifying supplier:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to notify supplier",
      error: error.message,
    });
  }
}
