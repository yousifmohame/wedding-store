// pages/api/send-approval-email.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, name, businessName } = req.body;

  if (!email || !name) {
    return res.status(400).json({
      success: false,
      message: "Email and name are required",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.hostinger.com",
      port: process.env.EMAIL_PORT || 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const subject = `تم اعتماد حسابك - ${businessName || "متجر المناسبات"}`;
    const text = `مرحباً ${name},\n\nتم اعتماد حساب المورد الخاص بكم (${
      businessName || "منشأتك"
    }) بنجاح.\n\nيمكنك الآن تسجيل الدخول والبدء في إدارة خدماتك.\n\nشكراً لانضمامكم إلينا!`;

    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">مرحباً ${name},</h2>
        <p>تم اعتماد حساب المورد الخاص بكم (<strong>${
          businessName || "منشأتك"
        }</strong>) بنجاح.</p>
        <p>يمكنك الآن تسجيل الدخول والبدء في إدارة خدماتك.</p>
        <p><a href="${
          process.env.NEXT_PUBLIC_SITE_URL ||
          "https://www.ma3zom.com/supplier/dashboard"
        }/supplier/login" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">تسجيل الدخول إلى لوحة التحكم</a></p>
        <p style="margin-top: 30px; color: #6b7280;">فريق متجر المناسبات</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"متجر المناسبات" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      text: text,
      html: html,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending approval email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send approval email",
      error: error.message,
    });
  }
}
