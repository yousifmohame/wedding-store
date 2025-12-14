// src/app/orders/cancel/page.jsx
"use client";
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

export default function CancelPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4 py-10 bg-gray-50">
        <h1 className="text-2xl font-bold text-red-600 mb-4">تم إلغاء الدفع</h1>
        <p className="text-gray-600 mb-6">تم إلغاء عملية الدفع الخاصة بك.</p>
        <Link
          href="/orders"
          className="text-[#D4AF37] hover:text-[#B8860B] border border-[#D4AF37] px-4 py-2 rounded hover:bg-[#F5E8C7] transition"
        >
          العودة إلى طلباتي
        </Link>
      </main>
      <Footer />
    </div>
  );
}