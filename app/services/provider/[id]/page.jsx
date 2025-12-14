"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";

const formatFirestoreDate = (timestamp) => {
  if (!timestamp) return 'غير معروف';
  try {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date)) {
        return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    console.warn("Unrecognized date format:", timestamp);
    return 'تاريخ غير معروف';
  } catch (error) {
    console.error("Error formatting date:", error, "Input:", timestamp);
    return 'خطأ في التاريخ';
  }
};

export default function ServiceProviderPage() {
  const { id } = useParams();
  const router = useRouter();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSupplier, setIsSupplier] = useState(false);
  const [relatedServices, setRelatedServices] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isCartAdded, setIsCartAdded] = useState(false);
  const [isLoadingCart, setIsLoadingCart] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [showPopup, setShowPopup] = useState(false); // State to control popup visibility
  const [popupMessage, setPopupMessage] = useState(""); // State to store popup message

  const calculateTotalPrice = () => {
    return selectedPackages.reduce(
      (total, item) => total + (item.package.pricePerPerson * item.personCount),
      0
    );
  };

  const calculateTotalPersons = () => {
    return selectedPackages.reduce(
      (total, item) => total + item.personCount,
      0
    );
  };

  useEffect(() => {
    if (isLoggedIn && provider && id) {
      const checkCart = async () => {
        try {
          const user = auth.currentUser;
          if (!user) return;
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const cartItems = userSnap.data().cart || [];
            setIsCartAdded(cartItems.some(item => item.serviceId === id));
          } else {
            setIsCartAdded(false);
          }
        } catch (err) {
          console.error("Error checking cart:", err);
          setIsCartAdded(false);
        }
      };
      checkCart();
    } else {
      setIsCartAdded(false);
    }
  }, [isLoggedIn, provider, id]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoggedIn(!!user);
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const isAdmin = userData.role === "admin";
            const isSupplier = userData.userType === "supplier" || isAdmin;
            setIsSupplier(isSupplier);
  
            if (isAdmin || (provider && user.uid === provider.supplierId)) {
              setIsOwner(true);
            } else {
              setIsOwner(false);
            }
          } else {
            setIsSupplier(false);
            setIsOwner(false);
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setIsSupplier(false);
          setIsOwner(false);
        }
      } else {
        setIsSupplier(false);
        setIsOwner(false);
      }
    });
  
    return () => unsubscribe();
  }, [provider]);
  

  useEffect(() => {
    const fetchProvider = async () => {
      setLoading(true);
      setError(null);
      setProvider(null);
      setRelatedServices([]);
      setSelectedPackages([]);
      if (!id) {
        setError("معرف مزود الخدمة غير موجود.");
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, "providers", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          setError("مزود الخدمة غير موجود");
          setLoading(false);
          return;
        }
        const providerData = docSnap.data();
        setProvider({
          id: docSnap.id,
          ...providerData,
          createdAt: formatFirestoreDate(providerData.createdAt),
          packages: Array.isArray(providerData.packages) ? providerData.packages : []
        });
        if (providerData.categoryId) {
          const q = query(
            collection(db, "providers"),
            where("categoryId", "==", providerData.categoryId),
            where("__name__", "!=", id)
          );
          const querySnapshot = await getDocs(q);
          const services = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.name && data.imageUrl) {
              services.push({
                id: doc.id,
                ...data,
                createdAt: formatFirestoreDate(data.createdAt)
              });
            }
          });
          setRelatedServices(services.slice(0, 3));
        }
      } catch (err) {
        console.error("Error fetching provider:", err);
        setError("حدث خطأ أثناء جلب بيانات مزود الخدمة");
      } finally {
        setLoading(false);
      }
    };
    fetchProvider();
  }, [id]);

  const handlePackageSelect = (pkgIndex) => {
    const pkg = provider.packages[pkgIndex];
    setSelectedPackages(prev => {
      const existingIndex = prev.findIndex(item => item.index === pkgIndex);
      if (existingIndex >= 0) {
        return prev.filter(item => item.index !== pkgIndex);
      } else {
        return [...prev, {
          index: pkgIndex,
          package: pkg,
          personCount: 1
        }];
      }
    });
    setError(null);
  };

  const handlePersonCountChange = (pkgIndex, count) => {
    const maxPersons = provider.packages[pkgIndex].maxPersons;
    count = parseInt(count) || 1;

    if (count > maxPersons) {
      setPopupMessage(`لا يمكن تجاوز الحد الأقصى للأشخاص (${maxPersons}) لهذه الباقة`);
      setShowPopup(true);
      return;
    }

    if (count < 1) {
      setPopupMessage("يجب أن يكون عدد الأشخاص على الأقل 1");
      setShowPopup(true);
      return;
    }

    setSelectedPackages(prev =>
      prev.map(item =>
        item.index === pkgIndex
          ? {
            ...item,
            personCount: count
          }
          : item
      )
    );
    setError(null);
  };

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/services/provider/${id}`);
      return;
    }
    if (selectedPackages.length === 0 && provider.packages?.length > 0) {
      setError("الرجاء اختيار باقة واحدة على الأقل");
      return;
    }
    const itemsToAdd = provider.packages?.length > 0
      ? selectedPackages.map(item => ({
        serviceId: id,
        name: provider.name,
        supplierId: provider.supplierId,
        packageName: item.package.name,
        packageDescription: item.package.description,
        personCount: item.personCount,
        pricePerPerson: item.package.pricePerPerson,
        totalPrice: item.package.pricePerPerson * item.personCount,
        image: provider.imageUrl,
        categoryId: provider.categoryId,
        addedAt: new Date(),
        taxRate: provider.taxRate || 0,
        serviceTax: provider.serviceTax || 0
      }))
      : [{
        serviceId: id,
        name: provider.name,
        supplierId: provider.supplierId,
        packageName: "الخدمة الأساسية",
        packageDescription: provider.description,
        personCount: 1,
        pricePerPerson: provider.startingPrice,
        totalPrice: provider.startingPrice,
        image: provider.imageUrl,
        categoryId: provider.categoryId,
        addedAt: new Date(),
        taxRate: provider.taxRate || 0,
        serviceTax: provider.serviceTax || 0
      }];
    setError(null);
    setIsLoadingCart(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        cart: arrayUnion(...itemsToAdd)
      });
      setIsCartAdded(true);
    } catch (error) {
      console.error("Error adding to cart:", error);
      setError("حدث خطأ أثناء إضافة الخدمة إلى السلة");
      setIsCartAdded(false);
    } finally {
      setIsLoadingCart(false);
    }
  };

  const handleContact = () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/services/provider/${id}`);
      return;
    }
    alert(`للتواصل مع ${provider?.name} (سيتم تنفيذ هذه الميزة لاحقاً)`);
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
      <div>
        <NavBar />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 text-center">
          <h1 className="text-xl md:text-2xl font-bold text-red-600">{error}</h1>
          <Link href="/services" className="mt-4 text-[#D4AF37] hover:text-[#B8860B] border border-[#D4AF37] px-4 py-2 rounded hover:bg-[#F5E8C7] transition">
            العودة إلى صفحة الخدمات
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (!provider) return (
    <div>
      <NavBar />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        مزود الخدمة غير متوفر.
      </div>
      <Footer />
    </div>
  );

  return (
    <div>
      <NavBar />
      <div dir="rtl" className="min-h-screen bg-gray-50 py-8 font-sans">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <div className="w-full md:w-1/2 lg:w-1/3">
              <div className="relative h-64 md:h-80 rounded-xl overflow-hidden bg-gray-200 shadow">
                {provider.imageUrl ? (
                  <Image
                    src={provider.imageUrl}
                    alt={provider.name || 'صورة الخدمة'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    لا توجد صورة متاحة
                  </div>
                )}
              </div>
              {provider.imageUrls && provider.imageUrls.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                  {provider.imageUrls.map((url, index) => (
                    <div key={index} className="relative w-16 h-16 rounded-md overflow-hidden border-2 border-transparent hover:border-[#D4AF37] cursor-pointer flex-shrink-0">
                      <Image
                        src={url}
                        alt={`${provider.name} - صورة ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="w-full md:w-1/2 lg:w-2/3">
              <div className="bg-white rounded-xl shadow-md p-6 h-full flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                    {provider.name}
                  </h1>
                  {isOwner && (
                    <Link
                      href={`/services/provider/${id}/edit`}
                      className="text-[#D4AF37] hover:text-[#B8860B] text-sm font-medium flex-shrink-0 ml-4"
                    >
                      تعديل الخدمة
                    </Link>
                  )}
                </div>
                <div className="flex items-center mb-4">
                  <div className="flex text-[#D4AF37]">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5" fill={i < Math.round(provider.rating || 0) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={i < Math.round(provider.rating || 0) ? 0 : 1} viewBox="0 0 20 20"> <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /> </svg>
                    ))}
                  </div>
                  <span className="text-gray-500 text-sm mr-2">
                    ({provider.ratingCount || 0} تقييم{provider.ratingCount !== 1 ? '' : ''})
                  </span>
                </div>
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">الوصف</h2>
                  <p className="text-gray-600 leading-relaxed">{provider.description || "لا يوجد وصف متاح."}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5 text-sm">
                  <div>
                    <h3 className="font-medium text-gray-500">الموقع</h3>
                    <p className="text-gray-800">{provider.location || "غير محدد"}</p>
                  </div>
                  {provider.capacity && (
                    <div>
                      <h3 className="font-medium text-gray-500">السعة</h3>
                      <p className="text-gray-800">{provider.capacity} أشخاص</p>
                    </div>
                  )}
                  {provider.cuisineType && (
                    <div>
                      <h3 className="font-medium text-gray-500">نوع المطبخ</h3>
                      <p className="text-gray-800">{provider.cuisineType}</p>
                    </div>
                  )}
                  {provider.destination && (
                    <div>
                      <h3 className="font-medium text-gray-500">الوجهة</h3>
                      <p className="text-gray-800">{provider.destination}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-500">تاريخ الإضافة</h3>
                    <p className="text-gray-800">{provider.createdAt}</p>
                  </div>
                </div>
                {/* Display starting price only if no packages exist */}
                {(!provider.packages || provider.packages.length === 0) && provider.startingPrice && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">السعر الأساسي:</span>
                      <span className="text-lg font-bold text-[#D4AF37]">
                        {provider.startingPrice} درهم إماراتي
                      </span>
                    </div>
                  </div>
                )}
                {provider.packages && provider.packages.length > 0 && (
                  <div className="mb-6 border-t pt-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">اختر الباقات</h2>
                    <div className="space-y-3">
                      {provider.packages.map((pkg, index) => (
                        <div key={index} className={`p-4 border rounded-lg ${selectedPackages.some(p => p.index === index) ? 'border-[#D4AF37] bg-[#F5E8C7]' : 'border-gray-200'}`}>
                          <div className="flex items-start">
                            <input
                              type="checkbox"
                              checked={selectedPackages.some(p => p.index === index)}
                              onChange={() => handlePackageSelect(index)}
                              className="mt-1 mr-2 h-4 w-4 text-[#D4AF37] focus:ring-[#B8860B]"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <h3 className="font-semibold text-black">{pkg.name}</h3>
                                <span className="text-[#B8860B] font-bold">
                                  {pkg.pricePerPerson} درهم/للشخص
                                </span>
                              </div>
                              <p className="text-sm text-black mt-1">{pkg.description}</p>
                              {selectedPackages.some(p => p.index === index) && (
                                <div className="mt-3">
                                  <label className="block text-sm text-black mb-1">
                                    عدد الأشخاص (الحد الأقصى: {pkg.maxPersons})
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max={pkg.maxPersons}
                                    value={selectedPackages.find(p => p.index === index)?.personCount || 1}
                                    onChange={(e) => handlePersonCountChange(index, e.target.value)}
                                    className="w-20 px-2 py-1 text-black border rounded"
                                  />
                                  <div className="mt-2 text-sm text-black">
                                    السعر للباقة: {pkg.pricePerPerson * (selectedPackages.find(p => p.index === index)?.personCount || 1)} درهم
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedPackages.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-black">المجموع:</span>
                      <span className="text-xl font-bold text-[#D4AF37]">
                        {calculateTotalPrice()} درهم
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      لـ {calculateTotalPersons()} أشخاص
                    </div>
                  </div>
                )}
                <div className="mt-auto space-y-3 pt-4 border-t">
                  <button
                    onClick={handleContact}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2.5 px-6 rounded-lg font-medium border border-gray-300 transition"
                  >
                    تواصل مع مزود الخدمة
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={isCartAdded || isLoadingCart || (provider.packages?.length > 0 && selectedPackages.length === 0)}
                    className={`w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition ${
                      isCartAdded
                        ? "bg-green-100 text-green-800 cursor-default"
                        : isLoadingCart || (provider.packages?.length > 0 && selectedPackages.length === 0)
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-[#D4AF37] hover:bg-[#B8860B] text-white"
                    }`}
                  >
                    {isCartAdded ? (
                      <> <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> تمت الإضافة للسلة </>
                    ) : isLoadingCart ? (
                      "جاري الإضافة..."
                    ) : (
                      <> <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> أضف إلى السلة </>
                    )}
                  </button>
                  {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}
                </div>
              </div>
            </div>
          </div>
          {provider.features && provider.features.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">المميزات</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                {provider.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-[#D4AF37] ml-2 mt-1">•</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {relatedServices.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">خدمات مشابهة</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedServices.map((service) => (
                  <div key={service.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow flex flex-col">
                    <Link href={`/services/provider/${service.id}`} className="block">
                      <div className="relative h-48 bg-gray-100">
                        {service.imageUrl ? (
                          <Image src={service.imageUrl} alt={service.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">لا توجد صورة</div>
                        )}
                      </div>
                    </Link>
                    <div className="p-4 flex-grow flex flex-col justify-between">
                      <div>
                        <Link href={`/services/provider/${service.id}`} className="block">
                          <h3 className="text-lg font-bold text-gray-800 mb-2 hover:text-[#D4AF37] transition">{service.name}</h3>
                        </Link>
                        <div className="flex items-center mb-3">
                          <div className="flex text-[#D4AF37]">
                            {[...Array(5)].map((_, i) => (
                              <svg key={i} className="w-4 h-4" fill={i < Math.round(service.rating || 0) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={i < Math.round(service.rating || 0) ? 0 : 1} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            ))}
                          </div>
                          <span className="text-gray-500 text-xs mr-1">({service.ratingCount || 0} تقييم)</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-semibold text-sm text-[#B8860B]"> يبدأ من {service.startingPrice} درهم </span>
                        <Link href={`/services/provider/${service.id}`} className="bg-[#D4AF37] hover:bg-[#B8860B] text-white px-3 py-1.5 rounded-md text-xs font-medium transition">
                          عرض التفاصيل
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
      {/* Popup Component */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          <div className="relative bg-white p-6 rounded-lg shadow-lg z-50 text-center">
            <p className="text-red-600 font-bold mb-4">{popupMessage}</p>
            <button
              onClick={() => setShowPopup(false)}
              className="bg-[#D4AF37] hover:bg-[#B8860B] text-white px-4 py-2 rounded transition"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}