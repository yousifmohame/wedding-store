// src/app/orders/[id]/page.jsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; // Adjust path if needed
import { onAuthStateChanged } from "firebase/auth";
import NavBar from '@/components/NavBar'; // Adjust path if needed
import Footer from '@/components/Footer'; // Adjust path if needed

// Helper function to format Firestore Timestamps or ISO strings
const formatOrderDate = (timestamp) => {
  if (!timestamp) return 'غير متاح';
  try {
    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    }
    // Handle ISO strings (less likely for serverTimestamp but possible)
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date)) {
             return date.toLocaleDateString('ar-EG', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }
    }
    return 'تاريخ غير صالح';
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'خطأ في التاريخ';
  }
};

// Helper to format currency
const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return 'N/A';
    return `${amount.toFixed(2)} ر.س`;
}

// Helper to display order status nicely
const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
        case 'pending':
            return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-yellow-300">قيد الانتظار</span>;
        case 'processing':
            return <span className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-blue-300">قيد المعالجة</span>;
        case 'shipped':
             return <span className="bg-indigo-100 text-indigo-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-indigo-300">تم الشحن</span>;
        case 'delivered':
        case 'completed': // Treat completed same as delivered
            return <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-green-300">تم التوصيل</span>;
        case 'cancelled':
            return <span className="bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-red-300">ملغي</span>;
        case 'refunded':
             return <span className="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-gray-300">مسترجع</span>;
        default:
            return <span className="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-gray-300">{status || 'غير معروف'}</span>;
    }
}


