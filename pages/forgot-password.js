import { useState } from "react";
import { auth } from "../lib/firebase"; // Import the auth instance
import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link"; // Import Link
import "../app/globals.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null); // State for success/error messages
  const [error, setError] = useState(null); // State for error messages.  Good to separate.
  const [loading, setLoading] = useState(false); // State to indicate loading status

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage(null); // Clear previous messages
    setError(null);
    setLoading(true); // Set loading to true before starting the async operation

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(
        "تم إرسال رابط إعادة تعيين كلمة المرور.  تحقق من صندوق الوارد الخاص بك (ومجلد البريد العشوائي)."
      );
      setEmail(""); // Optionally clear the email field after success
    } catch (error) {
      console.error("Password Reset Error:", error.code, error.message);
      switch (error.code) {
        case "auth/invalid-email":
          setError("عنوان البريد الإلكتروني غير صالح.");
          break;
        case "auth/user-not-found":
          setError("لا يوجد مستخدم بهذا البريد الإلكتروني.");
          break;
        default:
          setError("حدث خطأ أثناء إرسال رابط إعادة التعيين.");
      }
    } finally {
      setLoading(false); // Set loading to false after the operation completes (success or failure)
    }
  };

  return (
    <div
      dir="rtl"
      className="flex justify-center items-center min-h-screen bg-gray-100"
    >
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
        <div className="flex justify-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            <span className="text-blue-600">متجر</span>المناسبات
          </h1>
        </div>
        <h2 className="text-xl font-semibold text-gray-700 mt-4">
          إعادة تعيين كلمة المرور
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          أدخل عنوان بريدك الإلكتروني لتلقي رابط إعادة تعيين كلمة المرور.
        </p>

        <form onSubmit={handleResetPassword} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-gray-600 text-sm mb-1">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="أدخل بريدك الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                required
              />
            </div>
          </div>

          {/* Reset Password Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={loading} // Disable the button while loading
          >
            {loading ? "جاري الإرسال..." : "إعادة تعيين كلمة المرور"}
          </button>
        </form>

        {/* Message Display */}
        {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        {/* Back to Login Link */}
        <p className="text-center text-sm text-gray-600 mt-4">
          تتذكر كلمة المرور؟{" "}
          <Link href="/login" className="text-blue-500 hover:underline">
            العودة لتسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
