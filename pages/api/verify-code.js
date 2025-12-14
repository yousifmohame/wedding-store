// pages/api/verify-code.js
import redis from "../../lib/redis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      success: false,
      message: "البريد الإلكتروني ورمز التحقق مطلوبان",
    });
  }

  try {
    // Get the stored code from Redis
    const storedCode = await redis.get(`verification:${email}`);

    if (!storedCode) {
      return res.status(400).json({
        success: false,
        message: "رمز التحقق غير صالح أو انتهت صلاحيته",
      });
    }

    // Compare the codes
    if (storedCode !== code) {
      return res.status(400).json({
        success: false,
        message: "رمز التحقق غير صحيح",
      });
    }

    // If verification is successful, you might want to:
    // 1. Delete the code from Redis (optional)
    await redis.del(`verification:${email}`);

    // 2. Or mark it as verified (alternative approach)
    // await redis.set(`verified:${email}`, 'true', { EX: 3600 }); // 1 hour expiration

    return res.status(200).json({
      success: true,
      message: "تم التحقق بنجاح",
    });
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "حدث خطأ أثناء التحقق",
    });
  }
}
