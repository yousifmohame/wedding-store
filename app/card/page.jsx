"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      if (!user) {
        router.push("/login?redirect=/cart");
        return;
      }
      fetchCartItems(user.uid);
    });
    return () => unsubscribe();
  }, [router]);

  const fetchCartItems = async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const itemsWithTax = (userData.cart || []).map(item => ({
          ...item,
          taxRate: item.taxRate || 0,
          serviceTax: item.serviceTax || 0,
          personCount: item.personCount || 1
        }));
        setCartItems(itemsWithTax);
      } else {
        setCartItems([]);
      }
    } catch (err) {
      console.error("Error fetching cart items:", err);
      setError("حدث خطأ أثناء جلب عناصر السلة");
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemToRemove) => {
    if (!isLoggedIn || updating) return;

    setUpdating(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated.");

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        cart: arrayRemove(itemToRemove)
      });

      setCartItems(prevItems => 
        prevItems.filter(item => 
          item.serviceId !== itemToRemove.serviceId || 
          (item.packageName !== itemToRemove.packageName)
        )
      );
    } catch (error) {
      console.error("Error removing item:", error);
      setError("حدث خطأ أثناء إزالة العنصر من السلة");
    } finally {
      setUpdating(false);
    }
  };

  const formatAED = (amount) => {
    return new Intl.NumberFormat('ar-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const itemPrice = item.totalPrice || item.price || 0;
      return total + Number(itemPrice);
    }, 0);
  };

  const calculateTotalVAT = () => {
    return cartItems.reduce((total, item) => {
      const itemPrice = item.totalPrice || item.price || 0;
      const itemTaxRate = Number(item.taxRate) || 0;
      return total + (itemPrice * itemTaxRate / 100);
    }, 0);
  };

  const calculateTotalServiceTax = () => {
    return cartItems.reduce((total, item) => {
      const itemPrice = item.totalPrice || item.price || 0;
      const itemServiceTax = Number(item.serviceTax) || 0;
      return total + (itemPrice * itemServiceTax / 100);
    }, 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateTotalVAT() + calculateTotalServiceTax();
  };

  const handleCheckout = () => {
    if (cartItems.length === 0 || !isLoggedIn) return;

    const checkoutData = {
      items: cartItems,
      subtotal: calculateSubtotal(),
      vat: calculateTotalVAT(),
      serviceTax: calculateTotalServiceTax(),
      total: calculateGrandTotal(),
      currency: 'AED'
    };

    try {
      sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
      router.push("/checkout");
    } catch (err) {
      console.error("Error storing checkout data or navigating:", err);
      setError("حدث خطأ أثناء الانتقال إلى صفحة الدفع.");
    }
  };

  if (loading && !isLoggedIn) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-4">
          <p>يجب تسجيل الدخول لعرض السلة.</p>
          <Link href="/login?redirect=/cart" className="text-[#D4AF37] hover:underline mt-2 inline-block">
            الذهاب إلى صفحة تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavBar />
      <div dir="rtl" className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">سلة التسوق</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
              {error}
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-600 mb-4 text-lg">سلة التسوق فارغة حالياً</p>
              <Link
                href="/services"
                className="bg-[#D4AF37] hover:bg-[#B8860B] text-white px-6 py-2 rounded-lg inline-block transition duration-200"
              >
                تصفح الخدمات
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4 text-black border-b pb-3">
                    عناصر السلة ({cartItems.length})
                  </h2>
                  <div className="space-y-5">
                    {cartItems.map((item, index) => {
                      const itemPrice = item.totalPrice || item.price || 0;
                      const vatAmount = itemPrice * (item.taxRate || 0) / 100;
                      const serviceTaxAmount = itemPrice * (item.serviceTax || 0) / 100;
                      const totalTax = vatAmount + serviceTaxAmount;

                      return (
                        <div key={`${item.serviceId}-${index}`} className="flex flex-col sm:flex-row gap-4 border-b pb-5 last:border-b-0">
                          <div className="relative w-full sm:w-28 h-28 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name || 'Service Image'}
                                fill
                                sizes="(max-width: 640px) 100vw, 112px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                                لا توجد صورة
                              </div>
                            )}
                          </div>
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-gray-800">
                                {item.name || 'اسم الخدمة غير متوفر'}
                                {item.packageName && (
                                  <span className="block text-sm text-gray-500 mt-1">
                                    الباقة: {item.packageName}
                                  </span>
                                )}
                              </h3>
                              {item.personCount > 1 && (
                                <p className="text-sm text-gray-600 mt-1">
                                  عدد الأشخاص: {item.personCount}
                                </p>
                              )}
                              <p className="text-sm text-gray-500 mt-1">
                                {item.addedAt ? `أضيف بتاريخ: ${new Date(item.addedAt.seconds * 1000).toLocaleDateString('ar-EG')}` : ''}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#D4AF37] font-bold my-2 text-lg">
                                {formatAED(itemPrice)}
                              </p>
                              {(item.taxRate > 0 || item.serviceTax > 0) && (
                                <div className="text-sm text-gray-600 space-y-1">
                                  {item.taxRate > 0 && (
                                    <p>ضريبة القيمة المضافة {item.taxRate}%: {formatAED(vatAmount)}</p>
                                  )}
                                  {item.serviceTax > 0 && (
                                    <p>رسوم الخدمة {item.serviceTax}%: {formatAED(serviceTaxAmount)}</p>
                                  )}
                                  <p className="font-medium">إجمالي الضرائب: {formatAED(totalTax)}</p>
                                </div>
                              )}
                              {item.pricePerPerson && item.personCount > 1 && (
                                <p className="text-xs text-gray-500">
                                  {formatAED(item.pricePerPerson)} للشخص × {item.personCount} أشخاص
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="self-start sm:self-center mt-2 sm:mt-0">
                            <button
                              onClick={() => handleRemoveItem(item)}
                              disabled={updating}
                              className={`text-red-600 hover:text-red-800 text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ${updating ? 'animate-pulse' : ''}`}
                              aria-label={`إزالة ${item.name || 'العنصر'}`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>إزالة</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                  <h2 className="text-xl font-semibold mb-4 border-b pb-3 text-black">ملخص الطلب</h2>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-gray-600">
                      <span>عدد العناصر</span>
                      <span>{cartItems.length}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>المجموع الجزئي</span>
                      <span>{formatAED(calculateSubtotal())}</span>
                    </div>
                    
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">تفاصيل الضرائب:</h4>
                      
                      {/* VAT Summary */}
                      {calculateTotalVAT() > 0 && (
                        <div className="flex justify-between text-gray-600 text-sm mb-1">
                          <span>ضريبة القيمة المضافة</span>
                          <span>{formatAED(calculateTotalVAT())}</span>
                        </div>
                      )}
                      
                      {/* Service Tax Summary */}
                      {calculateTotalServiceTax() > 0 && (
                        <div className="flex justify-between text-gray-600 text-sm mb-1">
                          <span>رسوم الخدمة</span>
                          <span>{formatAED(calculateTotalServiceTax())}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-gray-600 font-medium">
                        <span>إجمالي الضرائب</span>
                        <span>{formatAED(calculateTotalVAT() + calculateTotalServiceTax())}</span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between font-bold text-lg text-gray-800">
                        <span>الإجمالي</span>
                        <span className="text-[#D4AF37]">{formatAED(calculateGrandTotal())}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={cartItems.length === 0 || updating}
                    className={`w-full py-3 px-6 rounded-lg font-medium text-white transition duration-200 ${
                      cartItems.length === 0 || updating
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-[#D4AF37] hover:bg-[#B8860B]"
                    }`}
                  >
                    {updating ? 'جاري التحديث...' : 'إتمام الشراء'}
                  </button>

                  <p className="text-xs text-gray-500 mt-4 text-center">
                    بالضغط على "إتمام الشراء" أنت توافق على <Link href="/terms" className="underline hover:text-[#D4AF37]">شروط وأحكام</Link> الموقع.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}