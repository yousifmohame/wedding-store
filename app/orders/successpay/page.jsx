// src/app/orders/success/page.jsx
"use client";
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

function SuccessContent() {
  const searchParams = useSearchParams();
  const session_id = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const verifyPaymentAndProcessOrder = async () => {
      if (!session_id) {
        setError("رقم الجلسة غير موجود.");
        setLoading(false);
        return;
      }
      try {
        // Fetch the session details from Stripe
        const response = await fetch(`/api/verify-stripe-session?session_id=${session_id}`);
        const sessionData = await response.json();

        if (sessionData.error) {
          throw new Error(sessionData.error);
        }

        const { orderId, payment_status } = sessionData;

        if (payment_status === 'paid') {
          // Update Firestore document to mark the order as payment completed
          const orderRef = doc(db, "orders", orderId);
          await updateDoc(orderRef, {
            status: 'paymentcompleted',
            paymentStatus: 'paid',
            paymentDate: new Date(),
            updatedAt: new Date(),
          });

          setLoading(false);
        } else {
          setError("لم يتم تأكيد الدفع بعد.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error verifying payment:", err);
        setError(`حدث خطأ أثناء التحقق من الدفع: ${err.message}`);
        setLoading(false);
      }
    };

    verifyPaymentAndProcessOrder();
  }, [session_id, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <main className="flex-grow flex flex-col items-center justify-center text-center px-4 py-10 bg-gray-50">
      <h1 className={`text-2xl font-bold ${error ? 'text-red-600' : 'text-green-600'} mb-4`}>
        {error || "تم الدفع بنجاح!"}
      </h1>
      <p className="text-gray-600 mb-6">شكراً لك على إتمام عملية الدفع.</p>
      <Link
        href="/orders"
        className="text-[#D4AF37] hover:text-[#B8860B] border border-[#D4AF37] px-4 py-2 rounded hover:bg-[#F5E8C7] transition"
      >
        العودة إلى طلباتي
      </Link>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <Suspense fallback={
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
        </div>
      }>
        <SuccessContent />
      </Suspense>
      <Footer />
    </div>
  );
}