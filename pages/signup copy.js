import { useState } from "react";
import { auth, db } from "../lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import "../app/globals.css";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [userType, setUserType] = useState("customer");
  const [error, setError] = useState(null);
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [verificationStep, setVerificationStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!email.includes("@") || !email.includes(".")) {
      setError("بريد إلكتروني غير صالح");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await axios.post('/api/send-verification', {
        email: email
      });
      
      if (response.data.success) {
        setVerificationStep(2);
      } else {
        throw new Error("Failed to send verification email");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("حدث خطأ أثناء إرسال رمز التحقق");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCodeAndContinue = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.post('/api/verify-code', {
        email: email,
        code: verificationCode
      });
      
      if (response.data.success) {
        setVerificationStep(3);
      } else {
        setError("رمز التحقق غير صحيح");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setError("حدث خطأ أثناء التحقق");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("كلمة المرور غير متطابقة");
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await sendEmailVerification(user);

      const userData = {
        email: user.email,
        displayName,
        userType,
        createdAt: new Date().toISOString(),
        emailVerified: false,
      };

      if (userType === "supplier") {
        userData.phone = phone;
        userData.businessName = businessName;
        userData.businessType = businessType;
        userData.approved = false;
      }

      await setDoc(doc(db, "users", user.uid), userData);

      if (userType === "supplier") {
        router.push("/supplier/waiting-approval");
      } else {
        router.push("/");
      }
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
          setError("حدث خطأ أثناء التسجيل");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir="rtl" className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        {/* Header and steps remain the same as previous example */}
        {/* ... */}

        {verificationStep === 1 && (
          <>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
              >
                تحقق والمتابعة
              </button>
            </form>
          </>
        )}

        {verificationStep === 3 && (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* All your registration fields */}
              {/* ... */}
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
      </div>
    </div>
  );
}