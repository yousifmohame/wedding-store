// src/app/supplier/orders/page.jsx
"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc,getDoc , updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export default function SupplierOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSupplier, setIsSupplier] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login?redirect=/supplier/orders");
        return;
      }

      setLoggedInUserId(user.uid);

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setIsSupplier(userData.userType === "supplier");
          setIsApproved(userData.approved === true);

          if (userData.userType !== "supplier" || !userData.approved) {
            router.push("/");
            return;
          }

          // جلب جميع الطلبات وتصفيتها بناءً على supplierId الموجود في items
          const querySnapshot = await getDocs(collection(db, "orders"));
          const allOrdersData = [];
          querySnapshot.forEach((doc) => {
            allOrdersData.push({
              id: doc.id,
              ...doc.data(),
              createdAt: formatFirestoreDate(doc.data().createdAt),
            });
          });

          const supplierOrders = allOrdersData.filter((order) =>
            order.items && order.items.some((item) => item.supplierId === user.uid)
          );

          setOrders(supplierOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("حدث خطأ أثناء جلب الطلبات");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const formatFirestoreDate = (timestamp) => {
    if (!timestamp) return 'غير معروف';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString('ar-EG');
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleString('ar-EG');
      }
      return timestamp;
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'غير معروف';
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // تحديث الحالة المحلية
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (error) {
      console.error("Error updating order status:", error);
      setError("حدث خطأ أثناء تحديث حالة الطلب");
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-yellow-900",
      paymentcompleted: "bg-green-100 text-green-900",
      cancelled: "bg-red-100 text-red-800",
      rejected: "bg-red-100 text-red-800"
    };

    const statusText = {
      pending: "قيد الانتظار",
      processing: "قيد المعالجة",
      completed: "بانتظار الدفع",
      paymentcompleted:"مكتمل الدفع" ,
      cancelled: "ملغي",
      rejected: "مرفوض"
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status] || "bg-gray-100 text-gray-800"}`}>
        {statusText[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (!isSupplier || !isApproved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">غير مصرح لك بالوصول إلى هذه الصفحة</h1>
        <Link href="/" className="text-[#D4AF37] hover:text-[#B8860B]">
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div>
    <NavBar />
    <div dir="rtl" className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">الطلبات الواردة</h1>
          <Link
            href="/supplier/dashboard"
            className="bg-[#D4AF37] hover:bg-[#B8860B] text-white px-4 py-2 rounded-lg"
          >
            لوحة التحكم
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Image
              src="/images/no-orders.png"
              alt="لا توجد طلبات"
              width={200}
              height={200}
              className="mx-auto mb-4"
            />
            <p className="text-gray-900 mb-4">لا توجد طلبات متاحة حالياً</p>
            <Link
              href="/services"
              className="bg-[#D4AF37] hover:bg-[#B8860B] text-white px-6 py-2 rounded-lg inline-block"
            >
              تصفح الخدمات
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-100 p-4 font-medium text-gray-800">
              <div className="col-span-2">رقم الطلب</div>
              <div className="col-span-2">العميل</div>
              <div className="col-span-2">التاريخ</div>
              <div className="col-span-2">المبلغ</div>
              <div className="col-span-2">الحالة</div>
              <div className="col-span-2">الإجراءات</div>
            </div>

            {orders.map((order) => (
              <div key={order.id} className="grid grid-cols-12 p-4 border-b items-center">
                <div className="col-span-2 font-medium text-black">#{order.id.slice(0, 8)}</div>
                <div className="col-span-2 text-black">
                  {order.customerName || "غير معروف"}
                </div>
                <div className="col-span-2 text-sm text-gray-500">
                  {order.createdAt}
                </div>
                <div className="col-span-2 font-bold text-black">
                  {order.totalAmount} د.إ
                </div>
                <div className="col-span-2">
                  {getStatusBadge(order.status)}
                </div>
                <div className="col-span-2 space-x-2">
                  <Link
                    href={`/supplier/orders/${order.id}`}
                    className="text-[#D4AF37] hover:text-[#B8860B] text-sm"
                  >
                    التفاصيل
                  </Link>
                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'processing')}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        قبول
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'rejected')}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        رفض
                      </button>
                    </>
                  )}
                  {order.status === 'processing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      إكمال
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    <Footer />
    </div>
  );
}