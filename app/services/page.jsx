"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc ,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useAuth } from "@/lib/auth";

const EditIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);

const DeleteIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

const ServicesPage = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [serviceCategories, setServiceCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();
  const sectionRefs = useRef([]);

  const { user } = useAuth();
  const db = getFirestore(app);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoadingAuth(true);
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        try {
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setUserProfile({ uid: user.uid, ...userSnap.data() });
          } else {
            setUserProfile({ uid: user.uid });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile({ uid: user.uid });
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [auth, db]);

  // Fetch services from Firestore
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError(null);
      try {
        const servicesCollectionRef = collection(db, "home"); // changed here
        const querySnapshot = await getDocs(servicesCollectionRef);
  
        const servicesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
  
        setServiceCategories(servicesData);
      } catch (err) {
        console.error("Error fetching services:", err);
        setError("Failed to load services. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchServices();
  }, [db]);
  

  const isAdmin =
    !loadingAuth &&
    userProfile &&
    (userProfile.role === "admin" || userProfile.role === "subadmin");

  const handleEditClick = (serviceId, event) => {
    event.preventDefault();
    event.stopPropagation();
    router.push(`/admin/edit-service/${serviceId}`);
  };

  const handleDeleteClick = async (serviceId, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (window.confirm("Are you sure you want to delete this service?")) {
      try {
        await deleteDoc(doc(db, "services", serviceId));
        setServiceCategories(serviceCategories.filter(service => service.id !== serviceId));
        alert("Service deleted successfully!");
      } catch (error) {
        console.error("Error deleting service:", error);
        alert(`Error deleting service: ${error.message}`);
      }
    }
  };

  // Filter categories based on active tab
  const filteredCategories = activeTab === "all" 
    ? serviceCategories 
    : serviceCategories.filter(cat => cat.featured);

  // Intersection Observer for Animations
  useEffect(() => {
    const currentRefs = sectionRefs.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fadeIn");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    currentRefs.forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => {
      currentRefs.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  const addToRefs = (el) => {
    if (el && !sectionRefs.current.includes(el)) {
      sectionRefs.current.push(el);
    }
  };

  return (
    <div>
      <NavBar />
      <div dir="rtl" className="min-h-screen bg-gray-50 py-8 font-sans">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div 
            className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] rounded-xl p-8 mb-12 text-center text-white shadow-lg"
            ref={addToRefs}
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-4">خدمات الزفاف والمناسبات</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto">
              اكتشف كل ما تحتاجه لجعل يوم زفافك مميزًا ولا يُنسى. اختر من بين أفضل مزودي الخدمات في جميع الفئات.
            </p>
          </div>

          {/* Categories Filter */}
          <div className="flex justify-center mb-8" ref={addToRefs}>
            <div className="inline-flex rounded-lg bg-white shadow-md p-1">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${activeTab === "all" ? "bg-[#D4AF37] text-white" : "text-gray-700 hover:bg-gray-100"}`}
              >
                جميع الخدمات
              </button>
              
            </div>
          </div>

          {/* Services Grid */}
          {loading && (
            <div className="text-center py-10">جاري تحميل الخدمات...</div>
          )}
          {error && (
            <div className="text-center py-10 text-red-600">{error}</div>
          )}
          {!loading && !error && (
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              ref={addToRefs}
            >
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <div 
                    key={category.id} 
                    className="relative overflow-hidden rounded-xl bg-white shadow-lg transition-transform duration-300 hover:scale-105 group"
                  >
                    {/* Admin controls */}
                    {isAdmin && (
                      <div className="absolute top-2 left-2 z-20 flex gap-2">
                        <button
                          onClick={(e) => handleEditClick(category.id, e)}
                          className="p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                          aria-label="Edit Service"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(category.id, e)}
                          className="p-1.5 bg-red-600/80 text-white rounded-full hover:bg-red-700/80 transition-colors"
                          aria-label="Delete Service"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    )}

                    <div className="relative h-48 w-full">
                      <Image
                        src={category.image || "/images/placeholder.png"}
                        alt={category.title || "Service Image"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-4 sm:p-6">
                      <h3 className="mb-2 text-lg font-bold text-gray-800 sm:text-xl">
                        {category.title || "Untitled Service"}
                      </h3>
                      <p className="mb-2 text-sm text-gray-600 sm:text-base line-clamp-3">
                        {category.description || "No description available."}
                      </p>
                      <Link
                        href={`/services/category/${category.id}`}
                        className="mt-2 inline-block text-sm text-rose-600 hover:text-rose-700 sm:text-base"
                      >
                        عرض التفاصيل →
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="col-span-full text-center text-gray-500 py-10">
                  {activeTab === "all"
                    ? "No services found."
                    : "No featured services found."}
                </p>
              )}
            </div>
          )}

          {/* How It Works Section */}
          <div 
            className="mt-16 bg-white rounded-xl shadow-md p-8"
            ref={addToRefs}
          >
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">كيف تعمل منصتنا؟</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-[#F5E8C7] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#D4AF37] text-2xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">تصفح الخدمات</h3>
                <p className="text-gray-600">
                  استكشف مختلف فئات خدمات الزفاف واختر ما يناسب احتياجاتك
                </p>
              </div>
              <div className="text-center">
                <div className="bg-[#F5E8C7] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#D4AF37] text-2xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">قارن العروض</h3>
                <p className="text-gray-600">
                  قارن بين مزودي الخدمات بناءً على الأسعار والتقييمات والعروض
                </p>
              </div>
              <div className="text-center">
                <div className="bg-[#F5E8C7] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#D4AF37] text-2xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">احجز بسهولة</h3>
                <p className="text-gray-600">
                  احجز الخدمة المفضلة لديك مباشرة عبر المنصة بخطوات بسيطة
                </p>
              </div>
            </div>
          </div>

          {/* Testimonials */}
          <div 
            className="mt-16"
            ref={addToRefs}
          >
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">آراء عملائنا</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: "أحمد ومريم",
                  role: "عروسان",
                  content: "ساعدتنا المنصة في العثور على أفضل مزودي الخدمات لزفافنا. كل شيء كان رائعًا!",
                  date: "يناير 2023"
                },
                {
                  name: "سارة الخالد",
                  role: "والدة العروس",
                  content: "سهولة الاستخدام وتنوع الخيارات جعلت التخطيط للزفاف أسهل بكثير",
                  date: "نوفمبر 2022"
                },
                {
                  name: "محمد العلي",
                  role: "منظم حفلات",
                  content: "أتعامل مع المنصة بشكل دائم وأجدها الأفضل في مجال خدمات الزفاف",
                  date: "سبتمبر 2022"
                }
              ].map((testimonial, index) => (
                <div 
                  key={index} 
                  className="bg-white p-6 rounded-lg shadow-md border border-gray-100"
                >
                  <div className="flex items-center mb-4">
                    <div className="bg-[#F5E8C7] w-12 h-12 rounded-full flex items-center justify-center text-[#D4AF37] font-bold">
                      {testimonial.name.split(" ")[0].charAt(0)}
                    </div>
                    <div className="mr-3">
                      <h4 className="font-bold">{testimonial.name}</h4>
                      <p className="text-gray-500 text-sm">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-3">"{testimonial.content}"</p>
                  <p className="text-gray-400 text-sm">{testimonial.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ServicesPage;