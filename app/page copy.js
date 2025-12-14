"use client";
import React, { useState, useEffect, useRef } from "react";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import EditServiceModal from "@/components/EditServiceModal";
import EditSlideModal from "@/components/EditSlideModal"; // New modal for slides
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { app } from "../lib/firebase";

// Testimonials data (can also be moved to Firestore if needed)
const testimonials = [
  {
    id: 1,
    name: "أحمد محمد",
    role: "عريس",
    content: "ساعدوني في تنظيم حفل زفاف أحلامي بكل تفاصيله، شكراً لكم!",
    avatar: "/images/avatar1.jpg",
  },
  {
    id: 2,
    name: "سارة خالد",
    role: "منظمة أحداث",
    content: "أتعامل معهم بشكل دائم لتنظيم الحفلات، دائمًا يقدمون خدمة ممتازة.",
    avatar: "/images/avatar2.jpg",
  },
  {
    id: 3,
    name: "علي حسن",
    role: "أب العريس",
    content: "حفل زفاف ابني كان رائعًا بفضل اختيار القاعة والخدمات المناسبة.",
    avatar: "/images/avatar1.jpg",
  },
];

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

const AddIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
    />
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

export default function HomePage() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Service Data State
  const [allServices, setAllServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loadingServices, setLoadingServices] = useState(true);
  const [errorServices, setErrorServices] = useState(null);

  // Slides State
  const [slides, setSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(true);
  const [errorSlides, setErrorSlides] = useState(null);

  // Modal States
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [isNewSlide, setIsNewSlide] = useState(false);

  const sectionRefs = useRef([]);
  const db = getFirestore(app);
  const auth = getAuth(app);

  // Effect to Listen for Auth Changes & Fetch User Profile
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
            console.log(
              "User document not found in Firestore 'users' collection."
            );
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

  // Effect to Fetch Services
  useEffect(() => {
    const fetchServices = async () => {
      setLoadingServices(true);
      setErrorServices(null);
      try {
        const servicesCollectionRef = collection(db, "home");
        const querySnapshot = await getDocs(servicesCollectionRef);
        const servicesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllServices(servicesData);
      } catch (err) {
        console.error("Error fetching services:", err);
        setErrorServices("Failed to load services. Please try again later.");
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, [db]);

  // Effect to Fetch Slides
  useEffect(() => {
    const fetchSlides = async () => {
      setLoadingSlides(true);
      setErrorSlides(null);
      try {
        const slidesCollectionRef = collection(db, "slides");
        const querySnapshot = await getDocs(slidesCollectionRef);
        const slidesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSlides(slidesData.sort((a, b) => a.order - b.order)); // Sort by order field
      } catch (err) {
        console.error("Error fetching slides:", err);
        setErrorSlides("Failed to load slides. Please try again later.");
      } finally {
        setLoadingSlides(false);
      }
    };
    fetchSlides();
  }, [db]);

  // Effect to Filter Services
  useEffect(() => {
    if (!loadingServices) {
      if (activeCategory === "all") {
        setFilteredServices(allServices);
      } else {
        setFilteredServices(
          allServices.filter((service) => service.category === activeCategory)
        );
      }
    }
  }, [activeCategory, allServices, loadingServices]);

  // Effect for Intersection Observer Animations
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

  // --- Service Modal Handlers ---
  const handleEditServiceClick = (service, event) => {
    event.preventDefault();
    event.stopPropagation();
    setEditingService(service);
    setIsServiceModalOpen(true);
  };

  const handleCloseServiceModal = () => {
    setIsServiceModalOpen(false);
    setEditingService(null);
  };

  const handleSaveServiceChanges = async (serviceId, updatedData) => {
    const serviceDocRef = doc(db, "home", serviceId);
    try {
      await updateDoc(serviceDocRef, updatedData);
      const updatedServices = allServices.map((service) =>
        service.id === serviceId ? { ...service, ...updatedData } : service
      );
      setAllServices(updatedServices);
      handleCloseServiceModal();
      alert("Service updated successfully!");
    } catch (error) {
      console.error("Error updating service:", error);
      alert(`Error updating service: ${error.message}`);
    }
  };

  // --- Slide Modal Handlers ---
  const handleEditSlideClick = (slide, event) => {
    event.preventDefault();
    event.stopPropagation();
    setEditingSlide(slide);
    setIsNewSlide(false);
    setIsSlideModalOpen(true);
  };

  const handleAddSlideClick = () => {
    setEditingSlide(null);
    setIsNewSlide(true);
    setIsSlideModalOpen(true);
  };

  const handleDeleteSlideClick = async (slideId, event) => {
    event.preventDefault();
    event.stopPropagation();

    if (window.confirm("Are you sure you want to delete this slide?")) {
      try {
        await deleteDoc(doc(db, "slides", slideId));
        setSlides(slides.filter((slide) => slide.id !== slideId));
        alert("Slide deleted successfully!");
      } catch (error) {
        console.error("Error deleting slide:", error);
        alert(`Error deleting slide: ${error.message}`);
      }
    }
  };

  const handleCloseSlideModal = () => {
    setIsSlideModalOpen(false);
    setEditingSlide(null);
    setIsNewSlide(false);
  };

  const handleSaveSlideChanges = async (slideData) => {
    try {
      if (isNewSlide) {
        // Add new slide
        const docRef = await addDoc(collection(db, "slides"), slideData);
        setSlides([...slides, { id: docRef.id, ...slideData }]);
        alert("Slide added successfully!");
      } else {
        // Update existing slide
        const slideDocRef = doc(db, "slides", slideData.id);
        await updateDoc(slideDocRef, slideData);
        setSlides(
          slides.map((slide) =>
            slide.id === slideData.id ? { ...slide, ...slideData } : slide
          )
        );
        alert("Slide updated successfully!");
      }
      handleCloseSlideModal();
    } catch (error) {
      console.error("Error saving slide:", error);
      alert(`Error saving slide: ${error.message}`);
    }
  };

  // Determine if the current user is an admin
  const isAdmin = !loadingAuth && userProfile && userProfile.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      {/* Hero Slider */}
      <section className="relative h-[70vh] w-full" ref={addToRefs}>
        {loadingSlides && (
          <div className="flex h-full items-center justify-center bg-gray-100">
            <p className="text-gray-500">Loading slides...</p>
          </div>
        )}

        {errorSlides && (
          <div className="flex h-full items-center justify-center bg-gray-100">
            <p className="text-red-600">{errorSlides}</p>
          </div>
        )}

        {!loadingSlides && !errorSlides && (
          <>
            {isAdmin && (
              <div className="absolute top-4 right-4 z-20">
                <button
                  onClick={handleAddSlideClick}
                  className="flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
                >
                  <AddIcon />
                  <span>Add Slide</span>
                </button>
              </div>
            )}

            <Swiper
              spaceBetween={30}
              centeredSlides={true}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false,
              }}
              pagination={{ clickable: true }}
              navigation={true}
              modules={[Autoplay, Pagination, Navigation]}
              className="mySwiper h-full w-full"
            >
              {slides.length > 0 ? (
                slides.map((slide) => (
                  <SwiperSlide key={slide.id} className="relative">
                    {isAdmin && (
                      <div className="absolute top-4 left-4 z-20 flex gap-2">
                        <button
                          onClick={(e) => handleEditSlideClick(slide, e)}
                          className="p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                          aria-label="Edit Slide"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSlideClick(slide.id, e)}
                          className="p-1.5 bg-red-600/80 text-white rounded-full hover:bg-red-700/80 transition-colors"
                          aria-label="Delete Slide"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40"></div>
                    <Image
                      src={slide.image || "/images/placeholder.png"}
                      alt={slide.title || "Slide Image"}
                      fill
                      className="object-cover"
                      priority
                    />
                    <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white p-4">
                      <h1 className="mb-4 text-3xl font-bold sm:text-4xl md:text-5xl lg:text-6xl">
                        {slide.title || "Slide Title"}
                      </h1>
                      <p className="mb-8 max-w-2xl text-lg sm:text-xl md:text-2xl">
                        {slide.subtitle || "Slide Subtitle"}
                      </p>
                      {slide.link && (
                        <Link
                          href={slide.link}
                          className="rounded-full bg-rose-600 px-6 py-2 font-semibold text-white transition hover:bg-rose-700 sm:px-8 sm:py-3"
                        >
                          {slide.buttonText || "Click Here"}
                        </Link>
                      )}
                    </div>
                  </SwiperSlide>
                ))
              ) : (
                <SwiperSlide className="relative">
                  <div className="absolute inset-0 bg-black/40"></div>
                  <Image
                    src="/images/placeholder.png"
                    alt="Default Slide"
                    fill
                    className="object-cover"
                  />
                  <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white p-4">
                    <h1 className="mb-4 text-3xl font-bold sm:text-4xl md:text-5xl lg:text-6xl">
                      No Slides Available
                    </h1>
                    <p className="mb-8 max-w-2xl text-lg sm:text-xl md:text-2xl">
                      Please add slides in the admin panel
                    </p>
                  </div>
                </SwiperSlide>
              )}
            </Swiper>
          </>
        )}
      </section>

      {/* Services Section */}
      <section className="py-12 sm:py-16" ref={addToRefs}>
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center sm:mb-12">
            <h2 className="text-2xl font-bold text-gray-800 sm:text-3xl md:text-4xl">
              خدماتنا المميزة
            </h2>
            <p className="mt-2 text-gray-600 sm:mt-4 sm:text-lg">
              اكتشف مجموعة واسعة من الخدمات لمناسبتك الخاصة
            </p>
          </div>

          {/* Categories Filter */}
          <div className="mb-6 flex flex-wrap justify-center gap-2 sm:mb-8 sm:gap-4">
            {/* Add category buttons dynamically based on your categories or keep static */}
            <button
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-4 py-1 text-sm font-medium sm:px-6 sm:py-2 sm:text-base ${
                activeCategory === "all"
                  ? "bg-rose-600 text-white"
                  : "bg-white text-gray-800 shadow-md hover:bg-gray-100"
              }`}
            >
              الكل
            </button>
            {/* Example static buttons - match these values to your Firestore 'category' fields */}
            <button
              onClick={() => setActiveCategory("halls")}
              className={`rounded-full px-4 py-1 text-sm font-medium sm:px-6 sm:py-2 sm:text-base ${
                activeCategory === "halls"
                  ? "bg-rose-600 text-white"
                  : "bg-white text-gray-800 shadow-md hover:bg-gray-100"
              }`}
            >
              قاعات
            </button>
            <button
              onClick={() => setActiveCategory("catering")}
              className={`rounded-full px-4 py-1 text-sm font-medium sm:px-6 sm:py-2 sm:text-base ${
                activeCategory === "catering"
                  ? "bg-rose-600 text-white"
                  : "bg-white text-gray-800 shadow-md hover:bg-gray-100"
              }`}
            >
              مطاعم وضيافة
            </button>
            <button
              onClick={() => setActiveCategory("travel")}
              className={`rounded-full px-4 py-1 text-sm font-medium sm:px-6 sm:py-2 sm:text-base ${
                activeCategory === "travel"
                  ? "bg-rose-600 text-white"
                  : "bg-white text-gray-800 shadow-md hover:bg-gray-100"
              }`}
            >
              سفر وشهر عسل
            </button>
            <button
              onClick={() => setActiveCategory("planning")}
              className={`rounded-full px-4 py-1 text-sm font-medium sm:px-6 sm:py-2 sm:text-base ${
                activeCategory === "planning"
                  ? "bg-rose-600 text-white"
                  : "bg-white text-gray-800 shadow-md hover:bg-gray-100"
              }`}
            >
              تنظيم
            </button>
            {/* Add more categories as needed */}
          </div>

          {/* Services Grid - Loading, Error, Data */}
          {loadingServices && (
            <div className="text-center py-10 text-gray-500">
              Loading services...
            </div>
          )}
          {errorServices && (
            <div className="text-center py-10 text-red-600">
              {errorServices}
            </div>
          )}
          {!loadingServices && !errorServices && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8">
              {filteredServices.length > 0 ? (
                filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className="relative overflow-hidden rounded-xl bg-white shadow-lg transition-transform duration-300 hover:scale-105 group"
                  >
                    {/* --- Conditional Edit Button --- */}
                    {isAdmin && (
                      <button
                        onClick={(e) => handleEditClick(service, e)}
                        className="absolute top-2 right-2 z-20 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                        aria-label="Edit Service"
                      >
                        <EditIcon />
                      </button>
                    )}
                    {/* --- Card Content --- */}
                    <Link
                      href={`/services/category/${service.id}`}
                      className="block"
                    >
                      {" "}
                      {/* Make entire card content linkable */}
                      <div className="relative h-40 sm:h-48 w-full">
                        <Image
                          src={service.image || "/images/placeholder.png"} // Fallback image
                          alt={service.title || "Service Image"}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      </div>
                      <div className="p-4 sm:p-6">
                        <h3 className="mb-2 text-lg font-bold text-gray-800 sm:text-xl line-clamp-1">
                          {service.title || "Untitled Service"}
                        </h3>
                        <p className="mb-3 text-sm text-gray-600 sm:text-base line-clamp-3">
                          {service.description || "No description available."}
                        </p>
                        <span className="text-sm text-rose-600 hover:text-rose-700 font-medium sm:text-base">
                          عرض التفاصيل →
                        </span>
                      </div>
                    </Link>
                  </div>
                ))
              ) : (
                <p className="col-span-full text-center text-gray-500 py-10">
                  {activeCategory === "all"
                    ? "No services found."
                    : `No services found in the selected category.`}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
      {/* Testimonials */}
      <section className="py-12 sm:py-16" ref={addToRefs}>
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center sm:mb-12">
            <h2 className="text-2xl font-bold text-gray-800 sm:text-3xl md:text-4xl">
              آراء عملائنا
            </h2>
            <p className="mt-2 text-gray-600 sm:mt-4 sm:text-lg">
              ما يقولونه عن خدماتنا
            </p>
          </div>
          <Swiper
            spaceBetween={30}
            slidesPerView={1}
            breakpoints={{
              768: { slidesPerView: 2, spaceBetween: 40 },
              1024: { slidesPerView: 3, spaceBetween: 50 },
            }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            modules={[Autoplay, Pagination]}
            className="mySwiper pb-8" // Padding bottom for pagination dots
          >
            {testimonials.map((testimonial) => (
              <SwiperSlide key={testimonial.id} className="h-auto">
                <div className="flex flex-col h-full rounded-xl bg-white p-6 shadow-lg sm:p-8">
                  <div className="mb-4 flex items-center sm:mb-6">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full sm:h-16 sm:w-16 flex-shrink-0">
                      <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="mr-3 sm:mr-4 flex-grow">
                      <h4 className="text-sm font-bold text-gray-800 sm:text-base">
                        {testimonial.name}
                      </h4>
                      <p className="text-xs text-gray-600 sm:text-sm">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                  <p className="text-base italic text-gray-700 sm:text-lg flex-grow">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                  <div className="mt-3 flex sm:mt-4">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="h-4 w-4 text-yellow-400 sm:h-5 sm:w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>
      {/* CTA Section */}
      <section
        className="bg-purple-900 py-12 text-white sm:py-16"
        ref={addToRefs}
      >
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl md:text-4xl">
            مستعد لبدء التخطيط لمناسبتك؟
          </h2>
          <p className="mx-auto mb-6 max-w-2xl text-base sm:mb-8 sm:text-lg md:text-xl">
            تواصل معنا اليوم وسنساعدك في جعل مناسبتك لا تنسى
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href={"/contact"} // Link to your contact page
              className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-rose-600 transition hover:bg-gray-100 sm:px-8 sm:py-3 sm:text-base"
            >
              احجز استشارة مجانية
            </Link>
          </div>
        </div>
      </section>

      {/* Edit Service Modal */}
      {isServiceModalOpen && editingService && (
        <EditServiceModal
          isOpen={isServiceModalOpen}
          onClose={handleCloseServiceModal}
          service={editingService}
          onSave={handleSaveServiceChanges}
        />
      )}

      {/* Edit Slide Modal */}
      {isSlideModalOpen && (
        <EditSlideModal
          isOpen={isSlideModalOpen}
          onClose={handleCloseSlideModal}
          slide={editingSlide}
          isNew={isNewSlide}
          onSave={handleSaveSlideChanges}
        />
      )}
    </div>
  );
}
