// src/app/orders/page.jsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; // Adjust path if needed
import { onAuthStateChanged } from "firebase/auth";
import NavBar from '@/components/NavBar'; // Adjust path if needed
import Footer from '@/components/Footer'; // Adjust path if needed

// --- Re-use Helper Functions (or import from a shared utils file) ---
const formatOrderDate = (timestamp) => {
    if (!timestamp) return 'غير متاح';
    try {
        if (timestamp && typeof timestamp.toDate === 'function') {
            return timestamp.toDate().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
        }
         if (typeof timestamp === 'string') { // Handle ISO strings as well
            const date = new Date(timestamp);
            if (!isNaN(date)) {
                 return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
            }
        }
        return 'تاريخ غير صالح';
    } catch (error) {
        console.error("Error formatting date:", error);
        return 'خطأ';
    }
};

const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return 'N/A';
    return `${amount.toFixed(2)} ر.س`;
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
        case 'completed':
            return <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-green-300">مكتمل</span>;
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
// --- End Helper Functions ---


export default function OrdersListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  // Effect to get the current user ID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        // If user logs out, redirect to login
        router.push("/login?redirect=/orders");
      }
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  // Effect to fetch orders when userId is available
  useEffect(() => {
    const fetchOrders = async () => {
      if (!userId) {
          setLoading(false); // Not loading if no user ID
          return; // Don't fetch if user is not logged in
      }

      setLoading(true);
      setError(null); // Reset error on new fetch
      setOrders([]); // Clear previous orders

      try {
        // Construct the query
        const ordersRef = collection(db, "orders");
        const q = query(
          ordersRef,
          where("userId", "==", userId), // Filter by the logged-in user's ID
          orderBy("createdAt", "desc") // Order by creation date, newest first
        );

        // Execute the query
        const querySnapshot = await getDocs(q);

        // Process the results
        const fetchedOrders = [];
        querySnapshot.forEach((doc) => {
          fetchedOrders.push({
            id: doc.id, // Add the document ID
            ...doc.data(),
          });
        });

        setOrders(fetchedOrders);

      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("حدث خطأ أثناء جلب قائمة الطلبات.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId]); // Re-run effect when userId changes

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

  // --- Render Error State ---
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <main className="flex-grow flex flex-col items-center justify-center text-center px-4 py-10">
          <h1 className="text-xl font-bold text-red-600 mb-4">
             {error}
          </h1>
          {/* Optional: Button to retry */}
        </main>
        <Footer />
      </div>
    );
  }

  // --- Render Orders List or No Orders Message ---
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main dir="rtl" className="flex-grow bg-gray-100 py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">طلباتي</h1>

          {orders.length === 0 ? (
            // --- No Orders View ---
            <div className="text-center bg-white p-10 rounded-lg shadow">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                 <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="mt-2 text-xl font-medium text-gray-900">لا توجد طلبات حتى الآن</h2>
              <p className="mt-1 text-sm text-gray-500">لم تقم بإجراء أي طلبات بعد.</p>
              <div className="mt-6">
                <Link
                  href="/services"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#D4AF37] hover:bg-[#B8860B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37]"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/> </svg>
                  ابدأ التسوق
                </Link>
              </div>
            </div>
          ) : (
            // --- Orders List View ---
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ul role="list" className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/orders/${order.id}`} className="block hover:bg-gray-50 transition duration-150 ease-in-out">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-sm font-semibold text-[#D4AF37] truncate">
                            طلب #{order.id.substring(0, 8)}...
                          </p>
                          <div className="flex-shrink-0 flex">
                             {getStatusBadge(order.status)}
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex gap-4 text-sm text-gray-600">
                             {/* Item Summary (e.g., first item name) */}
                            <p className="flex items-center">
                               <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"> <path fillRule="evenodd" d="M5.293 2.293a1 1 0 011.414 0l8 8a1 1 0 010 1.414l-8 8a1 1 0 01-1.414-1.414L12.586 11H3a1 1 0 110-2h9.586L5.293 3.707a1 1 0 010-1.414z" clipRule="evenodd" /> </svg>
                               {order.items && order.items.length > 0 ? order.items[0].name : 'خدمة'}
                               {order.items && order.items.length > 1 && ` + ${order.items.length - 1} أخرى`}
                            </p>
                            <p className="mt-2 flex items-center sm:mt-0">
                              <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"> <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/> </svg>
                               الإجمالي: {formatCurrency(order.totalAmount)}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"> <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/> </svg>
                            <p>
                              تاريخ الطلب: <time dateTime={order.createdAt?.toDate ? order.createdAt.toDate().toISOString() : ''}>{formatOrderDate(order.createdAt)}</time>
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}