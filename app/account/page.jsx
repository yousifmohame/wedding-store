// src/app/account/page.jsx
"use client";
import { useState, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  Timestamp // Import Timestamp
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject // Import deleteObject for potentially removing profile image on account delete
} from "firebase/storage";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
  deleteUser
} from "firebase/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { ToastContainer, toast } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS

// --- Helper Function to format Firestore Timestamps ---
const formatDate = (timestamp) => {
  if (!timestamp) return "N/A";
  // Assuming timestamp is a Firebase Timestamp object
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toLocaleDateString('ar-EG', { // Example: Arabic locale for Egypt
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  // Fallback for string dates (though Timestamps are preferred)
  try {
    return new Date(timestamp).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return "Invalid Date";
  }
};


export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null); // Store the user object
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phone: "",
    businessName: "",
    businessType: "",
    location: "",
    emailNotificationsEnabled: true // Add setting field
  });
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("/images/default-avatar.jpg"); // Default

  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState(null);

  // --- Fetch User Data ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true); // Set loading true at the start of auth change
      if (!currentUser) {
        router.push("/login?redirect=/account");
        return;
      }

      setUser(currentUser); // Store the authenticated user object

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData(data);
          setFormData({ // Initialize form with fetched data
            displayName: data.displayName || "",
            email: data.email || "",
            phone: data.phone || "",
            businessName: data.businessName || "",
            businessType: data.businessType || "",
            location: data.location || "",
            emailNotificationsEnabled: data.emailNotificationsEnabled !== undefined ? data.emailNotificationsEnabled : true // Default to true if not set
          });
          setPreviewUrl(data.photoURL || "/images/default-avatar.jpg");
          setError(null); // Clear previous errors
        } else {
           setError("المستخدم غير موجود في قاعدة البيانات.");
           setUserData(null); // Ensure userData is null if doc doesn't exist
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("فشل تحميل معلومات الحساب.");
        setUserData(null); // Clear data on error
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]); // Dependency on router

  // --- Fetch Offers (for Suppliers) ---
  useEffect(() => {
    if (activeTab === "offers" && userData?.userType === "supplier" && user) {
      const fetchOffers = async () => {
        setOffersLoading(true);
        setOffersError(null);
        try {
          const offersQuery = query(collection(db, "services"), where("supplierId", "==", user.uid));
          const querySnapshot = await getDocs(offersQuery);
          const fetchedOffers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setOffers(fetchedOffers);
        } catch (err) {
          console.error("Error fetching offers:", err);
          setOffersError("فشل تحميل قائمة الخدمات.");
        } finally {
          setOffersLoading(false);
        }
      };
      fetchOffers();
    }
  }, [activeTab, userData, user]); // Rerun when tab changes or user data is available

  // --- Fetch Bookings (for Suppliers) ---
  useEffect(() => {
    if (activeTab === "bookings" && userData?.userType === "supplier" && user) {
      const fetchBookings = async () => {
        setBookingsLoading(true);
        setBookingsError(null);
        try {
           // Assuming bookings are stored with supplierId
           const bookingsQuery = query(collection(db, "bookings"), where("supplierId", "==", user.uid));
           // You might want to add orderBy('bookingDate', 'desc') for example
           const querySnapshot = await getDocs(bookingsQuery);
           const fetchedBookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
           setBookings(fetchedBookings);
        } catch (err) {
           console.error("Error fetching bookings:", err);
           setBookingsError("فشل تحميل قائمة الحجوزات.");
        } finally {
           setBookingsLoading(false);
        }
      };
      fetchBookings();
    }
  }, [activeTab, userData, user]); // Rerun when tab changes or user data is available


  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file); // Store the file object
      setPreviewUrl(URL.createObjectURL(file)); // Create temporary URL for preview
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) {
        toast.error("المستخدم غير مسجل!");
        return;
    }
    setLoading(true); // Use main loading indicator for profile save
    try {
      let photoURL = userData?.photoURL || null; // Keep existing URL if no new image

      // Upload new image if selected
      if (profileImage) {
        const storageRef = ref(storage, `profile-images/${user.uid}`);
        // Consider deleting the old image if it exists and photoURL is not null
        // if (photoURL) { try { await deleteObject(ref(storage, photoURL)); } catch (delErr) { console.warn("Old image delete failed", delErr); }}

        await uploadBytes(storageRef, profileImage);
        photoURL = await getDownloadURL(storageRef);
        setPreviewUrl(photoURL); // Update preview with final URL
        setProfileImage(null); // Clear the file state after upload
      }

      // Data to update in Firestore
      const updatedData = {
        ...formData, // Includes displayName, phone, businessName, etc.
        photoURL, // Updated photo URL
        email: user.email, // Ensure email is from the auth user object, not the form (it's disabled anyway)
        updatedAt: Timestamp.now() // Use Firestore Timestamp
      };

      // Remove email from update object if it hasn't changed (or shouldn't be updatable here)
      // delete updatedData.email; // Good practice as email changes often need verification

      await updateDoc(doc(db, "users", user.uid), updatedData);

      // Update local state to reflect changes immediately
      setUserData(prev => ({ ...prev, ...updatedData }));
      setEditMode(false);
      toast.success("تم تحديث الملف الشخصي بنجاح!");

    } catch (err) {
      console.error("Error updating profile:", err);
      setError("فشل تحديث الملف الشخصي. حاول مرة أخرى.");
      toast.error("فشل تحديث الملف الشخصي.");
    } finally {
      setLoading(false);
    }
  };

  // --- Settings Actions ---

  const handleChangePassword = async () => {
    if (!user?.email) {
      toast.error("لا يمكن إرسال بريد إعادة التعيين بدون بريد إلكتروني مسجل.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.info(`تم إرسال رابط إعادة تعيين كلمة المرور إلى ${user.email}`);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast.error(`فشل إرسال البريد: ${error.message}`);
    }
  };

  const handleUpdateNotificationSetting = async (isEnabled) => {
      if (!user) return;
      try {
          await updateDoc(doc(db, "users", user.uid), {
              emailNotificationsEnabled: isEnabled,
              updatedAt: Timestamp.now()
          });
          // Update local state as well
          setUserData(prev => ({ ...prev, emailNotificationsEnabled: isEnabled }));
          setFormData(prev => ({ ...prev, emailNotificationsEnabled: isEnabled }));
          toast.success(`تم ${isEnabled ? 'تفعيل' : 'إلغاء تفعيل'} إشعارات البريد الإلكتروني.`);
      } catch (error) {
          console.error("Error updating notification settings:", error);
          toast.error("فشل تحديث إعدادات الإشعارات.");
      }
  };


  const handleSignOut = async () => {
      if (!window.confirm("هل أنت متأكد أنك تريد تسجيل الخروج؟")) return;
      try {
          await signOut(auth);
          toast.success("تم تسجيل الخروج بنجاح.");
          router.push('/login'); // Redirect to login page after sign out
      } catch (error) {
          console.error("Error signing out:", error);
          toast.error("حدث خطأ أثناء تسجيل الخروج.");
      }
  };

  const handleDeleteAccount = async () => {
    if (!user) {
        toast.error("المستخدم غير مسجل!");
        return;
    }

    // *** SECURITY WARNING: Re-authentication is STRONGLY recommended before deletion ***
    // This requires asking the user for their password or using a recent sign-in credential.
    // Example (requires password):
    // const password = prompt("Please enter your password to confirm account deletion:");
    // if (!password) return; // User cancelled
    // try {
    //   const credential = EmailAuthProvider.credential(user.email, password);
    //   await reauthenticateWithCredential(user, credential);
    // } catch (reauthError) {
    //   toast.error("Authentication failed. Account not deleted.");
    //   console.error("Re-authentication error:", reauthError);
    //   return;
    // }
    // ************************************************************************************

    // Simple confirmation for this example (less secure)
    if (!window.confirm("تحذير! سيتم حذف حسابك وجميع بياناتك نهائياً. هل أنت متأكد من المتابعة؟")) {
      return;
    }

    setLoading(true); // Show loading indicator
    try {
        // 1. Delete Firestore document
        await deleteDoc(doc(db, "users", user.uid));

        // 2. (Optional) Delete associated data like profile image from Storage
        if (userData?.photoURL) {
            try {
                // Need to parse the URL to get the path for deletion
                const imageRef = ref(storage, userData.photoURL);
                await deleteObject(imageRef);
            } catch (storageError) {
                console.warn("Could not delete profile image:", storageError);
                // Don't block account deletion if image deletion fails
            }
        }

        // 3. (Optional but Recommended) Delete associated supplier data (services, bookings etc.)
        // This might involve Cloud Functions for robustness or multiple client-side delete operations.
        // Example: Delete services (add error handling)
        // const servicesQuery = query(collection(db, "services"), where("supplierId", "==", user.uid));
        // const servicesSnapshot = await getDocs(servicesQuery);
        // const deletePromises = servicesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        // await Promise.all(deletePromises);


        // 4. Delete Firebase Auth user - THIS IS THE LAST STEP
        await deleteUser(user);

        toast.success("تم حذف الحساب بنجاح.");
        router.push('/'); // Redirect to homepage or a confirmation page

    } catch (error) {
        console.error("Error deleting account:", error);
        toast.error(`فشل حذف الحساب: ${error.message}. قد تحتاج إلى تسجيل الدخول مرة أخرى للمحاولة.`);
        // Handle specific errors like 'auth/requires-recent-login'
        if (error.code === 'auth/requires-recent-login') {
           toast.info("يرجى تسجيل الدخول مرة أخرى قبل محاولة حذف الحساب.");
           // Optionally sign the user out here
           // await signOut(auth);
           // router.push('/login');
        }
        setLoading(false); // Stop loading on error
    }
    // No finally setLoading(false) here because successful deletion navigates away
  };


  // --- Render Logic ---
  if (loading && !userData) { // Show initial loading spinner only if no user data yet
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || !userData && !loading) { // If loading is done but still no user/userData
     return (
        <div>
            <NavBar />
            <div dir="rtl" className="min-h-screen bg-gray-50 py-8 flex justify-center items-center">
                 <div className="container mx-auto px-4 text-center">
                     <p className="text-red-600 text-xl">{error || "لا يمكن تحميل بيانات المستخدم. قد تحتاج إلى تسجيل الدخول مرة أخرى."}</p>
                     <Link href="/login" className="text-blue-600 hover:underline mt-4 inline-block">
                         الذهاب إلى صفحة تسجيل الدخول
                     </Link>
                 </div>
            </div>
            <Footer />
        </div>
     );
  }

  // Main component render
  return (
    <div>
      <NavBar />
      <ToastContainer position="bottom-right" theme="colored" rtl /> {/* Toast container */}
      <div dir="rtl" className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-white rounded-lg shadow-md p-4 h-fit">
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gold-500 mb-3">
                  <Image
                    src={previewUrl} // Use state for preview
                    alt="Profile"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Example sizes
                    className="object-cover"
                    onError={() => setPreviewUrl('/images/default-avatar.jpg')} // Fallback on error
                  />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {userData?.displayName || "المستخدم"}
                </h2>
                <p className="text-gray-500 text-sm">
                  {userData?.userType === "supplier" ? "مزود خدمة" : "عميل"}
                </p>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full text-right px-4 py-2 rounded-lg transition ${activeTab === "profile" ? "bg-blue-100 text-blue-600 font-semibold" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  الملف الشخصي
                </button>

                {userData?.userType === "supplier" && (
                  <>
                    <button
                      onClick={() => setActiveTab("offers")}
                      className={`w-full text-right px-4 py-2 rounded-lg transition ${activeTab === "offers" ? "bg-blue-100 text-blue-600 font-semibold" : "text-gray-700 hover:bg-gray-100"}`}
                    >
                      خدماتي
                    </button>
                    <button
                      onClick={() => setActiveTab("bookings")}
                      className={`w-full text-right px-4 py-2 rounded-lg transition ${activeTab === "bookings" ? "bg-blue-100 text-blue-600 font-semibold" : "text-gray-700 hover:bg-gray-100"}`}
                    >
                      الحجوزات
                    </button>
                  </>
                )}

                <button
                  onClick={() => setActiveTab("settings")}
                  className={`w-full text-right px-4 py-2 rounded-lg transition ${activeTab === "settings" ? "bg-blue-100 text-blue-600 font-semibold" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  الإعدادات
                </button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-white rounded-lg shadow-md p-6">
              {error && ( // Display general page errors
                <div className="bg-red-100 border-r-4 border-red-500 text-red-700 px-4 py-3 rounded mb-6" role="alert">
                  <p className="font-bold">خطأ</p>
                  <p>{error}</p>
                </div>
              )}

              {/* --- Profile Tab --- */}
              {activeTab === "profile" && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">الملف الشخصي</h2>
                    <div> {/* Container for buttons */}
                        {!editMode ? (
                        <button
                            onClick={() => setEditMode(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-150 ease-in-out"
                        >
                            تعديل الملف
                        </button>
                        ) : (
                        <div className="space-x-2 space-x-reverse">
                            <button
                            onClick={handleSaveProfile}
                            disabled={loading} // Disable button while saving
                            className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-150 ease-in-out ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                            {loading && activeTab === 'profile' ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                            </button>
                            <button
                            onClick={() => {
                                setEditMode(false);
                                // Reset form and preview to original data on cancel
                                setFormData({
                                    displayName: userData.displayName || "",
                                    email: userData.email || "",
                                    phone: userData.phone || "",
                                    businessName: userData.businessName || "",
                                    businessType: userData.businessType || "",
                                    location: userData.location || "",
                                    emailNotificationsEnabled: userData.emailNotificationsEnabled !== undefined ? userData.emailNotificationsEnabled : true
                                });
                                setPreviewUrl(userData.photoURL || "/images/default-avatar.jpg");
                                setProfileImage(null); // Clear any selected file
                            }}
                            disabled={loading} // Disable cancel while saving
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition duration-150 ease-in-out"
                            >
                            إلغاء
                            </button>
                        </div>
                        )}
                    </div>
                  </div>

                  {/* Profile Form (Edit Mode) */}
                  {editMode ? (
                    <div className="space-y-6">
                      {/* Image Upload and Basic Info */}
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        <div className="flex flex-col items-center flex-shrink-0">
                           <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-300 mb-3">
                             <Image
                               src={previewUrl}
                               alt="Profile Preview"
                               fill
                               sizes="128px"
                               className="object-cover"
                               onError={() => setPreviewUrl('/images/default-avatar.jpg')}
                             />
                           </div>
                           <input
                             type="file"
                             id="profileImage"
                             accept="image/*"
                             onChange={handleImageChange}
                             className="hidden"
                           />
                           <label
                             htmlFor="profileImage"
                             className="text-blue-600 hover:text-blue-800 cursor-pointer text-sm font-medium py-1 px-3 border border-blue-600 rounded-md hover:bg-blue-50"
                           >
                             تغيير الصورة
                           </label>
                        </div>
                        <div className="flex-1 space-y-4 w-full">
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                             <input
                               type="text"
                               name="displayName"
                               value={formData.displayName}
                               onChange={handleInputChange}
                               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition duration-150 ease-in-out"
                             />
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                             <input
                               type="email"
                               name="email"
                               value={formData.email}
                               // onChange={handleInputChange} // Keep email disabled
                               className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed focus:outline-none"
                               disabled
                               title="لا يمكن تغيير البريد الإلكتروني من هنا"
                             />
                           </div>
                         </div>
                      </div>

                      {/* Contact and Location */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال</label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="مثال: 05xxxxxxxx"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition duration-150 ease-in-out"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">الموقع</label>
                          <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            placeholder="مثال: الرياض، حي الملز"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition duration-150 ease-in-out"
                          />
                        </div>
                      </div>

                      {/* Supplier Specific Fields */}
                      {userData?.userType === "supplier" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6 mt-6">
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنشأة/العمل</label>
                              <input
                                 type="text"
                                 name="businessName"
                                 value={formData.businessName}
                                 onChange={handleInputChange}
                                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition duration-150 ease-in-out"
                              />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">نوع الخدمة</label>
                              <select
                                 name="businessType"
                                 value={formData.businessType}
                                 onChange={handleInputChange}
                                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition duration-150 ease-in-out bg-white"
                              >
                                 <option value="">اختر نوع الخدمة</option>
                                 <option value="catering">خدمات الطعام</option>
                                 <option value="venue">قاعات ومناسبات</option>
                                 <option value="photography">تصوير</option>
                                 <option value="decoration">ديكور وتنظيم</option>
                                 <option value="entertainment">ترفيه</option>
                                 <option value="other">أخرى</option>
                              </select>
                           </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Profile Display View */
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            <div className="flex-shrink-0">
                                <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-300">
                                    <Image
                                        src={previewUrl} // Display current image
                                        alt="Profile"
                                        fill
                                        sizes="128px"
                                        className="object-cover"
                                        onError={() => setPreviewUrl('/images/default-avatar.jpg')}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 space-y-4 text-center md:text-right mt-4 md:mt-0">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">{userData?.displayName || "لم يتم التعيين"}</h3>
                                    <p className="text-gray-600 text-sm">{userData?.email}</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500 font-medium">رقم الجوال</p>
                                        <p className="text-gray-800">{userData?.phone || "غير متوفر"}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 font-medium">الموقع</p>
                                        <p className="text-gray-800">{userData?.location || "غير متوفر"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {userData?.userType === "supplier" && (
                        <div className="border-t pt-6 mt-6">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">معلومات المنشأة</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500 font-medium">اسم المنشأة/العمل</p>
                                <p className="text-gray-800">{userData?.businessName || "غير متوفر"}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 font-medium">نوع الخدمة</p>
                                <p className="text-gray-800">{userData?.businessType ? // Display readable value
                                    { catering: "خدمات الطعام", venue: "قاعات ومناسبات", photography: "تصوير", decoration: "ديكور وتنظيم", entertainment: "ترفيه", other: "أخرى" }[userData.businessType] || userData.businessType
                                    : "غير متوفر"}</p>
                            </div>
                            </div>
                        </div>
                        )}
                    </div>
                  )}
                </div>
              )}

              {/* --- Offers Tab (Suppliers Only) --- */}
              {activeTab === "offers" && userData?.userType === "supplier" && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">خدماتي</h2>
                    <Link
                      href="/services" // Assuming this is the page to add/edit services
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-150 ease-in-out"
                    >
                      إدارة الخدمات
                    </Link>
                  </div>

                  {offersLoading && <p className="text-center text-gray-500">جاري تحميل الخدمات...</p>}
                  {offersError && <p className="text-center text-red-500">{offersError}</p>}

                  {!offersLoading && !offersError && (
                     offers.length > 0 ? (
                       <div className="space-y-4">
                         {offers.map((offer) => (
                           <div key={offer.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                             <div>
                               <h3 className="font-semibold text-gray-800">{offer.name || 'خدمة بدون اسم'}</h3>
                               <p className="text-sm text-gray-600">{offer.description?.substring(0, 100)}{offer.description?.length > 100 ? '...' : ''}</p>
                               <p className="text-sm text-green-600 font-medium mt-1">السعر: {offer.price ? `${offer.price} ريال` : 'غير محدد'}</p>
                             </div>
                             {/* Add Edit/Delete buttons here if needed, linking to /services/edit/[id] or similar */}
                             {/* <Link href={`/services/edit/${offer.id}`} className="text-blue-600 hover:underline text-sm">تعديل</Link> */}
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="bg-gray-100 p-8 rounded-lg text-center">
                         <p className="text-gray-600">لم تقم بإضافة أي خدمات حتى الآن.</p>
                       </div>
                     )
                  )}
                </div>
              )}

              {/* --- Bookings Tab (Suppliers Only) --- */}
                {activeTab === "bookings" && userData?.userType === "supplier" && (
                    <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">حجوزاتي</h2>

                    {bookingsLoading && <p className="text-center text-gray-500">جاري تحميل الحجوزات...</p>}
                    {bookingsError && <p className="text-center text-red-500">{bookingsError}</p>}

                    {!bookingsLoading && !bookingsError && (
                        bookings.length > 0 ? (
                        <div className="space-y-4">
                            {bookings.map((booking) => (
                            <div key={booking.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-start mb-2">
                                     <h3 className="font-semibold text-gray-800">طلب حجز لـ: {booking.serviceName || 'خدمة غير محددة'}</h3>
                                     <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                         booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                         booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                         booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                         'bg-gray-100 text-gray-700'
                                     }`}>
                                         { booking.status === 'confirmed' ? 'مؤكد' :
                                           booking.status === 'pending' ? 'قيد الانتظار' :
                                           booking.status === 'cancelled' ? 'ملغي' :
                                           booking.status || 'غير معروف'}
                                     </span>
                                </div>
                                <p className="text-sm text-gray-600">تاريخ الحجز: {formatDate(booking.bookingDate)}</p>
                                <p className="text-sm text-gray-600">اسم العميل: {booking.customerName || 'غير متوفر'}</p>
                                <p className="text-sm text-gray-600">بريد العميل: {booking.customerEmail || 'غير متوفر'}</p>
                                {/* Add more details and actions (e.g., Confirm/Cancel buttons) */}
                                {/* Example: Add buttons to update status */}
                                {/* {booking.status === 'pending' && (
                                    <div className="mt-3 space-x-2 space-x-reverse">
                                        <button className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">تأكيد</button>
                                        <button className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">إلغاء</button>
                                    </div>
                                )} */}
                            </div>
                            ))}
                        </div>
                        ) : (
                        <div className="bg-gray-100 p-8 rounded-lg text-center">
                            <p className="text-gray-600">لا توجد حجوزات حتى الآن.</p>
                        </div>
                        )
                    )}
                    </div>
                )}


              {/* --- Settings Tab --- */}
              {activeTab === "settings" && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">الإعدادات</h2>
                  <div className="space-y-8">
                    {/* Account Settings */}
                    <div className="border-b pb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">إعدادات الحساب</h3>
                      <div className="space-y-4">
                        {/* Change Password */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                          <div>
                            <p className="font-medium text-gray-900">تغيير كلمة المرور</p>
                            <p className="text-sm text-gray-500">سيتم إرسال رابط لإعادة تعيين كلمة المرور إلى بريدك الإلكتروني.</p>
                          </div>
                          <button
                            onClick={handleChangePassword}
                            className="text-sm mt-2 sm:mt-0 bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium px-4 py-1.5 rounded-lg transition duration-150 ease-in-out flex-shrink-0"
                           >
                            إرسال رابط التعيين
                          </button>
                        </div>
                        {/* Email Notifications */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div>
                                <p className="font-medium text-gray-900">إشعارات البريد الإلكتروني</p>
                                <p className="text-sm text-gray-500">تلقي تحديثات حول الحجوزات والرسائل.</p>
                            </div>
                            {/* Basic Toggle Switch using Checkbox */}
                             <label htmlFor="emailNotificationsToggle" className="flex items-center cursor-pointer mt-2 sm:mt-0 flex-shrink-0">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        id="emailNotificationsToggle"
                                        className="sr-only"
                                        name="emailNotificationsEnabled"
                                        checked={formData.emailNotificationsEnabled}
                                        onChange={(e) => {
                                            const isEnabled = e.target.checked;
                                            handleInputChange(e); // Update local form state first
                                            handleUpdateNotificationSetting(isEnabled); // Then trigger DB update
                                        }}
                                    />
                                    <div className={`block w-12 h-6 rounded-full transition ${formData.emailNotificationsEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${formData.emailNotificationsEnabled ? 'translate-x-6' : ''}`}></div>
                                </div>
                                <span className="ms-3 text-sm font-medium text-gray-700">
                                    {formData.emailNotificationsEnabled ? 'مفعلة' : 'معطلة'}
                                </span>
                            </label>
                        </div>
                      </div>
                    </div>

                    {/* Security Settings */}
                    <div className="border-b pb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">الأمان</h3>
                      <div className="space-y-4">
                        {/* Sign Out */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                           <div>
                             <p className="font-medium text-gray-900">تسجيل الخروج</p>
                             <p className="text-sm text-gray-500">تسجيل الخروج من هذا الجهاز.</p>
                           </div>
                           <button
                             onClick={handleSignOut}
                             className="text-sm mt-2 sm:mt-0 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-medium px-4 py-1.5 rounded-lg transition duration-150 ease-in-out flex-shrink-0"
                            >
                             تسجيل الخروج
                           </button>
                         </div>
                        {/* Sign Out From All Devices - Placeholder/Interpretation */}
                        {/* As Firebase client SDK doesn't directly support this, we keep the sign out button above */}
                        {/*
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">تسجيل الخروج من جميع الأجهزة</p>
                            <p className="text-sm text-gray-500">سيسجل خروجك من جميع الجلسات النشطة الأخرى (يتطلب دعم السيرفر)</p>
                          </div>
                          <button className="text-red-600 hover:text-red-800 text-sm font-medium" disabled>
                            غير متوفر حالياً
                          </button>
                        </div>
                         */}
                      </div>
                    </div>

                    {/* Delete Account */}
                    <div>
                        <h3 className="text-lg font-semibold text-red-700 mb-2">منطقة الخطر</h3>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                           <div>
                                <p className="font-medium text-red-800">حذف الحساب</p>
                                <p className="text-sm text-red-600">سيؤدي هذا إلى حذف حسابك وجميع البيانات المرتبطة به بشكل دائم ولا يمكن التراجع عنه.</p>
                            </div>
                           <button
                             onClick={handleDeleteAccount}
                             disabled={loading} // Disable if any loading is active
                             className={`text-sm mt-3 sm:mt-0 bg-red-600 text-white hover:bg-red-700 font-medium px-4 py-1.5 rounded-lg transition duration-150 ease-in-out flex-shrink-0 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                             {loading && activeTab === 'settings' ? 'جاري الحذف...' : 'حذف حسابي نهائياً'}
                           </button>
                        </div>
                    </div>

                  </div>
                </div>
              )}

            </div> {/* End Main Content */}
          </div> {/* End Flex Container */}
        </div> {/* End Container */}
      </div> {/* End Background Div */}
      <Footer />
    </div>
  );
}