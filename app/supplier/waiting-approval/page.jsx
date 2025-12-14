// src/app/supplier/waiting-approval/page.jsx
"use client";
import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function WaitingApproval() {
  const router = useRouter();

  // Check if user is logged in
  useEffect(() => {
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={120}
              height={120}
              className="h-24 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            طلب التسجيل قيد المراجعة
          </h1>
          <div className="mt-12 bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-12 sm:px-12">
              <div className="flex justify-center mb-8">
                <div className="bg-blue-100 p-4 rounded-full">
                  <svg
                    className="h-12 w-12 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                شكراً لتسجيلك كمورد في منصة مناسبات
              </h2>
              <p className="text-gray-600 mb-6">
                تم استلام طلب تسجيلك بنجاح وهو الآن قيد المراجعة من قبل فريقنا.
                سوف تتلقى رسالة بريد إلكتروني بمجرد الموافقة على حسابك.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-blue-700">
                      متوسط وقت المراجعة هو 24-48 ساعة. يمكنك تسجيل الخروج أثناء
                      انتظار الموافقة.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <button
                  onClick={() => auth.signOut()}
                  className="w-full md:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  تسجيل الخروج
                </button>
                <Link
                  href="/contact"
                  className="mt-4 md:mt-0 md:mr-4 w-full md:w-auto inline-flex justify-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  تواصل مع الدعم
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              لديك استفسار؟{" "}
              <Link
                href="/faq"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                تصفح الأسئلة الشائعة
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}