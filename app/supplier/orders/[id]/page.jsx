"use client";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import axios from "axios";

export default function OrderDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSupplier, setIsSupplier] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setIsSupplier(userData.userType === "supplier");

          if (userData.userType !== "supplier") {
            router.push("/");
            return;
          }

          // Fetch order details
          const orderRef = doc(db, "orders", id);
          const orderSnap = await getDoc(orderRef);

          if (!orderSnap.exists()) {
            setError("الطلب غير موجود");
            setLoading(false);
            return;
          }

          const orderData = orderSnap.data();

          // Check if any item in order.items has matching supplierId
          const isAuthorized = orderData.items && orderData.items.some(item => item.supplierId === user.uid);

          if (!isAuthorized) {
            setError("غير مصرح لك بمشاهدة هذا الطلب");
            setLoading(false);
            return;
          }

          setOrder({
            id: orderSnap.id,
            ...orderData,
            createdAt: formatFirestoreDate(orderData.createdAt),
            updatedAt: orderData.updatedAt ? formatFirestoreDate(orderData.updatedAt) : 'غير معروف',
            // Format event date if exists
            eventDate: orderData.eventDetails?.date ? formatDate(orderData.eventDetails.date) : 'غير محدد',
            eventTime: getTimeSlotDisplay(orderData.eventDetails?.time)
          });
        }
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("حدث خطأ أثناء جلب بيانات الطلب");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [id, router]);

  // Format Firestore timestamp
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

  // Format event date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting event date:", error);
      return dateString;
    }
  };

  // Get display text for time slot
  const getTimeSlotDisplay = (timeSlot) => {
    if (!timeSlot) return 'غير محدد';
    
    const timeSlots = {
      morning: 'الصباح (9 ص - 12 م)',
      afternoon: 'بعد الظهر (12 م - 4 م)',
      evening: 'المساء (4 م - 8 م)',
      night: 'الليل (8 م - 12 ص)'
    };
    
    return timeSlots[timeSlot] || timeSlot;
  };

  // Get display text for event type
  const getEventTypeDisplay = (type) => {
    if (!type) return 'غير محدد';
    
    const eventTypes = {
      birthday: 'حفلة عيد ميلاد',
      wedding: 'حفل زفاف',
      graduation: 'حفل تخرج',
      corporate: 'مناسبة شركة',
      family: 'مناسبة عائلية',
      other: 'أخرى'
    };
    
    return eventTypes[type] || type;
  };

  const updateOrderStatus = async (newStatus) => {
    try {
      const orderRef = doc(db, "orders", id);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      if (newStatus === 'completed') {
        try {
          await axios.post('/api/notify-customer-approval', {
            orderId: id
          });
        } catch (emailError) {
          console.error("Failed to send customer notification:", emailError);
          // Continue even if email fails
        }
      }
      
      setOrder(prev => ({
        ...prev,
        status: newStatus,
        updatedAt: new Date().toLocaleString('ar-EG')
      }));
    } catch (error) {
      console.error("Error updating order status:", error);
      setError("حدث خطأ أثناء تحديث حالة الطلب");
    }
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
        <Link href="/supplier/orders" className="text-[#D4AF37] hover:text-[#B8860B]">
          العودة إلى قائمة الطلبات
        </Link>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div>
    <NavBar />
    <div dir="rtl" className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">تفاصيل الطلب #{order.id.slice(0, 8)}</h1>
          <Link 
            href="/supplier/orders" 
            className="bg-[#D4AF37] hover:bg-[#B8860B] text-white px-4 py-2 rounded-lg"
          >
            رجوع
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-black">الخدمات المطلوبة</h2>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex border-b pb-4">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 mr-4">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        لا توجد صورة
                      </div>
                    )}
                  </div>
                  <div className="flex-1 mr-6">
                    <h3 className="font-medium text-black">{item.name}</h3>
                    {item.packageName && (
                      <p className="text-sm text-gray-800">الباقة: {item.packageName}</p>
                    )}
                    <p className="text-[#D4AF37] font-bold">{item.price} د.إ</p>
                    <div className="flex justify-between text-sm text-gray-800">
                      <span>الكمية: {item.quantity || 1}</span>
                      <span>عدد الأفراد: {item.personCount || 1}</span>
                      {item.taxRate > 0 && (
                        <span>ضريبة {item.taxRate}%: {(item.price * item.taxRate / 100).toFixed(2)} د.إ</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Order Summary */}
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between py-1">
                  <span className="text-gray-900">المجموع الجزئي:</span>
                  <span className="font-medium text-black">{order.subTotal?.toFixed(2) || order.totalAmount} د.إ</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">الضريبة:</span>
                    <span className="font-medium">{order.tax?.toFixed(2)} د.إ</span>
                  </div>
                )}
                <div className="flex justify-between py-1 font-bold text-lg">
                  <span className="text-black">الإجمالي:</span>
                  <span className="text-[#D4AF37]">{order.totalAmount?.toFixed(2)} د.إ</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Order Status Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 text-black">حالة الطلب</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">الحالة:</span>
                  <span className={`font-medium ${
                    order.status === 'completed' ? 'text-green-600' :
                    order.status === 'cancelled' || order.status === 'rejected' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {order.status === 'pending' && 'قيد الانتظار'}
                    {order.status === 'processing' && 'قيد المعالجة'}
                    {order.status === 'completed' && 'مكتمل'}
                    {order.status === 'cancelled' && 'ملغي'}
                    {order.status === 'rejected' && 'مرفوض'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-900">تاريخ الطلب:</span>
                  <span className="text-black">{order.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-900">آخر تحديث:</span>
                  <span className="text-black">{order.updatedAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-900">طريقة الدفع:</span>
                  <span className="text-black">
                    {order.paymentMethod === 'credit' && 'بطاقة ائتمان'}
                    {order.paymentMethod === 'bank' && 'تحويل بنكي'}
                    {order.paymentMethod === 'cash' && 'نقدًا عند الاستلام'}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Details Card */}
            {order.eventDetails && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4 text-black">تفاصيل المناسبة</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">نوع المناسبة:</span>
                    <span className="text-black">{getEventTypeDisplay(order.eventDetails.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">التاريخ:</span>
                    <span className="text-black">{order.eventDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">الوقت:</span>
                    <span className="text-black">{order.eventTime}</span>
                  </div>
                  {order.eventDetails.notes && (
                    <div className="pt-3 border-t">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">ملاحظات إضافية:</h4>
                      <p className="text-sm text-black">{order.eventDetails.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Customer Info Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 text-black">معلومات العميل</h2>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-black">{order.customerInfo?.name || order.customerName}</p>
                  <p className="text-gray-600">{order.customerInfo?.email || order.customerEmail}</p>
                </div>
                {order.customerInfo?.phone && (
                  <div>
                    <p className="text-gray-600">هاتف: {order.customerInfo.phone}</p>
                  </div>
                )}
                {order.customerInfo?.address && (
                  <div>
                    <p className="text-gray-600">العنوان: {order.customerInfo.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {order.status === 'pending' && (
              <div className="flex space-x-2 space-x-reverse">
                <button
                  onClick={() => updateOrderStatus('processing')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
                >
                  قبول الطلب
                </button>
                <button
                  onClick={() => updateOrderStatus('rejected')}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
                >
                  رفض الطلب
                </button>
              </div>
            )}

            {order.status === 'processing' && (
              <button
                onClick={() => updateOrderStatus('completed')}
                className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-white py-2 rounded-lg"
              >
                تم الانتهاء
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    <Footer />
    </div>
  );
}