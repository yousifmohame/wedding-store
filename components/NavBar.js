"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Transition } from "@headlessui/react";

// Button styles (unchanged)
const buttonBaseStyle =
  "block text-white font-bold py-2 px-4 rounded-full cursor-pointer transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#5e3482] focus:ring-offset-2 focus:ring-offset-white";
const buttonGradientStyle =
  "bg-gradient-to-br from-[#3b1e54] to-[#5e3482] shadow-md hover:shadow-[0_0_10px_rgba(94,52,130,0.4)] hover:-translate-y-0.5";
const buttonTextStyle = "[text-shadow:1px_1px_2px_rgba(0,0,0,0.4)]";
const iconButtonStyle =
  "flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#3b1e54] to-[#5e3482] shadow-md hover:shadow-[0_0_10px_rgba(94,52,130,0.4)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5e3482] focus:ring-offset-2 focus:ring-offset-white";

export default function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [servicesCategories, setServicesCategories] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const router = useRouter();

  // Fetch services categories from Firestore
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const servicesCollection = collection(db, "home");
        const snapshot = await getDocs(servicesCollection);

        const servicesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          href: `/services/category/${doc.id}`,
        }));

        setServicesCategories(servicesData);
      } catch (error) {
        console.error("Error fetching services:", error);
        // Fallback to default services if Firestore fails
        setServicesCategories([
          {
            id: "1",
            title: "قاعات الأفراح",
            description: "أفضل القاعات لإقامة حفل زفافك",
            icon: "/images/wedding-hall-icon.png",
            href: "/services/category/1",
          },
          // ... other fallback services
        ]);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, []);

  // Fetch user data and cart count
  useEffect(() => {
    const fetchUserData = async (userId) => {
      try {
        if (!userId) {
          setUserData(null);
          setCartCount(0);
          return;
        }

        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData(data);
          setCartCount(Array.isArray(data.cart) ? data.cart.length : 0);
        } else {
          console.log("User document not found");
          setUserData(null);
          setCartCount(0);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserData(null);
        setCartCount(0);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserData(currentUser.uid);
      } else {
        setUserData(null);
        setCartCount(0);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsUserMenuOpen(false);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Close all menus when navigating
  const handleLinkClick = () => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsServicesMenuOpen(false);
  };

  // Filter services based on search query
  const filteredServices = servicesCategories.filter(
    (service) =>
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <nav className="h-16 md:h-20 bg-white flex items-center justify-between px-4 md:px-8 shadow-[0_4px_12px_rgba(59,30,84,0.15)] relative z-50">
      {/* Left side (becomes Right in RTL): Mobile Menu Button & Desktop Icons */}
      <div className="flex items-center">
        {/* Desktop Content */}
        <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
          {/* Logo */}
          <div className="relative transform">
            <Link
              href="/"
              onClick={handleLinkClick}
              className="block w-[75px] md:w-[90px] h-16 md:h-20"
            >
              <Image
                src="/images/logo.png"
                alt="متجر خدمات الزفاف والمناسبات"
                width={90}
                height={80}
                className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(59,30,84,0.2)]"
                priority
              />
            </Link>
          </div>

          {/* User Icon & Dropdown - Desktop */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={iconButtonStyle}
              aria-label="قائمة المستخدم"
              aria-haspopup="true"
              aria-expanded={isUserMenuOpen}
            >
              {user?.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt="User"
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
            </button>

            <Transition
              show={isUserMenuOpen}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <div className="absolute start-0 mt-2 w-48 bg-gradient-to-b from-[#3b1e54] to-[#5e3482] rounded-md shadow-xl py-1 z-50 border border-[#5e3482]">
                {user ? (
                  <>
                    {user.displayName && (
                      <span className="block px-4 pt-2 pb-1 text-sm text-purple-200 truncate">
                        مرحباً, {user.displayName}
                      </span>
                    )}
                    {userData?.role === "admin" && (
                      <Link
                        href="/admin/dashboard"
                        onClick={handleLinkClick}
                        className="block px-4 py-2 text-white hover:bg-[#5e3482]/50 hover:text-white transition duration-150"
                      >
                        لوحة التحكم
                      </Link>
                    )}
                    {userData?.userType === "supplier" && (
                      <Link
                        href="/supplier/dashboard"
                        onClick={handleLinkClick}
                        className="block px-4 py-2 text-white hover:bg-[#5e3482]/50 hover:text-white transition duration-150"
                      >
                        لوحة التحكم
                      </Link>
                    )}
                    <Link
                      href="/account"
                      onClick={handleLinkClick}
                      className="block px-4 py-2 text-white hover:bg-[#5e3482]/50 hover:text-white transition duration-150"
                    >
                      حسابي
                    </Link>
                    <Link
                      href="/orders"
                      onClick={handleLinkClick}
                      className="block px-4 py-2 text-white hover:bg-[#5e3482]/50 hover:text-white transition duration-150"
                    >
                      طلباتي
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-right px-4 py-2 text-red-400 hover:bg-[#5e3482]/50 hover:text-red-300 transition duration-150"
                    >
                      تسجيل الخروج
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={handleLinkClick}
                      className="block px-4 py-2 text-white hover:bg-[#5e3482]/50 hover:text-white transition duration-150"
                    >
                      تسجيل الدخول
                    </Link>
                    <Link
                      href="/signup"
                      onClick={handleLinkClick}
                      className="block px-4 py-2 text-white hover:bg-[#5e3482]/50 hover:text-white transition duration-150"
                    >
                      إنشاء حساب
                    </Link>
                  </>
                )}
              </div>
            </Transition>
          </div>

          {/* Cart Icon - Desktop */}
          <Link
            href="/card"
            className="relative"
            onClick={handleLinkClick}
            aria-label={`سلة التسوق (${cartCount} عناصر)`}
          >
            <button className={iconButtonStyle}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </button>
            {cartCount > 0 && (
              <span className="absolute -top-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white pointer-events-none">
                {cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Cart Icon - Mobile */}
        <Link
          href="/card"
          className="relative md:hidden ms-2"
          onClick={handleLinkClick}
          aria-label={`سلة التسوق (${cartCount} عناصر)`}
        >
          <button className="flex items-center justify-center w-9 h-9 rounded-full text-[#3b1e54] p-1 focus:outline-none focus:ring-1 focus:ring-[#5e3482] hover:bg-purple-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </button>
          {cartCount > 0 && (
            <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white pointer-events-none">
              {cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* Desktop Search Section */}
      <div dir="rtl" className="relative flex items-center">
        <input
          placeholder="ابحث عن خدمات..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-[38px] w-[180px] lg:w-[250px] rounded-full border-none pe-10 ps-4 bg-gradient-to-br from-[#3b1e54] to-[#5e3482] text-white placeholder-purple-200 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.2),inset_-1px_-1px_3px_rgba(94,52,130,0.2)] outline-none transition duration-300 focus:shadow-[inset_0_0_8px_rgba(94,52,130,0.5)] text-sm"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center h-full pointer-events-none">
          <Image
            src="/images/searchicon.webp"
            alt="بحث"
            width={18}
            height={18}
            className="w-4 h-4 lg:w-[18px] lg:h-[18px] opacity-70"
          />
        </div>
      </div>

      {/* Right side (becomes Left in RTL): Desktop Menu & Mobile Hamburger */}
      <div dir="rtl" className="flex items-center">
        {/* Desktop Menu Links */}
        <div className="hidden md:flex items-center">
          <ul className="flex list-none space-x-2 lg:space-x-4">
            <li>
              <Link
                href="/"
                className={`${buttonBaseStyle} ${buttonGradientStyle} ${buttonTextStyle} text-sm lg:text-base`}
                onClick={handleLinkClick}
              >
                الرئيسية
              </Link>
            </li>
            <li>
              <Link
                href="/offers"
                className={`${buttonBaseStyle} ${buttonGradientStyle} ${buttonTextStyle} text-sm lg:text-base`}
                onClick={handleLinkClick}
              >
                العروض
              </Link>
            </li>

            {/* Services Dropdown */}
            <li
              className="relative"
              onMouseEnter={() => setIsServicesMenuOpen(true)}
              onMouseLeave={() => setIsServicesMenuOpen(false)}
            >
              <button
                className={`${buttonBaseStyle} ${buttonGradientStyle} ${buttonTextStyle} flex items-center text-sm lg:text-base`}
                aria-haspopup="true"
                aria-expanded={isServicesMenuOpen}
              >
                الخدمات
                <svg
                  className={`ms-2 h-4 w-4 transition-transform text-white ${
                    isServicesMenuOpen ? "transform rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Services Mega Menu */}
              <Transition
                show={isServicesMenuOpen}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <div className="absolute start-0 mt-2 w-[600px] bg-gradient-to-b from-[#3b1e54] to-[#5e3482] rounded-lg shadow-xl z-50 border border-[#5e3482] p-4">
                  {loadingServices ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        {filteredServices.slice(0, 6).map((service, index) => (
                          <Link
                            key={service.id}
                            href={service.href}
                            className="group flex items-start p-3 rounded-lg hover:bg-[#5e3482]/50 transition-colors duration-200"
                            onClick={handleLinkClick}
                          >
                            <div className="flex-shrink-0 bg-[#5e3482] p-2 rounded-full group-hover:bg-[#3b1e54] transition-colors duration-200">
                              <Image
                                src={
                                  service.icon ||
                                  "/images/default-service-icon.png"
                                }
                                alt=""
                                width={24}
                                height={24}
                                className="w-6 h-6 transition-all duration-200"
                              />
                            </div>
                            <div className="me-3">
                              <h3 className="text-white font-semibold group-hover:text-purple-100 transition-colors duration-200">
                                {service.title}
                              </h3>
                              <p className="text-purple-200 text-sm">
                                {service.description}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-[#5e3482]/50">
                        <Link
                          href="/services"
                          className="block text-center text-white font-medium hover:text-purple-100 transition-colors duration-200"
                          onClick={handleLinkClick}
                        >
                          عرض جميع الخدمات →
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </Transition>
            </li>
          </ul>
        </div>

        {/* Mobile Menu Button (Hamburger) */}
        <div className="md:hidden z-50">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-[#3b1e54] focus:outline-none p-2 focus:ring-1 focus:ring-[#5e3482] rounded"
            aria-label={isMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMenuOpen ? (
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Area */}
      <Transition
        show={isMenuOpen}
        enter="transition ease-out duration-300"
        enterFrom="opacity-0 -translate-y-4"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-200"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-4"
      >
        <div
          id="mobile-menu"
          className="fixed inset-0 top-16 md:top-20 bg-[#3b1e54] bg-opacity-95 backdrop-blur-sm z-40 md:hidden p-4 pt-6 overflow-y-auto"
        >
          <div className="flex flex-col items-center space-y-4 max-w-md mx-auto">
            {/* Mobile Search */}
            <div className="relative flex items-center w-full mb-4">
              <input
                placeholder="ابحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-[40px] w-full rounded-full border-none pe-10 ps-4 bg-gradient-to-br from-[#3b1e54] to-[#5e3482] text-white placeholder-purple-200 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.2),inset_-1px_-1px_3px_rgba(94,52,130,0.2)] outline-none transition duration-300 focus:shadow-[inset_0_0_8px_rgba(94,52,130,0.5)] text-sm"
              />
              <div className="absolute start-4 top-1/2 transform -translate-y-1/2 flex items-center h-full pointer-events-none">
                <Image
                  src="/images/searchicon.webp"
                  alt="بحث"
                  width={18}
                  height={18}
                  className="w-4 h-4 opacity-70"
                />
              </div>
            </div>

            {/* Main Links - Mobile */}
            <Link
              href="/"
              className={`${buttonBaseStyle} ${buttonGradientStyle} ${buttonTextStyle} w-full text-center`}
              onClick={handleLinkClick}
            >
              الصفحة الرئيسية
            </Link>

            {/* Services Links - Mobile */}
            <div className="w-full bg-[#5e3482]/20 rounded-lg p-3 space-y-2 border border-[#5e3482]/40">
              <h3 className="text-center font-semibold text-white mb-2">
                الخدمات
              </h3>
              {loadingServices ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                </div>
              ) : (
                <>
                  {filteredServices.map((service) => (
                    <Link
                      key={service.id}
                      href={service.href}
                      className="block px-4 py-2 text-purple-100 hover:text-white hover:bg-[#5e3482]/50 rounded transition duration-150 text-center"
                      onClick={handleLinkClick}
                    >
                      {service.title}
                    </Link>
                  ))}
                  <Link
                    href="/services"
                    className="block px-4 py-2 text-center font-semibold text-white hover:text-purple-100 hover:bg-[#5e3482]/50 rounded transition duration-150 mt-2"
                    onClick={handleLinkClick}
                  >
                    عرض كل الخدمات →
                  </Link>
                </>
              )}
            </div>

            <Link
              href="/offers"
              className={`${buttonBaseStyle} ${buttonGradientStyle} ${buttonTextStyle} w-full text-center`}
              onClick={handleLinkClick}
            >
              العروض
            </Link>

            {/* User Actions - Mobile */}
            <div className="w-full border-t border-[#5e3482]/50 pt-4 mt-2 space-y-3">
              {user ? (
                <>
                  {userData?.role === "admin" && (
                    <Link
                      href="/admin/dashboard"
                      className={`${buttonBaseStyle} ${buttonGradientStyle} ${buttonTextStyle} w-full text-center`}
                      onClick={handleLinkClick}
                    >
                      لوحة التحكم
                    </Link>
                  )}
                  {userData?.approved === true &&
                    userData?.role !== "admin" && (
                      <Link
                        href="/supplier/dashboard"
                        className={`${buttonBaseStyle} ${buttonGradientStyle} ${buttonTextStyle} w-full text-center`}
                        onClick={handleLinkClick}
                      >
                        لوحة التحكم
                      </Link>
                    )}
                  <Link
                    href="/account"
                    className={`${buttonBaseStyle} ${buttonGradientStyle} ${buttonTextStyle} w-full text-center`}
                    onClick={handleLinkClick}
                  >
                    حسابي
                  </Link>
                  <Link
                    href="/orders"
                    className={`${buttonBaseStyle} ${buttonGradientStyle} ${buttonTextStyle} w-full text-center`}
                    onClick={handleLinkClick}
                  >
                    طلباتي
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      handleLinkClick();
                    }}
                    className={`${buttonBaseStyle} w-full text-center bg-gradient-to-br from-red-700 to-red-900 shadow-md hover:shadow-[0_0_10px_rgba(220,38,38,0.4)] hover:-translate-y-0.5`}
                  >
                    تسجيل الخروج
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={`${buttonBaseStyle} ${buttonGradientStyle} ${buttonTextStyle} w-full text-center`}
                    onClick={handleLinkClick}
                  >
                    تسجيل الدخول
                  </Link>
                  <Link
                    href="/signup"
                    className={`${buttonBaseStyle} ${buttonGradientStyle} ${buttonTextStyle} w-full text-center`}
                    onClick={handleLinkClick}
                  >
                    إنشاء حساب
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </Transition>
    </nav>
  );
}
