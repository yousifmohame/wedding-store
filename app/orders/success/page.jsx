// src/app/orders/success/page.jsx
"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import NavBar from '@/components/NavBar'; // Adjust path if needed
import Footer from '@/components/Footer'; // Adjust path if needed

// Wrapper component to handle Suspense for useSearchParams
export default function OrderSuccessPageWrapper() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OrderSuccessPage />
    </Suspense>
  );
}

function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    const id = searchParams.get('orderId');
    if (id) {
      setOrderId(id);
    } else {
      // If no orderId is found, maybe redirect back to home or orders page after a delay
      console.warn("Order ID not found in URL parameters.");
      // setTimeout(() => router.push('/'), 3000); // Optional redirect
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main dir="rtl" className="flex-grow bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 text-center max-w-lg w-full">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            تم استلام طلبك بنجاح!
          </h1>

          {/* Order ID Display */}
          {orderId ? (
            <p className="text-lg text-gray-600 mb-6">
              رقم طلبك هو: <span className="font-semibold text-[#D4AF37]">#{orderId}</span>
            </p>
          ) : (
            <p className="text-lg text-gray-600 mb-6">
              شكراً لك على طلبك.
            </p>
          )}

          {/* Next Steps Info */}
          <p className="text-gray-500 mb-8">
            شكرًا لك على التسوق معنا. ستتلقى تأكيدًا للطلب عبر البريد الإلكتروني (إذا تم توفيره) قريبًا. يمكنك تتبع حالة طلبك من خلال صفحة طلباتك.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {orderId && (
              <Link
                href={`/orders/${orderId}`} // Link to the specific order details page (needs to be created)
                className="bg-[#D4AF37] hover:bg-[#B8860B] text-white font-medium py-2.5 px-6 rounded-lg transition duration-200"
              >
                عرض تفاصيل الطلب
              </Link>
            )}
            <Link
              href="/services" // Link back to services or home page
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2.5 px-6 rounded-lg border border-gray-300 transition duration-200"
            >
              متابعة التسوق
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Simple loading component for Suspense fallback
function LoadingSpinner() {
  return (
      <div className="flex flex-col min-h-screen">
      <NavBar />
       <div className="flex-grow flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
       </div>
      <Footer />
      </div>
  );
}