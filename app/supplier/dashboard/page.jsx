"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";

export default function SupplierDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    completedRevenue: 0, // New stat for completed orders only
  });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login?redirect=/supplier/dashboard");
        return;
      }

      try {
        // Get user data
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          router.push("/");
          return;
        }

        const data = userSnap.data();
        setUserData(data);

        if (data.userType !== "supplier" || !data.approved) {
          router.push("/");
          return;
        }

        // Get all orders and filter on the client-side
        const ordersSnapshot = await getDocs(collection(db, "orders"));
        const allOrders = [];
        ordersSnapshot.forEach((doc) => {
          allOrders.push({
            id: doc.id,
            ...doc.data(),
            createdAt: formatFirestoreDate(doc.data().createdAt),
          });
        });

        // Filter orders where at least one item has the current supplier's ID
        const supplierOrders = allOrders.filter((order) =>
          order.items && order.items.some((item) => item.supplierId === user.uid)
        );

        let totalRevenue = 0;
        let pendingCount = 0;
        let completedCount = 0;
        let completedRevenue = 0;

        supplierOrders.forEach((order) => {
          // Calculate revenue from items belonging to this supplier in this order
          const orderRevenue = order.items
            .filter((item) => item.supplierId === user.uid)
            .reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

          totalRevenue += orderRevenue;

          if (order.status === "pending") pendingCount++;
          if (order.status === "paymentcompleted") {
            completedCount++;
            completedRevenue += orderRevenue;
          }
        });

        setStats({
          totalOrders: supplierOrders.length,
          pendingOrders: pendingCount,
          completedOrders: completedCount,
          totalRevenue,
          completedRevenue,
        });

        // Get 5 most recent COMPLETED orders for this supplier
        setRecentOrders(
          supplierOrders
            .filter(order => order.status === "paymentcompleted")
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
        );
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const formatFirestoreDate = (timestamp) => {
    if (!timestamp) return "";
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString("ar-EG");
      }
      return timestamp;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-AE', {
      style: 'currency',
      currency: 'AED'
    }).format(amount);
  };
  

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      paymentcompleted: "bg-green-100 text-green-900",
      cancelled: "bg-red-100 text-red-800",
    };

    const statusText = {
      pending: "قيد الانتظار",
      processing: "قيد المعالجة",
      completed: "مكتمل",
      paymentcompleted:"مكتمل الدفع",
      cancelled: "ملغي",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          statusClasses[status] || "bg-gray-100 text-gray-800"
        }`}
      >
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">{error}</h1>
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
          <h1 className="text-2xl font-bold text-gray-800">لوحة تحكم المورد</h1>
          <div className="flex items-center space-x-4 space-x-reverse">
            {userData?.businessLogo && (
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src={userData.businessLogo}
                  alt="Business Logo"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <span className="font-medium text-black">{userData?.businessName || "لوحة التحكم"}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Orders Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#D4AF37]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900">إجمالي الطلبات</p>
                <h3 className="text-2xl font-bold text-black">{stats.totalOrders}</h3>
              </div>
              <div className="text-[#D4AF37]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Pending Orders Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900">طلبات قيد الانتظار</p>
                <h3 className="text-2xl font-bold text-black">{stats.pendingOrders}</h3>
              </div>
              <div className="text-yellow-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Completed Orders Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900">طلبات مكتملة</p>
                <h3 className="text-2xl font-bold text-black">{stats.completedOrders}</h3>
              </div>
              <div className="text-green-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Completed Revenue Card - Highlighted */}
          <div className="bg-gradient-to-r from-[#D4AF37] to-[#F5E8C7] rounded-lg shadow-md p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-black text-opacity-90">إيرادات الطلبات المكتملة</p>
                <h3 className="text-2xl font-bold text-green-800">{formatCurrency(stats.completedRevenue)}</h3>
                <p className="text-sm mt-1 text-blue-800 text-opacity-80">
                  {stats.completedOrders > 0 ? (
                    `متوسط الطلب: ${formatCurrency(stats.completedRevenue / stats.completedOrders)}`
                  ) : 'لا توجد طلبات مكتملة'}
                </p>
              </div>
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Total Revenue Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-black">ملخص الإيرادات</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">إجمالي الإيرادات:</span>
                <span className="font-bold text-black">{formatCurrency(stats.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">من طلبات مكتملة:</span>
                <span className="font-bold text-green-600">{formatCurrency(stats.completedRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">من طلبات بانتظار الدفع:</span>
                <span className="font-bold text-yellow-600">
                  {formatCurrency(stats.totalRevenue - stats.completedRevenue)}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Completed Orders */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-black">أحدث الطلبات المكتملة</h2>
            {recentOrders.length === 0 ? (
              <div className="text-center py-4 text-gray-900">
                لا توجد طلبات مكتملة حديثًا
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => {
                  const orderRevenue = order.items
                    .filter(item => item.supplierId === auth.currentUser?.uid)
                    .reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

                  return (
                    <Link
                      key={order.id}
                      href={`/supplier/orders/${order.id}`}
                      className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-black">#{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-500">
                            {order.customerName || "عميل غير معروف"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {formatCurrency(orderRevenue)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.createdAt}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                <div className="pt-2 text-center">
                  <Link
                    href="/supplier/orders?status=paymentcompleted"
                    className="text-[#D4AF37] hover:text-[#B8860B] text-sm font-medium"
                  >
                    عرض جميع الطلبات المكتملة →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/services"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="bg-[#D4AF37] bg-opacity-10 p-3 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-[#D4AF37]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-black">إدارة الخدمات</h3>
                <p className="text-sm text-gray-500">إضافة أو تعديل الخدمات</p>
              </div>
            </div>
          </Link>

          <Link
            href="/account"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="bg-blue-100 bg-opacity-20 p-3 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-black">الملف الشخصي</h3>
                <p className="text-sm text-gray-500">تعديل معلومات المورد</p>
              </div>
            </div>
          </Link>

          <Link
            href="/supplier/orders"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="bg-green-100 bg-opacity-20 p-3 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-black">جميع الطلبات</h3>
                <p className="text-sm text-gray-500">عرض وتتبع جميع الطلبات</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
    <Footer />
    </div>
  );
}