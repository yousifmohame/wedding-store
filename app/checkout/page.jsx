"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";
import axios from "axios";

export default function CheckoutPage() {
    const router = useRouter();
    const [checkoutItems, setCheckoutItems] = useState([]);
    const [subTotal, setSubTotal] = useState(0);
    const [vatAmount, setVatAmount] = useState(0);
    const [serviceTaxAmount, setServiceTaxAmount] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
        paymentMethod: "credit",
        notes: "",
        eventDate: "",
        eventTime: "",
        eventType: "birthday"
    });

    // Format currency in AED
    const formatAED = (amount) => {
        return new Intl.NumberFormat('ar-AE', {
            style: 'currency',
            currency: 'AED',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Calculate totals with both taxes
    const calculateTotals = (items) => {
        const calculatedSubTotal = items.reduce((sum, item) => {
            const itemPrice = item.totalPrice || item.price || 0;
            return sum + Number(itemPrice);
        }, 0);
        
        // Calculate VAT and Service Tax separately
        const calculatedVAT = items.reduce((total, item) => {
            const itemPrice = item.totalPrice || item.price || 0;
            const itemVATRate = Number(item.taxRate) || 0;
            return total + (itemPrice * itemVATRate / 100);
        }, 0);
        
        const calculatedServiceTax = items.reduce((total, item) => {
            const itemPrice = item.totalPrice || item.price || 0;
            const itemServiceTaxRate = Number(item.serviceTax) || 0;
            return total + (itemPrice * itemServiceTaxRate / 100);
        }, 0);
        
        const calculatedTotal = calculatedSubTotal + calculatedVAT + calculatedServiceTax;
        
        return {
            subTotal: calculatedSubTotal,
            vat: calculatedVAT,
            serviceTax: calculatedServiceTax,
            total: calculatedTotal
        };
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsLoggedIn(true);
                setUserId(user.uid);
                setFormData(prev => ({
                    ...prev,
                    email: user.email || "",
                    name: user.displayName || "",
                }));
            } else {
                setIsLoggedIn(false);
                setUserId(null);
                router.push("/login?redirect=/cart");
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        const fetchCartData = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setCheckoutItems([]);
            setSubTotal(0);
            setVatAmount(0);
            setServiceTaxAmount(0);
            setTotalAmount(0);

            try {
                const userRef = doc(db, "users", userId);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const cartData = userSnap.data()?.cart || [];

                    if (cartData.length > 0) {
                        // Ensure each item has both tax rates
                        const itemsWithTax = cartData.map(item => ({
                            ...item,
                            taxRate: item.taxRate || 0,
                            serviceTax: item.serviceTax || 0,
                            price: item.totalPrice || item.price || 0
                        }));
                        
                        setCheckoutItems(itemsWithTax);
                        
                        // Calculate totals with both taxes
                        const { subTotal, vat, serviceTax, total } = calculateTotals(itemsWithTax);
                        setSubTotal(subTotal);
                        setVatAmount(vat);
                        setServiceTaxAmount(serviceTax);
                        setTotalAmount(total);
                    } else {
                        setError("سلة الشراء فارغة. لا يمكنك المتابعة.");
                        setTimeout(() => router.push('/cart'), 2000);
                    }
                } else {
                    setError("لم يتم العثور على بيانات المستخدم.");
                }
            } catch (err) {
                console.error("Error fetching cart data:", err);
                setError("حدث خطأ أثناء تحميل بيانات السلة.");
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchCartData();
        }
    }, [userId, router]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate event date and time
        if (formData.eventDate && new Date(formData.eventDate) < new Date()) {
            setError("يجب اختيار تاريخ في المستقبل");
            return;
        }
    
        if (!formData.eventTime) {
            setError("الرجاء اختيار وقت المناسبة");
            return;
        }

        if (!isLoggedIn || !userId || checkoutItems.length === 0 || isSubmitting) {
            setError("لا يمكن إتمام الطلب. تأكد من تسجيل الدخول وأن السلة ليست فارغة.");
            return;
        }

        if (!formData.name || !formData.phone) {
            setError("الرجاء إدخال الاسم الكامل ورقم الجوال.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const orderData = {
            userId: userId,
            customerInfo: { ...formData },
            items: checkoutItems.map(item => ({
                serviceId: item.serviceId,
                name: item.name,
                price: item.price,
                taxRate: item.taxRate || 0,
                serviceTax: item.serviceTax || 0,
                supplierId: item.supplierId || null,
                packageName: item.packageName || null,
                packageDescription: item.packageDescription || null,
                image: item.image || null,
                categoryId: item.categoryId || null,
                personCount: item.personCount || 1
            })),
            subTotal: subTotal,
            vat: vatAmount,
            serviceTax: serviceTaxAmount,
            totalAmount: totalAmount,
            eventDetails: {
                type: formData.eventType,
                date: formData.eventDate,
                time: formData.eventTime
            },
            status: "pending",
            paymentMethod: formData.paymentMethod,
            createdAt: serverTimestamp()
        };

        try {
            const orderRef = await addDoc(collection(db, "orders"), orderData);
            const orderId = orderRef.id;
            // Clear the user's cart
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                cart: []
            });

            router.push(`/orders/success?orderId=${orderRef.id}`);
            // Notify each supplier about their items in the order
                const suppliersToNotify = new Set();
                checkoutItems.forEach(item => {
                if (item.supplierId) {
                    suppliersToNotify.add(item.supplierId);
                }
                });

                // Send notifications to all relevant suppliers
                await Promise.all(
                Array.from(suppliersToNotify).map(async (supplierId) => {
                    try {
                    await axios.post('/api/notify-supplier', {
                        orderId,
                        supplierId
                    });
                    } catch (err) {
                    console.error(`Failed to notify supplier ${supplierId}:`, err);
                    // Continue even if notification fails for one supplier
                    }
                })
                );

        } catch (err) {
            console.error("Error processing order:", err);
            setError(`حدث خطأ أثناء معالجة الطلب: ${err.message || 'يرجى المحاولة مرة أخرى.'}`);
            setIsSubmitting(false);
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
            <>
                <NavBar/>
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] text-center px-4">
                    <h1 className="text-xl font-bold text-red-600 mb-4">{error}</h1>
                    {!loading && !error.includes("جارٍ إعادة التوجيه") && (
                        <Link href="/card" className="mt-4 text-[#D4AF37] hover:text-[#B8860B]">
                            العودة إلى السلة
                        </Link>
                    )}
                </div>
                <Footer/>
            </>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <p>يجب تسجيل الدخول لإتمام الشراء...</p>
            </div>
        );
    }

    if (checkoutItems.length === 0 && !loading) {
        return (
            <>
                <NavBar/>
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] text-center px-4">
                    <h1 className="text-xl font-bold text-gray-700 mb-4">سلة الشراء فارغة.</h1>
                    <Link href="/services" className="mt-4 text-[#D4AF37] hover:text-[#B8860B]">
                        تصفح الخدمات
                    </Link>
                </div>
                <Footer/>
            </>
        );
    }

    return (
        <div className="bg-gray-50">
            <NavBar />
            <div dir="rtl" className="min-h-screen py-8">
                <div className="container mx-auto px-4 max-w-6xl">
                    <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">إتمام عملية الشراء</h1>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Order Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
                                <h2 className="text-xl font-semibold mb-5 pb-3 border-b text-black border-gray-100">ملخص الطلب</h2>

                                {/* Items List */}
                                <div className="space-y-4 max-h-96 overflow-y-auto mb-5 pr-2">
                                    {checkoutItems.map((item, index) => {
                                        const itemPrice = Number(item.price) || 0;
                                        const vat = itemPrice * (item.taxRate || 0) / 100;
                                        const serviceTax = itemPrice * (item.serviceTax || 0) / 100;
                                        const totalTax = vat + serviceTax;
                                        const totalPrice = itemPrice + totalTax;

                                        return (
                                            <div key={index} className="flex gap-3 pb-4 border-b border-gray-100 last:border-b-0">
                                                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                    {item.image ? (
                                                        <Image 
                                                            src={item.image} 
                                                            alt={item.name || 'Service'} 
                                                            fill 
                                                            className="object-cover"
                                                            sizes="64px"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-gray-400">
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-gray-800">{item.name || 'خدمة'}</h3>
                                                    {item.packageName && <p className="text-xs text-gray-500 mt-1">{item.packageName}</p>}
                                                    {item.personCount > 1 && (
                                                        <p className="text-xs text-gray-500">عدد الأشخاص: {item.personCount}</p>
                                                    )}
                                                    
                                                    {/* Tax Breakdown */}
                                                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                                                        <div className="flex justify-between">
                                                            <span>السعر:</span>
                                                            <span>{formatAED(itemPrice)}</span>
                                                        </div>
                                                        {item.taxRate > 0 && (
                                                            <div className="flex justify-between">
                                                                <span>ضريبة القيمة المضافة ({item.taxRate}%):</span>
                                                                <span>+{formatAED(vat)}</span>
                                                            </div>
                                                        )}
                                                        {item.serviceTax > 0 && (
                                                            <div className="flex justify-between">
                                                                <span>ضريبة الخدمة ({item.serviceTax}%):</span>
                                                                <span>+{formatAED(serviceTax)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-[#D4AF37] font-semibold whitespace-nowrap">
                                                    {formatAED(totalPrice)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Order Totals */}
                                <div className="border-t border-gray-100 pt-4 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">المجموع الجزئي:</span>
                                        <span className="font-medium text-black">{formatAED(subTotal)}</span>
                                    </div>

                                    {/* VAT Summary */}
                                    {vatAmount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">ضريبة القيمة المضافة:</span>
                                            <span className="font-medium text-black">+{formatAED(vatAmount)}</span>
                                        </div>
                                    )}

                                    {/* Service Tax Summary */}
                                    {serviceTaxAmount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">ضريبة الخدمة:</span>
                                            <span className="font-medium text-black">+{formatAED(serviceTaxAmount)}</span>
                                        </div>
                                    )}

                                    <div className="border-t border-gray-200 pt-3 mt-2">
                                        <div className="flex justify-between font-bold text-lg">
                                            <span className="font-medium text-black">الإجمالي النهائي:</span>
                                            <span className="text-[#D4AF37]">{formatAED(totalAmount)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Checkout Form */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Customer Information */}
                                    <div>
                                        <h2 className="text-xl font-semibold mb-4 text-gray-900">1. معلومات العميل</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
                                                <input 
                                                    type="text" 
                                                    id="name" 
                                                    name="name" 
                                                    value={formData.name} 
                                                    onChange={handleInputChange} 
                                                    className="w-full p-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition" 
                                                    required 
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1">رقم الجوال *</label>
                                                <input 
                                                    type="tel" 
                                                    id="phone" 
                                                    name="phone" 
                                                    value={formData.phone} 
                                                    onChange={handleInputChange} 
                                                    className="w-full p-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition" 
                                                    required 
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">البريد الإلكتروني</label>
                                                <input 
                                                    type="email" 
                                                    id="email" 
                                                    name="email" 
                                                    value={formData.email} 
                                                    onChange={handleInputChange} 
                                                    className="w-full p-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-gray-50 transition" 
                                                    readOnly={!!auth.currentUser?.email}
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-1">العنوان (اختياري)</label>
                                                <input 
                                                    type="text" 
                                                    id="address" 
                                                    name="address" 
                                                    value={formData.address} 
                                                    onChange={handleInputChange} 
                                                    className="w-full p-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Event Details */}
                                    <div className="pt-6 border-t border-gray-100">
                                        <h2 className="text-xl font-semibold mb-4 text-gray-800">2. تفاصيل المناسبة</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="eventType" className="block text-sm font-medium text-gray-900 mb-1">نوع المناسبة *</label>
                                                <select
                                                    id="eventType"
                                                    name="eventType"
                                                    value={formData.eventType}
                                                    onChange={handleInputChange}
                                                    className="w-full p-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition"
                                                    required
                                                >
                                                    <option value="birthday">حفلة عيد ميلاد</option>
                                                    <option value="wedding">حفل زفاف</option>
                                                    <option value="graduation">حفل تخرج</option>
                                                    <option value="corporate">مناسبة شركة</option>
                                                    <option value="family">مناسبة عائلية</option>
                                                    <option value="other">أخرى</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="eventDate" className="block text-sm font-medium text-gray-900 mb-1">تاريخ المناسبة *</label>
                                                <input 
                                                    type="date" 
                                                    id="eventDate" 
                                                    name="eventDate" 
                                                    value={formData.eventDate} 
                                                    onChange={handleInputChange} 
                                                    min={new Date().toISOString().split('T')[0]}
                                                    className="w-full p-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition" 
                                                    required 
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="eventTime" className="block text-sm font-medium text-gray-900 mb-1">وقت المناسبة *</label>
                                                <select
                                                    id="eventTime"
                                                    name="eventTime"
                                                    value={formData.eventTime}
                                                    onChange={handleInputChange}
                                                    className="w-full p-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition"
                                                    required
                                                >
                                                    <option value="">اختر الوقت</option>
                                                    <option value="morning">الصباح (9 ص - 12 م)</option>
                                                    <option value="afternoon">بعد الظهر (12 م - 4 م)</option>
                                                    <option value="evening">المساء (4 م - 8 م)</option>
                                                    <option value="night">الليل (8 م - 12 ص)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Method */}
                                    <div className="pt-6 border-t border-gray-100">
                                        <h2 className="text-xl font-semibold mb-4 text-gray-800">3. طريقة الدفع</h2>
                                        <div className="space-y-3">
                                            {[
                                                { value: "credit", label: "بطاقة ائتمان", icon: "credit-card" },
                                                { value: "bank", label: "تحويل بنكي", icon: "bank" },
                                                { value: "cash", label: "الدفع نقدًا عند الاستلام", icon: "money-bill" }
                                            ].map((method) => (
                                                <label key={method.value} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${formData.paymentMethod === method.value ? 'border-[#D4AF37] bg-[#F5E8C7]' : 'border-gray-300 hover:border-[#D4AF37]'}`}>
                                                    <input 
                                                        type="radio" 
                                                        name="paymentMethod" 
                                                        value={method.value} 
                                                        checked={formData.paymentMethod === method.value} 
                                                        onChange={handleInputChange} 
                                                        className="h-5 w-5 text-[#D4AF37] focus:ring-[#D4AF37] border-gray-300" 
                                                        required 
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <svg className={`w-5 h-5 text-gray-700`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            {method.icon === "credit-card" && (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                            )}
                                                            {method.icon === "bank" && (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 21l19-9-19-9v18zm0-18v18" />
                                                            )}
                                                            {method.icon === "money-bill" && (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            )}
                                                        </svg>
                                                        <span className="text-sm font-medium text-gray-700">{method.label}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Additional Notes */}
                                    <div className="pt-6 border-t border-gray-100">
                                        <h2 className="text-xl font-semibold mb-4 text-gray-800">4. ملاحظات إضافية</h2>
                                        <textarea 
                                            id="notes" 
                                            name="notes" 
                                            value={formData.notes} 
                                            onChange={handleInputChange} 
                                            rows={3} 
                                            className="w-full p-3 border text-gray-800 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition" 
                                            placeholder="أي تعليمات خاصة أو تفاصيل إضافية حول طلبك..."
                                        ></textarea>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-6 border-t border-gray-100">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className={`w-full py-4 px-6 rounded-xl font-bold text-lg text-white transition duration-200 flex items-center justify-center gap-2 ${
                                                isSubmitting ? "bg-gray-400" : "bg-[#D4AF37] hover:bg-[#B8860B] shadow-md"
                                            }`}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    جاري معالجة الطلب...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    تأكيد الطلب وارساله للمراجعة
                                                </>
                                            )}
                                        </button>
                                        <p className="text-xs text-gray-500 mt-3 text-center">
                                            بالضغط على تأكيد الطلب، أنت توافق على <Link href="/terms" className="underline hover:text-[#D4AF37]">شروط الخدمة</Link> وسياسة الخصوصية.
                                        </p>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}