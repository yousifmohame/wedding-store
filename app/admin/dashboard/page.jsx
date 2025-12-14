"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc , getDoc, updateDoc, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";

// Icons
const UserIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ServiceIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const OrderIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const RevenueIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MessageIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
);

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    users: 0,
    providers: 0,
    pendingProviders: 0,
    orders: 0,
    revenue: 0,
  });
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    completedRevenue: 0,
    averageOrderValue: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentProviders, setRecentProviders] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [messages, setMessages] = useState([]);
const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.role !== "admin") {
              router.push("/");
              return;
            }
            setIsAdmin(true);
            await fetchStats();
            await fetchOrderStats();
            fetchRecentUsers();
            fetchRecentProviders();
            fetchServiceCategories();
          } else {
            router.push("/");
          }
        } catch (error) {
          console.error("Error verifying admin status:", error);
          router.push("/");
        }
      } else {
        router.push("/login?redirect=/admin/dashboard");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (activeTab === "orders") {
      fetchCompletedOrders();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "messages") {
      fetchMessages();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      // Get total users
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      
      // Get providers
      const providersQuery = query(collection(db, "providers"));
      const providersSnapshot = await getDocs(providersQuery);
      
      // Get pending providers
      const pendingProvidersQuery = query(
        collection(db, "users"),
        where("userType", "==", "supplier"),
        where("approved", "==", false)
      );
      const pendingProvidersSnapshot = await getDocs(pendingProvidersQuery);
      
      setStats({
        users: usersSnapshot.size,
        providers: providersSnapshot.size,
        pendingProviders: pendingProvidersSnapshot.size,
        orders: orderStats.totalOrders,
        revenue: orderStats.completedRevenue
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchOrderStats = async () => {
    try {
      const ordersRef = collection(db, "orders");
      
      const [
        allOrdersSnapshot,
        completedOrdersSnapshot,
        pendingOrdersSnapshot,
        cancelledOrdersSnapshot
      ] = await Promise.all([
        getDocs(query(ordersRef)),
        getDocs(query(ordersRef, where("status", "==", "paymentcompleted"))),
        getDocs(query(ordersRef, where("status", "==", "pending"))),
        getDocs(query(ordersRef, where("status", "==", "rejected")))
      ]);

      let completedRevenue = 0;
      completedOrdersSnapshot.forEach(doc => {
        completedRevenue += doc.data().totalAmount || 0;
      });

      const averageOrderValue = completedOrdersSnapshot.size > 0 
        ? completedRevenue / completedOrdersSnapshot.size 
        : 0;

      setOrderStats({
        totalOrders: allOrdersSnapshot.size,
        completedOrders: completedOrdersSnapshot.size,
        pendingOrders: pendingOrdersSnapshot.size,
        cancelledOrders: cancelledOrdersSnapshot.size,
        completedRevenue: completedRevenue,
        averageOrderValue: averageOrderValue
      });

      // Update stats with order data
      setStats(prev => ({
        ...prev,
        orders: allOrdersSnapshot.size,
        revenue: completedRevenue
      }));
    } catch (error) {
      console.error("Error fetching order stats:", error);
    }
  };

  const fetchCompletedOrders = async () => {
    try {
      const ordersRef = collection(db, "orders");
      const querySnapshot = await getDocs(query(ordersRef, where("status", "==", "completed")));
      const orders = await Promise.all(querySnapshot.docs.map(async (orderDoc) => { // Renamed `doc` to `orderDoc`
        const orderData = orderDoc.data();
        // Fetch customer data
        let customerName = "";
        let customerPhotoURL = "";
        if (orderData.userId) {
          const userDoc = await getDoc(doc(db, "users", orderData.userId)); // Now `doc` refers to the imported function
          if (userDoc.exists()) {
            const userData = userDoc.data();
            customerName = userData.displayName;
            customerPhotoURL = userData.photoURL;
          }
        }
        // Fetch provider data
        let providerName = "";
        let providerImageUrl = "";
        if (orderData.providerId) {
          const providerDoc = await getDoc(doc(db, "providers", orderData.providerId));
          if (providerDoc.exists()) {
            const providerData = providerDoc.data();
            providerName = providerData.name;
            providerImageUrl = providerData.imageUrl;
          }
        }
        return {
          id: orderDoc.id,
          ...orderData,
          customerName,
          customerPhotoURL,
          providerName,
          providerImageUrl
        };
      }));
      setCompletedOrders(orders);
    } catch (error) {
      console.error("Error fetching completed orders:", error);
    }
  };

  const fetchRecentUsers = async () => {
    try {
      const usersQuery = query(
        collection(db, "users"),
        where("userType", "==", "customer")
      );
      const snapshot = await getDocs(usersQuery);
      const users = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
        .slice(0, 5);
      setRecentUsers(users);
    } catch (error) {
      console.error("Error fetching recent users:", error);
    }
  };

  const fetchRecentProviders = async () => {
    try {
      const snapshot = await getDocs(collection(db, "providers"));
      const providers = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
        .slice(0, 5);
      setRecentProviders(providers);
    } catch (error) {
      console.error("Error fetching recent providers:", error);
    }
  };

  // Add this function to fetch messages
const fetchMessages = async () => {
  try {
    const messagesQuery = query(collection(db, "contactMessages"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(messagesQuery);
    const messagesData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
    
    setMessages(messagesData);
    setUnreadCount(messagesData.filter(msg => msg.status === "unread").length);
  } catch (error) {
    console.error("Error fetching messages:", error);
  }
};

// Add this function to mark message as read
const markAsRead = async (messageId) => {
  try {
    await updateDoc(doc(db, "contactMessages", messageId), {
      status: "read"
    });
    fetchMessages();
  } catch (error) {
    console.error("Error marking message as read:", error);
  }
};

  const fetchServiceCategories = async () => {
    try {
      const categoriesQuery = query(collection(db, "serviceCategories"));
      const snapshot = await getDocs(categoriesQuery);
      const categories = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setServiceCategories(categories);
    } catch (error) {
      console.error("Error fetching service categories:", error);
    }
  };

  const approveProvider = async (userId) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        approved: true,
      });
      fetchStats();
      fetchRecentUsers();
      alert("تمت الموافقة على مزود الخدمة بنجاح");
    } catch (error) {
      console.error("Error approving provider:", error);
      alert("حدث خطأ أثناء الموافقة على مزود الخدمة");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-4">
          <h1 className="text-2xl font-bold text-gray-800">غير مصرح بالوصول</h1>
          <p className="text-gray-600 mt-2">ليس لديك صلاحيات الدخول إلى لوحة التحكم</p>
          <Link href="/" className="text-[#D4AF37] hover:underline mt-4 inline-block">
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavBar />
      <div dir="rtl" className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-white rounded-lg shadow-md p-4 h-fit sticky top-4">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-3">لوحة التحكم</h2>
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`w-full text-right px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeTab === "dashboard" ? "bg-[#D4AF37] text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  الإحصائيات
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className={`w-full text-right px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeTab === "users" ? "bg-[#D4AF37] text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <UserIcon />
                  العملاء
                </button>
                <button
                  onClick={() => setActiveTab("messages")}
                  className={`w-full text-right px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeTab === "messages" ? "bg-[#D4AF37] text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <MessageIcon />
                  الرسائل
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <Link
                  href={"/admin/suppliers"}
                  className={`w-full text-right px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeTab === "providers" ? "bg-[#D4AF37] text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <ServiceIcon />
                  مزودو الخدمة
                </Link>
                <button
                  onClick={() => setActiveTab("providers")}
                  className={`w-full text-right px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeTab === "providers" ? "bg-[#D4AF37] text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <ServiceIcon />
                  الخدمات
                </button>
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`w-full text-right px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeTab === "orders" ? "bg-[#D4AF37] text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <OrderIcon />
                  الطلبات
                </button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {activeTab === "dashboard" && (
                <>
                  <h1 className="text-2xl font-bold text-gray-800 mb-6">لوحة التحكم الإدارية</h1>
                  
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500">إجمالي المستخدمين</p>
                          <h3 className="text-2xl font-bold text-gray-800">{stats.users}</h3>
                        </div>
                        <div className="bg-[#F5E8C7] p-3 text-black rounded-full">
                          <UserIcon />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500">عدد الخدمات</p>
                          <h3 className="text-2xl font-bold text-gray-800">{stats.providers}</h3>
                        </div>
                        <div className="bg-[#F5E8C7] text-black p-3 rounded-full">
                          <ServiceIcon />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500">الطلبات المكتملة</p>
                          <h3 className="text-2xl font-bold text-gray-800">{orderStats.completedOrders}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            من أصل {orderStats.totalOrders} طلب
                          </p>
                        </div>
                        <div className="bg-[#F5E8C7] text-black p-3 rounded-full">
                          <OrderIcon />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500">إيرادات المكتملة</p>
                          <h3 className="text-2xl font-bold text-gray-800">
                            {orderStats.completedRevenue.toFixed(2)} د.إ
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {orderStats.completedOrders > 0 ? (
                              `متوسط الطلب: ${orderStats.averageOrderValue.toFixed(2)} ر.س`
                            ) : 'لا توجد طلبات مكتملة'}
                          </p>
                        </div>
                        <div className="bg-[#F5E8C7] text-black p-3 rounded-full">
                          <RevenueIcon />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Status Summary */}
                  <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">حالة الطلبات</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-blue-600">طلبات قيد الانتظار</h3>
                        <p className="text-2xl font-bold mt-2 text-black">{orderStats.pendingOrders}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {orderStats.totalOrders > 0 ? (
                            `${((orderStats.pendingOrders / orderStats.totalOrders) * 100).toFixed(1)}% من إجمالي الطلبات`
                          ) : '0%'}
                        </p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-green-600">طلبات مكتملة</h3>
                        <p className="text-2xl font-bold mt-2 text-black">{orderStats.completedOrders}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {orderStats.totalOrders > 0 ? (
                            `${((orderStats.completedOrders / orderStats.totalOrders) * 100).toFixed(1)}% من إجمالي الطلبات`
                          ) : '0%'}
                        </p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-red-600">طلبات ملغاة</h3>
                        <p className="text-2xl font-bold mt-2 text-black">{orderStats.cancelledOrders}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {orderStats.totalOrders > 0 ? (
                            `${((orderStats.cancelledOrders / orderStats.totalOrders) * 100).toFixed(1)}% من إجمالي الطلبات`
                          ) : '0%'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Users */}
                  <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-800">أحدث العملاء</h2>
                      <button
                        onClick={() => setActiveTab("users")}
                        className="text-[#D4AF37] hover:underline text-sm"
                      >
                        عرض الكل
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">البريد الإلكتروني</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">النوع</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {recentUsers.map((user) => (
                            <tr key={user.id}>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    {user.photoURL ? (
                                      <Image
                                        src={user.photoURL}
                                        alt={user.displayName || "User"}
                                        width={40}
                                        height={40}
                                        className="rounded-full"
                                      />
                                    ) : (
                                      <UserIcon className="text-gray-400" />
                                    )}
                                  </div>
                                  <div className="mr-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {user.displayName || "بدون اسم"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  user.userType === "supplier" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                                }`}>
                                  {user.userType === "supplier" ? "مزود خدمة" : "عميل"}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString("ar-EG") : "غير معروف"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recent Providers */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-800">أحدث الخدمات</h2>
                      <button
                        onClick={() => setActiveTab("providers")}
                        className="text-[#D4AF37] hover:underline text-sm"
                      >
                        عرض الكل
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التصنيف</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السعر</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التقييم</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {recentProviders.map((provider) => (
                            <tr key={provider.id}>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                                    {provider.imageUrl ? (
                                      <Image
                                        src={provider.imageUrl}
                                        alt={provider.name}
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                      />
                                    ) : (
                                      <ServiceIcon className="text-gray-400" />
                                    )}
                                  </div>
                                  <div className="mr-4">
                                    <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                                    <div className="text-sm text-gray-500">{provider.description?.substring(0, 30)}...</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {serviceCategories.find((cat) => cat.id === provider.categoryId)?.title || "غير معروف"}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {provider.startingPrice?.toFixed(2) || "0.00"} ر.س
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex text-[#D4AF37]">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <svg key={star} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    ))}
                                  </div>
                                  <span className="text-gray-500 text-xs mr-1">({provider.ratingCount || 0})</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "messages" && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h1 className="text-2xl font-bold text-gray-800 mb-6">رسائل العملاء</h1>
                  
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">لا توجد رسائل</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div 
                          key={message.id} 
                          className={`border rounded-lg p-4 ${message.status === "unread" ? "bg-blue-50 border-blue-200" : "bg-white"}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-lg text-black">{message.name}</h3>
                              <p className="text-gray-600">{message.email}</p>
                            </div>
                            <span className="text-sm text-gray-500">
                              {message.createdAt.toLocaleDateString("ar-EG")}
                            </span>
                          </div>
                          <div className="mt-3 p-3 bg-gray-50 rounded">
                            <p className="text-gray-800">{message.message}</p>
                          </div>
                          {message.status === "unread" && (
                            <button
                              onClick={() => markAsRead(message.id)}
                              className="mt-2 text-sm text-[#D4AF37] hover:underline"
                            >
                              تمت القراءة
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )};

              {activeTab === "users" && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h1 className="text-2xl font-bold text-gray-800 mb-6">إدارة المستخدمين</h1>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">البريد الإلكتروني</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">النوع</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentUsers.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                  {user.photoURL ? (
                                    <Image
                                      src={user.photoURL}
                                      alt={user.displayName || "User"}
                                      width={40}
                                      height={40}
                                      className="rounded-full"
                                    />
                                  ) : (
                                    <UserIcon className="text-gray-400" />
                                  )}
                                </div>
                                <div className="mr-4">
                                  <div className="text-sm font-medium text-gray-900">{user.displayName || "بدون اسم"}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.userType === "supplier" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                              }`}>
                                {user.userType === "supplier" ? "مزود خدمة" : "عميل"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.approved ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  مفعل
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  قيد الانتظار
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.userType === "supplier" && !user.approved && (
                                <button
                                  onClick={() => approveProvider(user.id)}
                                  className="text-green-600 hover:text-green-800 mr-2"
                                >
                                  الموافقة
                                </button>
                              )}
                              <button className="text-red-600 hover:text-red-800">حذف</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "providers" && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h1 className="text-2xl font-bold text-gray-800 mb-6">إدارة مزودي الخدمة</h1>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التصنيف</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السعر</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التقييم</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentProviders.map((provider) => (
                          <tr key={provider.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                                  {provider.imageUrl ? (
                                    <Image
                                      src={provider.imageUrl}
                                      alt={provider.name}
                                      width={40}
                                      height={40}
                                      className="object-cover"
                                    />
                                  ) : (
                                    <ServiceIcon className="text-gray-400" />
                                  )}
                                </div>
                                <div className="mr-4">
                                  <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                                  <div className="text-sm text-gray-500">{provider.description?.substring(0, 30)}...</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {serviceCategories.find((cat) => cat.id === provider.categoryId)?.title || "غير معروف"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {provider.startingPrice?.toFixed(2) || "0.00"} ر.س
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex text-[#D4AF37]">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <svg
                                      key={star}
                                      className="w-4 h-4"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  ))}
                                </div>
                                <span className="text-gray-500 text-xs mr-1">({provider.ratingCount || 0})</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button className="text-blue-600 hover:text-blue-800 mr-2">تعديل</button>
                              <button className="text-red-600 hover:text-red-800">حذف</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "orders" && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h1 className="text-2xl font-bold text-gray-800 mb-6">الطلبات المكتملة</h1>
                  {completedOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <OrderIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">لا توجد طلبات مكتملة</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الطلب</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مزود الخدمة</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {completedOrders.map((order) => (
                            <tr key={order.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                #{order.id.substring(0, 8)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    {order.customerPhotoURL ? (
                                      <Image
                                        src={order.customerPhotoURL}
                                        alt={order.customerName}
                                        width={40}
                                        height={40}
                                        className="rounded-full"
                                      />
                                    ) : (
                                      <UserIcon className="text-gray-400" />
                                    )}
                                  </div>
                                  <div className="mr-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {order.customerName || "بدون اسم"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    {order.providerImageUrl ? (
                                      <Image
                                        src={order.providerImageUrl}
                                        alt={order.providerName}
                                        width={40}
                                        height={40}
                                        className="rounded-full"
                                      />
                                    ) : (
                                      <ServiceIcon className="text-gray-400" />
                                    )}
                                  </div>
                                  <div className="mr-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {order.name || "بدون اسم"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.totalAmount?.toFixed(2) || "0.00"} ر.س
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString("ar-EG") : "غير معروف"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  مكتمل
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}