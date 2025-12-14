// src/app/pay/[orderId]/page.jsx

"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc } from "firebase/firestore"; // Add updateDoc
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

// Format Currency (AED or USD)
const formatCurrency = (amount, currency = 'AED') => {
  if (typeof amount !== 'number') return 'N/A';
  if (currency === 'AED') {
    return `${amount.toFixed(2)} د.إ`; // Format for UAE Dirham
  }
  return `$${amount.toFixed(2)}`; // Default to USD
};

// Status Badge Display
const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-yellow-300">قيد الانتظار</span>;
    case 'paid': // Example new status after successful payment
      return <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-green-300">مدفوع</span>;
    default:
      return <span className="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-gray-300">{status || 'غير معروف'}</span>;
  }
};

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center space-x-2 text-blue-600">
    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
    <span>جاري التحميل...</span>
  </div>
);

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { orderId } = params; // Get orderId from URL
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false); // State for payment processing
  const [paymentError, setPaymentError] = useState(null); // State for payment-specific errors
  const [conversionRate, setConversionRate] = useState(null); // Dynamic conversion rate

  // Fetch Conversion Rate Dynamically
  const fetchConversionRate = async () => {
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/AED`);
      if (!response.ok) throw new Error('Failed to fetch exchange rate.');
      const data = await response.json();
      setConversionRate(data.rates.USD); // Set AED to USD rate
    } catch (err) {
      console.error("Error fetching conversion rate:", err);
      setConversionRate(0.2723); // Fallback rate (1 AED = 0.2723 USD)
    }
  };

  useEffect(() => {
    if (!orderId) {
      setError("معرّف الطلب غير موجود في الرابط.");
      setLoading(false);
      return;
    }
    fetchConversionRate(); // Fetch conversion rate on component load
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(true);
        setError(null);
        try {
          const orderRef = doc(db, "orders", orderId);
          const orderSnap = await getDoc(orderRef);
          if (orderSnap.exists()) {
            const orderData = orderSnap.data();
            // Security Check: Ensure the logged-in user owns this order
            if (orderData.userId === user.uid) {
              // Check if order is already paid or in a non-payable state
              if (['paid', 'delivered', 'shipped', 'cancelled', 'refunded'].includes(orderData.status)) {
                setError(`لا يمكن دفع هذا الطلب. الحالة الحالية: ${orderData.status}`);
                setOrder({ id: orderSnap.id, ...orderData }); // Still set order to show details maybe
              } else {
                setOrder({ id: orderSnap.id, ...orderData });
              }
            } else {
              setError("غير مصرح لك بدفع هذا الطلب.");
            }
          } else {
            setError(`لم يتم العثور على طلب بالمعرّف: ${orderId}`);
          }
        } catch (err) {
          console.error("Error fetching order for payment:", err);
          setError("حدث خطأ أثناء جلب بيانات الطلب للدفع.");
        } finally {
          setLoading(false);
        }
      } else {
        // User not logged in
        setError("يجب تسجيل الدخول للمتابعة إلى الدفع.");
        setLoading(false);
        router.push(`/login?redirect=/pay/${orderId}`); // Redirect to login, then back here
      }
    });
    return () => unsubscribe();
  }, [orderId, router]); // Add router dependency

  // Render PayPal Button
  const renderPayPalButton = () => {
    if (typeof window !== 'undefined' && window.paypal && conversionRate) {
      const container = document.getElementById('paypal-button-container');
      if (container) container.innerHTML = '';
      window.paypal.Buttons({
        createOrder: (data, actions) => {
          const totalAmountInUsd = (order.totalAmount * conversionRate).toFixed(2);
          return actions.order.create({
            purchase_units: [{
              description: `Order #${order.id}`,
              amount: {
                currency_code: 'USD', // Use USD
                value: totalAmountInUsd,
              },
            }],
          });
        },
        onApprove: async (data, actions) => {
          setPaymentProcessing(true);
          setPaymentError(null);
          try {
            const details = await actions.order.capture();
            console.log('PayPal Capture Details:', details);
            // Update Firestore with payment details
            const orderRef = doc(db, "orders", order.id);
            await updateDoc(orderRef, {
              status: 'paid',
              paymentStatus: 'completed',
              paidAt: new Date(),
              paymentDetails: {
                method: 'paypal',
                transactionId: details.id,
                payerEmail: details.payer.email_address,
                status: details.status,
              },
            });
            setOrder(prev => ({ ...prev, status: 'paid', paymentStatus: 'completed' }));
            router.push(`/orders/success/${order.id}?status=paid`); // Redirect on success
          } catch (captureError) {
            console.error('PayPal Capture Error:', captureError);
            setPaymentError('فشل تأكيد الدفع عبر PayPal.');
          } finally {
            setPaymentProcessing(false);
          }
        },
        onError: (err) => {
          console.error('PayPal Button Error:', err);
          setPaymentError('حدث خطأ أثناء عملية الدفع عبر PayPal.');
          setPaymentProcessing(false);
        },
        onCancel: () => {
          console.log('PayPal payment cancelled by user.');
          setPaymentError('تم إلغاء عملية الدفع.');
          setPaymentProcessing(false);
        },
      }).render('#paypal-button-container'); // Render buttons into this element
    } else {
      return <p>جاري تحميل خيارات الدفع...</p>;
    }
  };

  // Load PayPal SDK Script
  useEffect(() => {
    if (document.getElementById('paypal-sdk-script')) {
      if (order && !loading && !error && conversionRate) renderPayPalButton(); // Render if SDK already loaded
      return;
    }
    const script = document.createElement('script');
    script.id = 'paypal-sdk-script';
    // Replace YOUR_PAYPAL_CLIENT_ID with your actual client ID
    script.src = `https://www.paypal.com/sdk/js?client-id=AThAPrU-X9JCNvBtdgzNV0K-U2O0yVpgyPOc2JitERTLt96vz0AsQG7jgsmZNrGJzsJWFhCfkD9RcNL_&currency=USD`;
    script.async = true;
    script.onload = () => {
      console.log('PayPal SDK loaded.');
      if (order && !loading && !error && conversionRate) renderPayPalButton();
    };
    script.onerror = () => {
      console.error('Failed to load PayPal SDK.');
      setPaymentError('فشل تحميل خيارات الدفع. يرجى المحاولة مرة أخرى.');
    };
    document.body.appendChild(script);
  }, [order, loading, error, conversionRate]);

  // Loading State
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <div className="flex-grow flex justify-center items-center">
          <LoadingSpinner />
        </div>
        <Footer />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <main className="flex-grow flex flex-col items-center justify-center text-center px-4 py-10">
          <h1 className="text-xl font-bold text-red-600 mb-4">{error}</h1>
          <Link
            href={order ? `/orders/${order.id}` : "/orders"} // Link back to order details or list
            className="mt-4 text-[#D4AF37] hover:text-[#B8860B] border border-[#D4AF37] px-4 py-2 rounded hover:bg-[#F5E8C7] transition"
          >
            {order ? "العودة إلى تفاصيل الطلب" : "العودة إلى طلباتي"}
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  // Payment Page Content
  if (order) {
    return (
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <main dir="rtl" className="flex-grow bg-gray-50 py-12 px-4">
          <div className="container mx-auto max-w-lg"> {/* Smaller container for payment */}
            <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
              <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                إتمام الدفع للطلب #{order.id.substring(0, 8)}
              </h1>
              <div className="mb-6 text-center">
                <span className="text-sm font-medium text-gray-600 ml-2">الحالة:</span>
                {getStatusBadge(order.status)}
              </div>
              {/* Order Summary */}
              <div className="border-t border-b border-gray-200 py-4 mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">ملخص الطلب</h2>
                <div className="flex justify-between font-bold text-xl text-gray-800">
                  <span>المبلغ الإجمالي للدفع:</span>
                  <span className="text-[#D4AF37]">{formatCurrency(order.totalAmount, 'AED')}</span>
                </div>
              </div>
              {/* Payment Options Area */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">اختر طريقة الدفع</h2>
                {paymentError && (
                  <div className="text-red-600 bg-red-100 border border-red-400 p-3 rounded text-sm">
                    {paymentError}
                  </div>
                )}
                {paymentProcessing && <LoadingSpinner />}
                <div id="paypal-button-container" className={paymentProcessing ? 'opacity-50 pointer-events-none' : ''}>
                  {/* PayPal buttons will render here */}
                </div>
              </div>
              <div className="mt-8 text-center">
                <Link href={`/orders/${order.id}`} className="text-sm text-gray-500 hover:text-gray-700">
                  العودة إلى تفاصيل الطلب
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Fallback if order is null after loading and no error
  return null;
}