export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id: orderId } = params; // Get the order ID from the route parameters

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError("معرّف الطلب غير موجود.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(true);
        setError(null); // Reset error on user change/fetch attempt
        try {
          const orderRef = doc(db, "orders", orderId);
          const orderSnap = await getDoc(orderRef);

          if (orderSnap.exists()) {
            const orderData = orderSnap.data();

            // --- Authorization Check ---
            // Allow if user is the one who placed the order OR if user is an admin (add admin check if needed)
            // Example admin check (assuming admin role is stored in user profile):
            // const userRef = doc(db, "users", user.uid);
            // const userSnap = await getDoc(userRef);
            // const isAdmin = userSnap.exists() && userSnap.data().role === 'admin';
            const isAdmin = false; // Replace with your actual admin check logic

            if (orderData.userId === user.uid || isAdmin) {
              setOrder({ id: orderSnap.id, ...orderData });
              setIsAuthorized(true);
            } else {
              setError("غير مصرح لك بعرض تفاصيل هذا الطلب.");
              setIsAuthorized(false);
            }
          } else {
            setError(`لم يتم العثور على طلب بالمعرّف: ${orderId}`);
            setIsAuthorized(false);
          }
        } catch (err) {
          console.error("Error fetching order:", err);
          setError("حدث خطأ أثناء جلب بيانات الطلب.");
          setIsAuthorized(false);
        } finally {
          setLoading(false);
        }
      } else {
        // User is not logged in
        setError("يجب تسجيل الدخول لعرض تفاصيل الطلب.");
        setLoading(false);
        setIsAuthorized(false);
        // Optional: Redirect to login after a delay
        // setTimeout(() => router.push(`/login?redirect=/orders/${orderId}`), 2000);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();

  }, [orderId, router]); // Rerun effect if orderId changes

  // --- Render Loading State ---
  if (loading) {
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

  // --- Render Error or Unauthorized State ---
  if (error || !isAuthorized) {
    return (
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <main className="flex-grow flex flex-col items-center justify-center text-center px-4 py-10">
          <h1 className="text-xl font-bold text-red-600 mb-4">
            {error || "حدث خطأ غير متوقع."}
          </h1>
          <Link
             href={isAuthorized ? "/orders" : "/login"} // Link to orders list or login
             className="mt-4 text-[#D4AF37] hover:text-[#B8860B] border border-[#D4AF37] px-4 py-2 rounded hover:bg-[#F5E8C7] transition"
           >
             {isAuthorized ? "العودة إلى طلباتي" : "تسجيل الدخول"}
           </Link>
        </main>
        <Footer />
      </div>
    );
  }

  // --- Render Order Details ---
  if (order) {
    return (
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <main dir="rtl" className="flex-grow bg-gray-50 py-8 px-4">
          <div className="container mx-auto max-w-4xl">
            {/* Order Header */}
            <div className="mb-6 pb-4 border-b border-gray-300">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
                        تفاصيل الطلب #{order.id.substring(0, 8)}... {/* Show partial ID */}
                        </h1>
                        <p className="text-sm text-gray-500">
                        تم الطلب في: {formatOrderDate(order.createdAt)}
                        </p>
                    </div>
                     <div className="mt-2 sm:mt-0">
                        <span className="text-sm font-medium text-gray-600 mr-2">الحالة:</span>
                         {getStatusBadge(order.status)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column (or Top on Mobile) - Items */}
              <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-5">الخدمات المطلوبة</h2>
                <div className="space-y-5">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, index) => (
                      <div key={item.serviceId || index} className="flex items-start gap-4 border-b border-gray-200 pb-4 last:border-b-0">
                        <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name || 'Service'}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs p-1">No Img</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-700">{item.name || 'خدمة غير مسماة'}</h3>
                          {item.packageName && <p className="text-sm text-gray-500">{item.packageName}</p>}
                           {/* Display other item details like description if needed */}
                           {/* <p className="text-xs text-gray-500">المزوّد: {item.supplierId || 'N/A'}</p> */}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-800">{formatCurrency(item.price)}</p>
                          <p className="text-xs text-gray-500">الكمية: 1</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">لا توجد خدمات في هذا الطلب.</p>
                  )}
                </div>

                {/* Order Totals */}
                 <div className="border-t border-gray-200 mt-6 pt-5 space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                          <span>المجموع الجزئي</span>
                          <span className="font-medium">{formatCurrency(order.subTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                          <span>الضريبة</span>
                          <span className="font-medium">{formatCurrency(order.tax)}</span>
                      </div>
                       {/* Add Shipping etc. if applicable */}
                      <div className="flex justify-between font-bold text-lg text-gray-800 mt-3 pt-3 border-t border-gray-300">
                          <span>الإجمالي</span>
                          <span className="text-[#D4AF37]">{formatCurrency(order.totalAmount)}</span>
                      </div>
                  </div>
              </div>

              {/* Right Column (or Bottom on Mobile) - Customer Info */}
              <div className="md:col-span-1 space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">معلومات العميل</h2>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium text-gray-600">الاسم:</span> {order.customerInfo?.name || 'غير متوفر'}</p>
                    <p><span className="font-medium text-gray-600">الهاتف:</span> {order.customerInfo?.phone || 'غير متوفر'}</p>
                    <p><span className="font-medium text-gray-600">البريد:</span> {order.customerInfo?.email || 'غير متوفر'}</p>
                     {order.customerInfo?.address && <p><span className="font-medium text-gray-600">العنوان:</span> {order.customerInfo.address}</p>}
                  </div>
                </div>

                 <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">معلومات الدفع</h2>
                   <div className="space-y-2 text-sm">
                      <p><span className="font-medium text-gray-600">طريقة الدفع:</span> {
                          order.paymentMethod === 'credit' ? 'بطاقة ائتمان / مدى' :
                          order.paymentMethod === 'bank' ? 'تحويل بنكي' :
                          order.paymentMethod === 'cash' ? 'الدفع نقدًا' : 'غير محدد'
                      }</p>
                       {/* Add payment status if available */}
                  </div>
                </div>

                {order.customerInfo?.notes && (
                     <div className="bg-white rounded-lg shadow p-6">
                         <h2 className="text-xl font-semibold text-gray-800 mb-4">ملاحظات الطلب</h2>
                         <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.customerInfo.notes}</p>
                     </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Fallback if order is null after loading and no error (shouldn't normally happen)
  return null;
}