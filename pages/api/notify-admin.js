// pages/api/notify-admin.js
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { businessName, displayName, email, businessType, phone } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const adminEmails = process.env.ADMIN_EMAILS.split(',');

    const mailOptions = {
      from: `"متجر المناسبات" <${process.env.EMAIL_USER}>`,
      to: adminEmails,
      subject: `طلب انضمام مورد جديد: ${businessName}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">طلب انضمام مورد جديد</h2>
          <h3>${businessName}</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">اسم المنشأة</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${businessName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">اسم المسؤول</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${displayName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">البريد الإلكتروني</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">نوع الخدمة</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${businessType}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">رقم الجوال</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${phone}</td>
            </tr>
          </table>
          
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/suppliers" 
             style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            الذهاب إلى لوحة التحكم
          </a>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error notifying admin:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to notify admin',
      error: error.message
    });
  }
}