"use client";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import {
  onAuthStateChanged,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
        setIsVerified(user.emailVerified);

        // Check every 5 seconds if email is verified
        const interval = setInterval(async () => {
          await reload(user);
          if (user.emailVerified) {
            clearInterval(interval);
            setIsVerified(true);
            // Redirect based on user type (you might need to fetch this from Firestore)
            router.push("/");
          }
        }, 5000);

        return () => clearInterval(interval);
      } else {
        router.push("/signup");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const resendVerificationEmail = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setEmailSent(true);
      }
    } catch (error) {
      console.error("Error resending verification email:", error);
    }
  };

  return (
    <div
      dir="rtl"
      className="flex justify-center items-center min-h-screen bg-gray-100"
    >
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">
            {isVerified
              ? "تم التحقق من البريد الإلكتروني بنجاح!"
              : "التحقق من البريد الإلكتروني"}
          </h1>

          {!isVerified ? (
            <>
              <p className="text-gray-600 mb-4">
                تم إرسال رابط التحقق إلى{" "}
                <span className="font-medium">{userEmail}</span>. يرجى التحقق من
                بريدك الإلكتروني والنقر على الرابط المرفق.
              </p>

              <p className="text-gray-500 text-sm mb-6">
                إذا لم تستلم البريد الإلكتروني، يرجى التحقق من مجلد الرسائل غير
                المرغوب فيها أو
              </p>

              <button
                onClick={resendVerificationEmail}
                disabled={emailSent}
                className={`w-full py-2 rounded-md ${
                  emailSent ? "bg-gray-300" : "bg-blue-600 hover:bg-blue-700"
                } text-white transition`}
              >
                {emailSent ? "تم الإرسال" : "إعادة إرسال رابط التحقق"}
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                يمكنك الآن استخدام حسابك بالكامل. سيتم توجيهك تلقائيًا إلى
                الصفحة الرئيسية.
              </p>
              <Link href="/" className="text-blue-600 hover:underline">
                الذهاب إلى الصفحة الرئيسية الآن
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
