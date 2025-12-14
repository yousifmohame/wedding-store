// pages/api/send-verification.js
import redis from "@/lib/redis";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email } = req.body;

  try {
    // Generate verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Store code in Redis with 10min expiration
    await redis.set(`verification:${email}`, verificationCode, {
      EX: 600, // 10 minutes in seconds
    });

    // Send email logic here...
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"MA3ZOM Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your MA3ZOM Verification Code",
      text: `
        MA3ZOM Verification Code
        ------------------------
        Your verification code is: ${verificationCode}
        
        This code will expire in 15 minutes.
        
        If you didn't request this code, please ignore this email.
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <h1 style="color: #2c3e50; text-align: center; margin-bottom: 5px;">MA3ZOM</h1>
          <div style="text-align: center; margin-bottom: 25px; color: #7f8c8d; font-size: 14px;">
            Account Verification
          </div>
          
          <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px;">
            <p>Hello,</p>
            <p>Please use the following verification code to complete your request:</p>
            
            <div style="background-color: #ffffff; border: 1px solid #e1e1e1; 
                      padding: 15px; text-align: center; margin: 20px 0; 
                      font-size: 24px; font-weight: bold; letter-spacing: 2px;
                      color: #3498db; border-radius: 4px;">
              ${verificationCode}
            </div>
            
            <p style="margin-bottom: 0;">This code will expire in <strong>15 minutes</strong>.</p>
          </div>
          
          <div style="margin-top: 30px; font-size: 12px; color: #95a5a6; text-align: center;">
            <p>If you didn't request this code, please ignore this email.</p>
            <p style="margin-top: 20px;">
              &copy; ${new Date().getFullYear()} MA3ZOM. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send verification code",
    });
  }
}
