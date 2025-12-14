// pages/api/send-welcome-email.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, name, userType } = req.body;

  if (!email || !name) {
    return res.status(400).json({
      success: false,
      message: "البريد الإلكتروني والاسم مطلوبان",
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
    

    // Determine email content based on user type
    let subject, text, html;

    if (userType === "supplier") {
      subject = `مرحباً بكم ${name} - حساب مورد جديد`;
      text = `مرحباً ${name},\n\nتم إنشاء حساب المورد الخاص بك بنجاح.\n\nسيتم مراجعة طلبك والموافقة عليه خلال 24-48 ساعة.\n\nشكراً لانضمامكم إلينا!`;
      html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">مرحباً ${name},</h2>
          <p>تم إنشاء حساب المورد الخاص بك بنجاح.</p>
          <p>سيتم مراجعة طلبك والموافقة عليه خلال 24-48 ساعة.</p>
          <p>شكراً لانضمامكم إلينا!</p>
          <p style="margin-top: 30px; color: #6b7280;">فريق متجر المناسبات</p>
        </div>
      `;
    } else {
      subject = `مرحباً بكم ${name} - حساب عميل جديد`;
      text = `مرحباً ${name},\n\nتم إنشاء حسابك بنجاح في متجر المناسبات.\n\nيمكنك الآن تسجيل الدخول والبدء في تصفح خدماتنا.\n\nشكراً لانضمامك إلينا!`;
      html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">مرحباً ${name},</h2>
          <p>تم إنشاء حسابك بنجاح في متجر المناسبات.</p>
          <p>يمكنك الآن تسجيل الدخول والبدء في تصفح خدماتنا.</p>
          <p style="margin-top: 30px; color: #6b7280;">فريق متجر المناسبات</p>
        </div>
      `;
    }

    await transporter.sendMail({
      from: `"متجر المناسبات" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      text: text,
      html: html,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إرسال البريد الترحيبي",
      error: error.message,
    });
  }
  
}
