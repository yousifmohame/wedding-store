import { useState } from "react";
import { auth } from "../lib/firebase"; // Import the auth instance
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation"; // Correct import
import Link from "next/link";
import "../app/globals.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false); // You can keep this if you want to implement "remember me" later
  const [error, setError] = useState(null); // State to hold any error messages
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear any previous errors

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      // User signed in successfully.
      console.log("User logged in:", userCredential.user);
      router.push("/"); // Redirect to the home page (or any other page)
    } catch (error) {
      // Handle Errors here.
      console.error("Login Error:", error.code, error.message);
      switch (error.code) {
        case "auth/invalid-email":
          setError("Invalid email address.");
          break;
        case "auth/user-disabled":
          setError("This user account has been disabled.");
          break;
        case "auth/user-not-found":
          setError("No user found with this email.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password.");
          break;
        default:
          setError("An error occurred during login."); // Generic error message
      }
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
          مرحبا مجددا
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          برجاء ادخال البيانات التالية للتسجيل
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-gray-900 text-sm mb-1">الإيميل</label>
            <div className="relative">
              <input
                type="email"
                placeholder="برجاء إدخال الإيميل"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border text-black rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-gray-900 text-sm mb-1">
              الباسوورد
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="برجاء إدخال الباسوورد"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border text-black rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                required
              />
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          {/* Remember Me & Forgot Password */}
          <div className="flex justify-between items-center">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
                className="mr-2"
              />
              تذكرني
            </label>
            {/* Wrap the "Forgot password?" link in a <Link> component */}
            <Link
              href="/forgot-password"
              className="text-sm text-blue-500 hover:underline"
            >
              نسيت الباسوورد؟
            </Link>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            تسجيل الدخول
          </button>
        </form>
        {/* Error Message */}
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        {/* Signup Link */}
        <p className="text-center text-sm text-gray-600 mt-4">
          لا تمتلك حساب ؟{" "}
          <Link href="/signup" className="text-blue-500 hover:underline">
            إنشاء حساب
          </Link>
        </p>
      </div>
    </div>
  );
}
