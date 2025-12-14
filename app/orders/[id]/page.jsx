// src/app/orders/[id]/page.jsx
"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { loadStripe } from '@stripe/stripe-js';

const formatOrderDate = (timestamp) => {
  if (!timestamp) return 'غير متاح';
  try {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    }
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

const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return 'N/A';
  return `${amount.toFixed(2)} د.إ`;
};

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
      return <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-green-300">تم تأكيد الطلب يمكنك الدفع الأن</span>;
    case 'cancelled':
      return <span className="bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-red-300">ملغي</span>;
    case 'paymentcompleted':
      return <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-green-300">تم الدفع بنجاح</span>;
    case 'refunded':
      return <span className="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-gray-300">مسترجع</span>;
    default:
      return <span className="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-gray-300">{status || 'غير معروف'}</span>;
  }
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id: orderId } = params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError("معرّف الطلب غير موجود.");
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(true);
        setError(null);
        try {
          const orderRef = doc(db, "orders", orderId);
          const orderSnap = await getDoc(orderRef);
          if (orderSnap.exists()) {
            const orderData = orderSnap.data();
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
        setError("يجب تسجيل الدخول لعرض تفاصيل الطلب.");
        setLoading(false);
        setIsAuthorized(false);
      }
    });
    return () => unsubscribe();
  }, [orderId, router]);

  const handleStripePayment = async () => {
    if (!order || !order.id) {
      console.error("Order details not available for payment.");
      setError("لا يمكن المتابعة للدفع، تفاصيل الطلب غير متوفرة.");
      return;
    }

    setIsProcessingPayment(true);
    setError(null);

    try {
      // Call your API endpoint to create a Stripe Checkout session
      const response = await fetch('/api/create-stripe-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.totalAmount,
          currency: 'AED', // UAE Dirhams
          customerEmail: order.customerInfo?.email,
        }),
      });

      const session = await response.json();

      if (session.error) {
        throw new Error(session.error);
      }

      // Load Stripe.js
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      
      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (err) {
      console.error("Error processing payment:", err);
      setError(`فشل في بدء عملية الدفع: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

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

  if (error || !isAuthorized) {
    return (
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <main className="flex-grow flex flex-col items-center justify-center text-center px-4 py-10">
          <h1 className="text-xl font-bold text-red-600 mb-4">
            {error || "حدث خطأ غير متوقع."}
          </h1>
          <Link
            href={isAuthorized ? "/orders" : "/login"}
            className="mt-4 text-[#D4AF37] hover:text-[#B8860B] border border-[#D4AF37] px-4 py-2 rounded hover:bg-[#F5E8C7] transition"
          >
            {isAuthorized ? "العودة إلى طلباتي" : "تسجيل الدخول"}
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

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
                    تفاصيل الطلب #{order.id.substring(0, 8)}...
                  </h1>
                  <p className="text-sm text-gray-500">
                    تم الطلب في: {formatOrderDate(order.createdAt)}
                  </p>
                </div>
                <div className="mt-2 sm:mt-0">
                  <span className="text-sm font-medium text-gray-600 mr-2">الحالة:</span>
                  {getStatusBadge(order.status)}
                  
                  {order.status?.toLowerCase() === 'completed' && (
                    <button
                      onClick={handleStripePayment}
                      disabled={isProcessingPayment}
                      className="ml-4 text-[#D4AF37] hover:text-[#B8860B] border border-[#D4AF37] px-4 py-2 rounded hover:bg-[#F5E8C7] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessingPayment ? 'جاري التجهيز...' : 'دفع الآن (Stripe)'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Items List */}
              <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-5">الخدمات المطلوبة</h2>
                <div className="space-y-5">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, index) => {
                      const uniqueKey = `${item.serviceId || 'no-id'}-${index}-${item.packageName || 'no-pkg'}`;
                      return (
                        <div key={uniqueKey} className="flex items-start gap-4 border-b border-gray-200 pb-4 last:border-b-0">
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
                            {item.packageDescription && <p className="text-xs text-gray-500 mt-1">{item.packageDescription}</p>}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-800">{formatCurrency(item.price)}</p>
                            {item.taxRate > 0 && (
                              <p className="text-xs text-gray-500">ضريبة القيمة المضافة: {formatCurrency(item.price * item.taxRate / 100)}</p>
                            )}
                            {item.serviceTax > 0 && (
                              <p className="text-xs text-gray-500">رسوم الخدمة: {formatCurrency(item.price * item.serviceTax / 100)}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
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
                  {order.vat > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>ضريبة القيمة المضافة</span>
                      <span className="font-medium">{formatCurrency(order.vat)}</span>
                    </div>
                  )}
                  {order.serviceTax > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>رسوم الخدمة</span>
                      <span className="font-medium">{formatCurrency(order.serviceTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg text-gray-800 mt-3 pt-3 border-t border-gray-300">
                    <span>الإجمالي</span>
                    <span className="text-[#D4AF37]">{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
              {/* Customer Info */}
              <div className="md:col-span-1 space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">معلومات العميل</h2>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-black"><span className="font-medium text-gray-600">الاسم:</span> {order.customerInfo?.name || 'غير متوفر'}</p>
                    <p className="font-medium text-black"><span className="font-medium text-gray-600">الهاتف:</span> {order.customerInfo?.phone || 'غير متوفر'}</p>
                    <p className="font-medium text-black"><span className="font-medium text-gray-600">البريد:</span> {order.customerInfo?.email || 'غير متوفر'}</p>
                    {order.customerInfo?.address && <p className="font-medium text-black"><span className="font-medium text-gray-600">العنوان:</span> {order.customerInfo.address}</p>}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">معلومات الدفع</h2>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-black"><span className="font-medium text-gray-600">طريقة الدفع:</span> {
                      order.paymentMethod === 'credit' ? 'بطاقة ائتمان' :
                      order.paymentMethod === 'bank' ? 'تحويل بنكي' :
                      order.paymentMethod === 'cash' ? 'الدفع نقدًا' : 'غير محدد'
                    }</p>
                  </div>
                </div>
                {order.eventDetails && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">تفاصيل المناسبة</h2>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-black"><span className="font-medium text-gray-600">النوع:</span> {
                        order.eventDetails.type === 'birthday' ? 'حفلة عيد ميلاد' :
                        order.eventDetails.type === 'wedding' ? 'حفل زفاف' :
                        order.eventDetails.type === 'graduation' ? 'حفل تخرج' :
                        order.eventDetails.type === 'corporate' ? 'مناسبة شركة' :
                        order.eventDetails.type === 'family' ? 'مناسبة عائلية' : 'أخرى'
                      }</p>
                      {order.eventDetails.date && (
                        <p className="font-medium text-black"><span className="font-medium text-gray-600">التاريخ:</span> {new Date(order.eventDetails.date).toLocaleDateString('ar-EG')}</p>
                      )}
                      {order.eventDetails.time && (
                        <p className="font-medium text-black"><span className="font-medium text-gray-600">الوقت:</span> {
                          order.eventDetails.time === 'morning' ? 'الصباح (9 ص - 12 م)' :
                          order.eventDetails.time === 'afternoon' ? 'بعد الظهر (12 م - 4 م)' :
                          order.eventDetails.time === 'evening' ? 'المساء (4 م - 8 م)' :
                          order.eventDetails.time === 'night' ? 'الليل (8 م - 12 ص)' : order.eventDetails.time
                        }</p>
                      )}
                    </div>
                  </div>
                )}
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
  return null;
}