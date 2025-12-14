import { useState } from "react";
import { auth, db } from "../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import "../app/globals.css";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    phone: "",
    businessName: "",
    businessType: "",
  });
  const [userType, setUserType] = useState("customer");
  const [verificationStep, setVerificationStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.includes("@") || !formData.email.includes(".")) {
      setError("بريد إلكتروني غير صالح");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post("/api/send-verification", {
        email: formData.email,
      });

      if (response.data.success) {
        setVerificationStep(2);
      } else {
        throw new Error(
          response.data.message || "Failed to send verification email"
        );
      }
    } catch (error) {
      console.error("Error:", error);
      setError(
        error.response?.data?.message || "حدث خطأ أثناء إرسال رمز التحقق"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCodeAndContinue = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.post("/api/verify-code", {
        email: formData.email,
        code: verificationCode,
      });

      if (response.data.success) {
        setVerificationStep(3);
      } else {
        setError(response.data.message || "رمز التحقق غير صحيح");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setError(error.response?.data?.message || "حدث خطأ أثناء التحقق");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("كلمة المرور غير متطابقة");
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      const userData = {
        email: user.email,
        displayName: formData.displayName,
        userType,
        createdAt: new Date().toISOString(),
        emailVerified: false,
      };

      if (userType === "supplier") {
        userData.phone = formData.phone;
        userData.businessName = formData.businessName;
        userData.businessType = formData.businessType;
        userData.approved = false;
        // Notify admin about new supplier
        await axios.post("/api/notify-admin", {
          businessName: formData.businessName,
          displayName: formData.displayName,
          email: formData.email,
          businessType: formData.businessType,
          phone: formData.phone,
        });
      }

      await setDoc(doc(db, "users", user.uid), userData);

      // Send welcome email
      await axios.post("/api/send-welcome-email", {
        email: formData.email,
        name: formData.displayName,
        userType,
      });

      router.push(userType === "supplier" ? "/supplier/waiting-approval" : "/");
    } catch (error) {
      console.error("Signup Error:", error);
      switch (error.code) {
        case "auth/email-already-in-use":
          setError("البريد الإلكتروني مستخدم بالفعل");
          break;
        case "auth/invalid-email":
          setError("بريد إلكتروني غير صالح");
          break;
        case "auth/weak-password":
          setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
          break;
        default:
          setError(error.message || "حدث خطأ أثناء التسجيل");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="flex justify-center items-center min-h-screen bg-gray-100"
    >
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="flex justify-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            <span className="text-blue-600">متجر</span>المناسبات
          </h1>
        </div>

        <h2 className="text-xl font-semibold text-gray-700 mt-4">
          إنشاء حساب جديد
        </h2>

        {verificationStep === 1 && (
          <>
            <div className="flex justify-center my-6">
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => setUserType("customer")}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                    userType === "customer"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  عميل
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("supplier")}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                    userType === "supplier"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  مورد
                </button>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border text-black rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
                disabled={isLoading}
              >
                {isLoading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
              </button>
            </form>
          </>
        )}

        {verificationStep === 2 && (
          <>
            <p className="text-gray-500 text-sm mb-6">
              تم إرسال رمز تحقق إلى بريدك الإلكتروني. يرجى إدخال الرمز للمتابعة.
            </p>

            <form onSubmit={verifyCodeAndContinue} className="space-y-4">
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  رمز التحقق
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full px-4 py-2 border text-black rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                  required
                  maxLength={6}
                />
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationStep(1);
                    setVerificationCode("");
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  العودة لتغيير البريد
                </button>

                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                >
                  تحقق والمتابعة
                </button>
              </div>
            </form>
          </>
        )}

        {verificationStep === 3 && (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  {userType === "customer" ? "الإسم الكامل" : "اسم المسؤول"}
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border text-black rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                  required
                />
              </div>

              {userType === "supplier" && (
                <>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">
                      اسم المنشأة
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border text-black rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 text-sm mb-1">
                      نوع الخدمة
                    </label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border text-black rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                      required
                    >
                      <option value="">اختر نوع الخدمة</option>
                      <option value="hall">قاعات أفراح</option>
                      <option value="catering">مطاعم وضيافة</option>
                      <option value="beauty">مراكز تجميل</option>
                      <option value="music">فرق غنائية</option>
                      <option value="photography">تصوير</option>
                      <option value="decoration">ديكور</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-600 text-sm mb-1">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border text-black rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-md text-black focus:ring-2 focus:ring-blue-400 outline-none"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-md text-black focus:ring-2 focus:ring-blue-400 outline-none"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    required
                  />
                </div>
                <div className="mr-3 text-sm">
                  <label htmlFor="terms" className="font-medium text-gray-700">
                    أوافق على{" "}
                    <Link
                      href="/terms"
                      className="text-blue-600 hover:underline"
                    >
                      الشروط والأحكام
                    </Link>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
                disabled={isLoading}
              >
                {isLoading ? "جاري التسجيل..." : "إنشاء حساب"}
              </button>
            </form>
          </>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded text-sm">
            {error}
          </div>
        )}

        <p className="text-center text-sm text-gray-600 mt-4">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-blue-500 hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
