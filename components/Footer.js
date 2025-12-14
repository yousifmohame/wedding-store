import Link from "next/link";
import React, { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
// Import updateDoc for saving changes
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// --- Helper: Edit Icon SVG ---
const EditIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);

// --- Helper: Contact Icon ---
const ContactIcon = ({ children }) => (
  <span className="ms-2 text-purple-800">{children}</span>
);

// --- Simple Modal Component ---
const EditModal = ({
  isOpen,
  onClose,
  fieldLabel,
  initialValue,
  onSave,
  isSaving,
}) => {
  const [value, setValue] = useState(initialValue);

  // Update local state if initialValue changes (e.g., opening modal for different field)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  if (!isOpen) return null;

  const handleSaveClick = () => {
    if (!isSaving) {
      onSave(value); // Pass the updated value back to the parent
    }
  };

  // Determine input type based on label (basic example)
  const isTextarea = fieldLabel.includes("العنوان");

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Modal Content */}
      <div
        className="bg-gradient-to-br from-[#5e3482] to-[#3b1e54] p-6 rounded-lg shadow-xl w-full max-w-md border border-[#5e3482] text-white"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
        dir="rtl" // Ensure RTL for modal content
      >
        <h3 className="text-xl font-semibold mb-4">تعديل {fieldLabel}</h3>
        <div className="mb-4">
          <label
            htmlFor="edit-value"
            className="block text-sm font-medium text-purple-100 mb-1"
          >
            القيمة الجديدة:
          </label>
          {isTextarea ? (
            <textarea
              id="edit-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md bg-[#3b1e54]/50 border border-[#5e3482] text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder={`أدخل ${fieldLabel} الجديد`}
            />
          ) : (
            <input
              type={
                fieldLabel.includes("البريد")
                  ? "email"
                  : fieldLabel.includes("الهاتف")
                  ? "tel"
                  : "text"
              }
              id="edit-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[#3b1e54]/50 border border-[#5e3482] text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder={`أدخل ${fieldLabel} الجديد`}
            />
          )}
        </div>
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 space-x-reverse">
          {" "}
          {/* space-x-reverse for RTL */}
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white transition duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="px-4 py-2 rounded-md bg-white hover:bg-gray-200 text-[#3b1e54] font-semibold transition duration-150 focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50 flex items-center"
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin -ms-1 me-2 h-5 w-5 text-[#5e3482]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                جار الحفظ...
              </>
            ) : (
              "حفظ التغييرات"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Footer() {
  // State for contact info, loading, and errors
  const [contactInfo, setContactInfo] = useState({
    phone: "",
    email: "",
    address: "",
  }); // Initialize empty
  const [isLoading, setIsLoading] = useState(true); // Still loading initially
  const [error, setError] = useState(null);

  // State for user and admin status
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- State for Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null); // e.g., 'Phone', 'Email', 'Address'
  const [editingValue, setEditingValue] = useState(""); // Current value for the field being edited
  const [isSavingModal, setIsSavingModal] = useState(false); // Loading state for save button
  const [modalError, setModalError] = useState(null); // Error message inside modal if save fails

  // --- Effect to listen for Auth changes ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setIsAdmin(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Effect to fetch user role ---
  useEffect(() => {
    const fetchUserRole = async () => {
      setIsAdmin(false); // Reset first
      if (user?.uid) {
        const userDocRef = doc(db, "users", user.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists() && userDocSnap.data().role === "admin") {
            setIsAdmin(true);
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
        }
      }
    };
    fetchUserRole();
  }, [user]);

  // --- Effect to Fetch contact details ---
  useEffect(() => {
    const fetchContactDetails = async () => {
      setIsLoading(true); // Set loading true when fetching starts
      setError(null);
      const docRef = doc(db, "settings", "contactDetails");
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setContactInfo({
            phone: data.phone || "غير متوفر",
            email: data.email || "غير متوفر",
            address: data.address || "غير متوفر",
          });
        } else {
          setError("لم يتم العثور على تفاصيل الاتصال.");
          setContactInfo({
            phone: "غير متوفر",
            email: "غير متوفر",
            address: "غير متوفر",
          });
        }
      } catch (err) {
        console.error("Error fetching contact details:", err);
        setError("حدث خطأ أثناء تحميل بيانات الاتصال.");
        setContactInfo({ phone: "خطأ", email: "خطأ", address: "خطأ" });
      } finally {
        setIsLoading(false); // Set loading false when fetching finishes
      }
    };
    fetchContactDetails();
  }, []); // Runs once on mount

  // --- Function to Open Modal ---
  const handleEditClick = (field, currentValue) => {
    setEditingField(field); // e.g., 'Phone'
    setEditingValue(currentValue); // Set initial value in modal
    setModalError(null); // Clear previous modal errors
    setIsModalOpen(true); // Open the modal
  };

  // --- Function to Close Modal ---
  const handleCloseModal = () => {
    if (isSavingModal) return; // Don't close if saving
    setIsModalOpen(false);
    setEditingField(null);
    setEditingValue("");
    setModalError(null);
  };

  // --- Function to Save Changes to Firestore ---
  const handleSaveChanges = async (newValue) => {
    if (!editingField || newValue === editingValue) {
      // No changes or no field selected
      handleCloseModal();
      return;
    }

    setIsSavingModal(true); // Show saving indicator
    setModalError(null); // Clear previous errors

    // Map display field name to Firestore field key
    const fieldMap = {
      Phone: "phone",
      Email: "email",
      Address: "address",
    };
    const firestoreField = fieldMap[editingField];

    if (!firestoreField) {
      setModalError("حقل غير معروف.");
      setIsSavingModal(false);
      return;
    }

    const docRef = doc(db, "settings", "contactDetails");

    try {
      // Update the specific field in Firestore
      await updateDoc(docRef, {
        [firestoreField]: newValue,
      });

      // Update local state immediately for UI feedback
      setContactInfo((prevInfo) => ({
        ...prevInfo,
        [firestoreField]: newValue,
      }));

      handleCloseModal(); // Close modal on successful save
    } catch (err) {
      console.error("Error updating contact details:", err);
      setModalError("فشل حفظ التغييرات. الرجاء المحاولة مرة أخرى.");
      // Keep modal open to show error
    } finally {
      setIsSavingModal(false); // Hide saving indicator
    }
  };

  return (
    <>
      {" "}
      {/* Use Fragment to allow modal rendering alongside footer */}
      <footer className="bg-gradient-to-b from-white to-white py-8 text-[#5e3482] sm:py-12 border-t border-[#5e3482]/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 text-center md:grid-cols-4">
            {/* Section 1: Brand */}
            <div className="text-center">
              <h3 className="mb-3 text-lg font-bold text-[#5e3482] sm:text-xl">
                متجر الزفاف والمناسبات
              </h3>
              <p className="text-sm text-purple-800 sm:text-base leading-relaxed">
                المكان الأمثل لتجد كل ما تحتاجه ليومك المميز. نقدم مجموعة واسعة
                من الخدمات لنجعل احتفالك لا يُنسى.
              </p>
              <img
                src="/images/logo.png"
                className="mt-4 inline-block h-auto max-h-16 w-auto"
                alt="Logo"
              />
            </div>

            {/* Section 2: Quick Links */}
            <div>
              <h4 className="mb-4 text-base font-semibold text-[#5e3482] sm:text-lg">
                روابط سريعة
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/"
                    className="text-sm text-purple-800 hover:text-white transition-colors duration-200"
                  >
                    الصفحة الرئيسية
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services"
                    className="text-sm text-purple-800 hover:text-white transition-colors duration-200"
                  >
                    الخدمات
                  </Link>
                </li>
                <li>
                  <Link
                    href="/offers"
                    className="text-sm text-purple-800 hover:text-white transition-colors duration-200"
                  >
                    العروض
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-purple-800 hover:text-white transition-colors duration-200"
                  >
                    تواصل معنا
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-purple-800 hover:text-white transition-colors duration-200"
                  >
                    الشروط و الأحكام 
                  </Link>
                </li>
              </ul>
            </div>

            {/* Section 3: Services Sample */}
            <div>
              <h4 className="mb-4 text-base font-semibold text-[#5e3482] sm:text-lg">
                خدماتنا
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/services/category/1"
                    className="text-sm text-purple-800 hover:text-white transition-colors duration-200"
                  >
                    قاعات الأفراح
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services/category/7"
                    className="text-sm text-purple-800 hover:text-white transition-colors duration-200"
                  >
                    خدمات التجميل
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services/category/4"
                    className="text-sm text-purple-800 hover:text-white transition-colors duration-200"
                  >
                    الفرق الغنائية
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services/category/2"
                    className="text-sm text-purple-800 hover:text-white transition-colors duration-200"
                  >
                    الضيافة والولائم
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services/category/5"
                    className="text-sm text-purple-800 hover:text-white transition-colors duration-200"
                  >
                    التنسيق والديكور
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services"
                    className="text-sm text-[#5e3482] hover:text-purple-200 font-medium transition-colors duration-200 mt-2 block"
                  >
                    عرض الكل
                  </Link>
                </li>
              </ul>
            </div>

            {/* Section 4: Contact Info */}
            <div>
              <h4 className="mb-4 text-base font-semibold text-[#5e3482] sm:text-lg">
                تواصل معنا
              </h4>
              {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
              <ul className="space-y-3 text-sm text-purple-800 sm:text-base">
                {/* Phone */}
                <li className="flex items-center justify-center min-h-[24px]">
                  {" "}
                  {/* Min height for stability */}
                  <ContactIcon>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </ContactIcon>
                  <a
                    href={
                      contactInfo.phone && !contactInfo.phone.includes(" ")
                        ? `tel:${contactInfo.phone}`
                        : "#"
                    }
                    className="hover:text-white transition-colors duration-200"
                  >
                    {isLoading ? "..." : contactInfo.phone}
                  </a>
                  {isAdmin &&
                    !isLoading &&
                    contactInfo.phone !== "غير متوفر" &&
                    contactInfo.phone !== "خطأ" && ( // Show edit only if admin and data loaded ok
                      <button
                        onClick={() =>
                          handleEditClick("Phone", contactInfo.phone)
                        } // Pass field name and current value
                        className="ms-2 p-1 text-yellow-800 hover:text-white focus:outline-none focus:ring-1 focus:ring-white rounded-full"
                        aria-label="تعديل رقم الهاتف"
                      >
                        {" "}
                        <EditIcon />{" "}
                      </button>
                    )}
                </li>
                {/* Email */}
                <li className="flex items-center justify-center min-h-[24px]">
                  <ContactIcon>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </ContactIcon>
                  <a
                    href={
                      contactInfo.email && contactInfo.email.includes("@")
                        ? `mailto:${contactInfo.email}`
                        : "#"
                    }
                    className="hover:text-white transition-colors duration-200"
                  >
                    {isLoading ? "..." : contactInfo.email}
                  </a>
                  {isAdmin &&
                    !isLoading &&
                    contactInfo.email !== "غير متوفر" &&
                    contactInfo.email !== "خطأ" && (
                      <button
                        onClick={() =>
                          handleEditClick("Email", contactInfo.email)
                        }
                        className="ms-2 p-1 text-yellow-800 hover:text-white focus:outline-none focus:ring-1 focus:ring-white rounded-full"
                        aria-label="تعديل البريد الإلكتروني"
                      >
                        {" "}
                        <EditIcon />{" "}
                      </button>
                    )}
                </li>
                {/* Address */}
                <li className="flex items-start justify-center min-h-[24px]">
                  <ContactIcon>
                    <svg
                      className="h-5 w-5 flex-shrink-0 mt-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </ContactIcon>
                  <span className="leading-relaxed text-right flex-1">
                    {" "}
                    {/* Added flex-1 to allow wrapping */}
                    {isLoading ? "..." : contactInfo.address}
                  </span>
                  {isAdmin &&
                    !isLoading &&
                    contactInfo.address !== "غير متوفر" &&
                    contactInfo.address !== "خطأ" && (
                      <button
                        onClick={() =>
                          handleEditClick("Address", contactInfo.address)
                        }
                        className="ms-2 p-1 text-yellow-800 hover:text-white focus:outline-none focus:ring-1 focus:ring-white rounded-full flex-shrink-0 mt-1"
                        aria-label="تعديل العنوان"
                      >
                        {" "}
                        <EditIcon />{" "}
                      </button>
                    )}
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright Section */}
          <div className="mt-10 border-t border-[#5e3482]/50 pt-6 text-center text-sm text-purple-500 sm:mt-12 sm:pt-8">
            <p>
              © {new Date().getFullYear()} متجر الزفاف والمناسبات. جميع الحقوق
              محفوظة.
            </p>
          </div>
        </div>
      </footer>
      {/* Render the Modal */}
      <EditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        fieldLabel={
          editingField === "Phone"
            ? "رقم الهاتف"
            : editingField === "Email"
            ? "البريد الإلكتروني"
            : editingField === "Address"
            ? "العنوان"
            : ""
        }
        initialValue={editingValue}
        onSave={handleSaveChanges}
        isSaving={isSavingModal}
        // You could pass modalError here to display it inside the modal if needed
      />
      {/* Display Modal Error if any (optional, could be inside modal too) */}
      {modalError && isModalOpen && (
        <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-[70] bg-red-600 text-white px-4 py-2 rounded-md shadow-lg">
          {modalError}
        </div>
      )}
    </>
  );
}
