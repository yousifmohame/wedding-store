// /app/offers/[id]/page.js
"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore"; // Added Timestamp
import { auth, db } from "@/lib/firebase"; // Ensure this path is correct
import { onAuthStateChanged, User } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer"; // Ensure this path is correct
import NavBar from "@/components/NavBar"; // Ensure this path is correct

// Date Formatting Function (keep robust version)
const formatFirestoreDate = (timestamp) => {
  if (!timestamp) return "غير معروف";
  try {
    let date;
    // Handle Firestore Timestamp, JS Date, string, number
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === "string" || typeof timestamp === "number") {
      const parsed = new Date(timestamp);
      // Check if parsing resulted in a valid date
      if (!isNaN(parsed.getTime())) {
        date = parsed;
      }
    }
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    console.warn(
      "formatFirestoreDate: Unrecognized or invalid date format:",
      timestamp
    );
    return "تاريخ غير صالح";
  } catch (error) {
    console.error("Error formatting date:", error, "Input:", timestamp);
    return "خطأ في التاريخ";
  }
};

// Main Page Component
export default function OfferDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  // --- State Declarations ---
  const [offer, setOffer] = useState(null); // Data for the current offer
  const [loading, setLoading] = useState(true); // Loading state for initial fetch
  const [error, setError] = useState(null); // General error message state
  const [currentUser, setCurrentUser] = useState(null); // Firebase user object
  const [isSupplier, setIsSupplier] = useState(false); // Is the current user a supplier?
  const [isOwner, setIsOwner] = useState(false); // Does the current user own this offer?
  const [relatedOffers, setRelatedOffers] = useState([]); // Similar offers
  const [isCartAdded, setIsCartAdded] = useState(false); // Is this offer ID in the user's cart?
  const [isLoadingCart, setIsLoadingCart] = useState(false); // Loading state for Add to Cart action
  const [selectedPackages, setSelectedPackages] = useState([]); // Packages selected by the user
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // Current image index for slideshow

  // --- Authentication & User Data ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user); // Set user state (null if logged out)
      setIsSupplier(false); // Reset supplier/owner/cart status on auth change
      setIsOwner(false);
      setIsCartAdded(false);
      if (user) {
        // User is logged in, fetch their details from 'users' collection
        const userRef = doc(db, "users", user.uid);
        try {
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const userData = docSnap.data();
            // Check if user is a supplier (adjust field name 'userType' if needed)
            const supplierStatus = userData.userType === "supplier";
            setIsSupplier(supplierStatus);
            // Check cart status - Does cart contain an item with this offer ID?
            const cartItems = userData.cart || [];
            // *** Renamed field check in cart for clarity ***
            setIsCartAdded(cartItems.some((item) => item.offerId === id));
          } else {
            console.warn("User document not found for UID:", user.uid);
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setError("خطأ في جلب بيانات المستخدم"); // Inform user
        }
      }
    });
    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [id]); // Rerun if the offer ID changes

  // --- Ownership Check ---
  useEffect(() => {
    // Determine ownership only when both user and offer data are available
    // Assumes offer object has a 'supplierId' field matching the user's UID
    if (currentUser && offer?.supplierId) {
      setIsOwner(currentUser.uid === offer.supplierId);
    } else {
      setIsOwner(false); // Reset if user logs out or offer changes
    }
  }, [currentUser, offer]); // Rerun if user or offer changes

  // --- Fetch Offer Data ---
  const fetchOffer = useCallback(async () => {
    // Validate ID
    if (!id || typeof id !== "string") {
      setError("معرف العرض غير صالح.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null); // Clear previous errors before fetching
    setOffer(null);
    setRelatedOffers([]);
    setSelectedPackages([]); // Reset selections for new offer
    try {
      // Fetch document from "offers" collection
      const docRef = doc(db, "offers", id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        setError("العرض غير موجود.");
        setOffer(null); // Ensure offer state is null
      } else {
        const offerData = docSnap.data();
        // Structure the offer data, providing defaults for missing fields
        const fetchedOffer = {
          id: docSnap.id,
          name: offerData.name || "اسم غير محدد",
          description: offerData.description || "لا يوجد وصف.",
          imageUrl: offerData.imageUrl || null,
          imageUrls: Array.isArray(offerData.imageUrls)
            ? offerData.imageUrls
            : [],
          createdAt: formatFirestoreDate(offerData.createdAt), // Format date safely
          categoryId: offerData.categoryId || null,
          supplierId: offerData.supplierId || null, // Important for ownership check
          location: offerData.location || "غير محدد",
          capacity: offerData.capacity != null ? offerData.capacity : null, // Preserve null if not present
          cuisineType: offerData.cuisineType || null,
          destination: offerData.destination || null,
          rating: offerData.rating || 0,
          ratingCount: offerData.ratingCount || 0,
          startingPrice:
            offerData.startingPrice != null ? offerData.startingPrice : null, // Preserve null
          taxRate: offerData.taxRate || 0,
          serviceTax: offerData.serviceTax || 0,
          features: Array.isArray(offerData.features) ? offerData.features : [],
          packages: Array.isArray(offerData.packages) ? offerData.packages : [],
        };
        setOffer(fetchedOffer); // Set the fetched offer data
        // Fetch related offers if categoryId exists
        if (fetchedOffer.categoryId) {
          const relatedQuery = query(
            collection(db, "offers"),
            where("categoryId", "==", fetchedOffer.categoryId),
            where(doc(db, "offers", id).path, "!=", docRef.path) // Exclude self
            // limit(3) // Add limit if needed
          );
          const relatedSnapshot = await getDocs(relatedQuery);
          const relatedList = [];
          relatedSnapshot.forEach((relatedDoc) => {
            const data = relatedDoc.data();
            // Ensure related offers have minimum required data for display
            if (
              data.name &&
              data.imageUrl &&
              data.startingPrice != null
            ) {
              relatedList.push({
                id: relatedDoc.id,
                name: data.name,
                imageUrl: data.imageUrl,
                startingPrice: data.startingPrice,
                rating: data.rating || 0,
                ratingCount: data.ratingCount || 0,
              });
            }
          });
          setRelatedOffers(relatedList.slice(0, 3)); // Limit to 3 related offers
        }
      }
    } catch (err) {
      console.error("Error fetching offer data:", err);
      setError("حدث خطأ أثناء جلب بيانات العرض.");
      setOffer(null); // Ensure offer is null on error
    } finally {
      setLoading(false); // Ensure loading stops
    }
  }, [id]); // Rerun fetchOffer if the ID changes

  // Effect to trigger the fetch function
  useEffect(() => {
    fetchOffer();
  }, [fetchOffer]); // Dependency array ensures it runs when fetchOffer (and its dependency `id`) changes

  // --- Auto-Slide Logic ---
  useEffect(() => {
    let intervalId;

    if (offer?.imageUrls && offer.imageUrls.length > 1) {
      intervalId = setInterval(() => {
        setCurrentImageIndex((prevIndex) =>
          prevIndex === offer.imageUrls.length - 1 ? 0 : prevIndex + 1
        );
      }, 3000); // Change every 3 seconds
    }

    return () => clearInterval(intervalId); // Clean up the interval on unmount
  }, [offer?.imageUrls]);

  // --- Package Selection ---
  const handlePackageSelect = (pkgIndex) => {
    setError(null); // Clear potential validation errors
    const selectedPkg = offer?.packages?.[pkgIndex];
    if (!selectedPkg) return; // Exit if package doesn't exist
    setSelectedPackages((prevSelected) => {
      const existingIndex = prevSelected.findIndex(
        (item) => item.index === pkgIndex
      );
      if (existingIndex >= 0) {
        // Package exists, remove it (deselect)
        return prevSelected.filter((item) => item.index !== pkgIndex);
      } else {
        // Package not selected, add it with default count 1
        return [
          ...prevSelected,
          {
            index: pkgIndex,
            package: selectedPkg, // Store the actual package data
            personCount: 1, // Default person count
          },
        ];
      }
    });
  };

  // --- Person Count Change ---
  const handlePersonCountChange = (pkgIndex, countValue) => {
    setError(null); // Clear potential validation errors
    const targetPackage = offer?.packages?.[pkgIndex];
    if (!targetPackage) return; // Exit if package doesn't exist
    const count = parseInt(countValue, 10); // Ensure count is an integer
    const maxPersons = targetPackage.maxPersons || Infinity; // Default to Infinity if no max specified
    // Validate count
    if (isNaN(count) || count < 1) {
      setError("يجب أن يكون عدد الأشخاص 1 على الأقل.");
      // Reset to 1 for this package if invalid input
      setSelectedPackages((prev) =>
        prev.map((item) =>
          item.index === pkgIndex ? { ...item, personCount: 1 } : item
        )
      );
      return;
    }
    if (count > maxPersons) {
      setError(`الحد الأقصى للأشخاص لهذه الباقة هو ${maxPersons}.`);
      // Clamp to max persons if exceeded
      setSelectedPackages((prev) =>
        prev.map((item) =>
          item.index === pkgIndex ? { ...item, personCount: maxPersons } : item
        )
      );
      return;
    }
    // Update the person count for the correct package
    setSelectedPackages((prev) =>
      prev.map((item) =>
        item.index === pkgIndex ? { ...item, personCount: count } : item
      )
    );
  };

  // --- Add to Cart ---
  const handleAddToCart = async () => {
    setError(null); // Clear previous errors
    // 1. Check Login Status
    if (!currentUser) {
      router.push(`/login?redirect=/offers/${id}`); // Redirect to login, return to this offer
      return;
    }
    // 2. Check if Offer Data is Loaded
    if (!offer) {
      setError(
        "بيانات العرض غير متوفرة حالياً. يرجى المحاولة لاحقاً."
      );
      return;
    }
    // 3. Check Package Selection (if applicable)
    const hasPackages = offer.packages && offer.packages.length > 0;
    if (hasPackages && selectedPackages.length === 0) {
      setError("الرجاء اختيار باقة واحدة على الأقل لإضافتها للسلة.");
      return;
    }
    setIsLoadingCart(true); // Indicate loading state
    // 4. Prepare Cart Item(s)
    let itemsToAdd = [];
    if (hasPackages) {
      itemsToAdd = selectedPackages.map((item) => {
        const price = item.package.pricePerPerson || 0;
        const count = item.personCount;
        return {
          // *** Renamed serviceId to offerId ***
          offerId: offer.id,
          name: offer.name, // Offer name
          supplierId: offer.supplierId, // For potential reference
          packageName: item.package.name || `باقة ${item.index + 1}`,
          packageDescription: item.package.description || "",
          personCount: count,
          pricePerPerson: price,
          totalPrice: price * count, // Calculate total for this item
          image: offer.imageUrl, // Use main offer image for cart display
          categoryId: offer.categoryId,
          addedAt: Timestamp.now(), // Use Firestore Timestamp for consistency
          taxRate: offer.taxRate,
          serviceTax: offer.serviceTax,
        };
      });
    } else {
      // Handle adding the base offer (no packages)
      if (offer.startingPrice != null) {
        // Only add if base price exists
        itemsToAdd = [
          {
            offerId: offer.id,
            name: offer.name,
            supplierId: offer.supplierId,
            packageName: "العرض الأساسي", // Identifier for base offer
            packageDescription: offer.description,
            personCount: 1, // Base offer usually counts as 1 unit
            pricePerPerson: offer.startingPrice,
            totalPrice: offer.startingPrice,
            image: offer.imageUrl,
            categoryId: offer.categoryId,
            addedAt: Timestamp.now(),
            taxRate: offer.taxRate,
            serviceTax: offer.serviceTax,
          },
        ];
      } else {
        // Cannot add if no packages and no starting price
        setError("لا يمكن إضافة هذا العرض للسلة لعدم توفر سعر.");
        setIsLoadingCart(false);
        return;
      }
    }
    // Ensure we have something to add
    if (itemsToAdd.length === 0) {
      setError(
        "لم يتم تحديد أي عناصر لإضافتها للسلة."
      ); // Should not happen with checks above, but as safeguard
      setIsLoadingCart(false);
      return;
    }
    // 5. Update Firestore
    try {
      const userRef = doc(db, "users", currentUser.uid);
      // Use arrayUnion to add items; prevents duplicates only if the *exact* object exists
      await updateDoc(userRef, {
        cart: arrayUnion(...itemsToAdd),
      });
      setIsCartAdded(true); // Update button state
      setSelectedPackages([]); // Optional: Clear selection after adding to cart
    } catch (error) {
      console.error("Error adding to cart:", error);
      setError(
        "حدث خطأ أثناء إضافة العرض إلى السلة. يرجى المحاولة مرة أخرى."
      );
      setIsCartAdded(false); // Ensure state reflects failure if update fails
    } finally {
      setIsLoadingCart(false); // Stop loading indicator regardless of outcome
    }
  };

  // --- Contact Supplier ---
  const handleContact = () => {
    setError(null);
    if (!currentUser) {
      router.push(`/login?redirect=/offers/${id}`);
      return;
    }
    // TODO: Implement actual contact/messaging functionality
    // This could involve navigating to a chat page, opening a modal, etc.
    alert(`ميزة التواصل بخصوص "${offer?.name || "العرض"}" قيد التطوير.`);
  };

  // --- Price Calculation Helpers ---
  const calculateTotalPrice = useCallback(() => {
    return selectedPackages.reduce(
      (total, item) =>
        total + ((item.package?.pricePerPerson || 0) * item.personCount),
      0
    );
  }, [selectedPackages]); // Recalculate only when selectedPackages change

  const calculateTotalPersons = useCallback(() => {
    return selectedPackages.reduce((total, item) => total + item.personCount, 0);
  }, [selectedPackages]); // Recalculate only when selectedPackages change

  // --- Render ---
  // Loading State
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  // Error State (if fetch failed or ID invalid)
  if (error && !offer) {
    return (
      <div>
        <NavBar />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 text-center">
          <h1 className="text-xl md:text-2xl font-bold text-red-600 mb-4">
            {error}
          </h1>
          <Link
            href="/offers"
            /* Link back to offers list */
            className="mt-4 text-[#D4AF37] hover:text-[#B8860B] border border-[#D4AF37] px-4 py-2 rounded hover:bg-[#F5E8C7] transition"
          >
            العودة إلى صفحة العروض
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Offer Not Found State (after loading finished)
  if (!offer) {
    return (
      <div>
        <NavBar />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <p>العرض المطلوب غير متوفر.</p>
          <Link
            href="/offers"
            /* Link back to offers list */
            className="mt-4 text-[#D4AF37] hover:text-[#B8860B]"
          >
            العودة إلى العروض
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Main Offer Details Render
  return (
    <div>
      <NavBar />
      {/* Added a key to the main container linked to offer ID to force re-render on ID change if needed */}
      <div
        key={offer.id}
        dir="rtl"
        className="min-h-screen bg-gray-50 py-8 font-sans"
      >
        <div className="container mx-auto px-4">
          {/* --- Top Section: Image & Core Details --- */}
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8 mb-8">
            {/* Image Column */}
            <div className="w-full md:w-1/2 lg:w-1/3">
              <div className="relative aspect-square md:aspect-[4/3] rounded-xl overflow-hidden bg-gray-200 shadow">
                {/* Display the current image */}
                {offer.imageUrls && offer.imageUrls.length > 0 ? (
                  <Image
                    src={offer.imageUrls[currentImageIndex]}
                    alt={offer.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority // Prioritize loading the main image
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    لا توجد صورة متاحة
                  </div>
                )}
              </div>
              {/* Thumbnails */}
              {offer.imageUrls && offer.imageUrls.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                  {offer.imageUrls.map((url, index) => (
                    <div
                      key={index}
                      className={`relative w-16 h-16 rounded-md overflow-hidden border-2 ${
                        currentImageIndex === index
                          ? "border-[#D4AF37]"
                          : "border-transparent"
                      } hover:border-[#D4AF37] cursor-pointer flex-shrink-0 bg-gray-100`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <Image
                        src={url}
                        alt={`${offer.name} - صورة ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Details Column */}
            <div className="w-full md:w-1/2 lg:w-2/3">
              <div className="bg-white rounded-xl shadow-md p-6 h-full flex flex-col">
                {/* Header: Name and Edit Link */}
                <div className="flex justify-between items-start mb-3 gap-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800 break-words">
                    {offer.name}
                  </h1>
                  {isOwner && (
                    // Show edit link only to the owner
                    <Link
                      href={`/offers/${id}/edit`} // Link to the edit page for this offer
                      className="text-[#D4AF37] hover:text-[#B8860B] text-sm font-medium flex-shrink-0 whitespace-nowrap"
                    >
                      تعديل العرض
                    </Link>
                  )}
                </div>
                {/* Rating Display */}
                <div className="flex items-center mb-4 text-sm">
                  <div className="flex text-[#D4AF37] ml-2">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="w-5 h-5"
                        fill={i < Math.round(offer.rating) ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth={i < Math.round(offer.rating) ? 0 : 1.5}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-gray-500">
                    ({offer.ratingCount}{" "}
                    {offer.ratingCount === 1 ? "تقييم" : "تقييمات"})
                  </span>
                </div>
                {/* Description */}
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">
                    الوصف
                  </h2>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {offer.description}
                  </p>{" "}
                  {/* Allow line breaks */}
                </div>
                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5 text-sm border-t pt-4">
                  <div>
                    <h3 className="font-medium text-gray-500">الموقع</h3>
                    <p className="text-gray-800">{offer.location}</p>
                  </div>
                  {offer.capacity != null && (
                    <div>
                      <h3 className="font-medium text-gray-500">السعة</h3>
                      <p className="text-gray-800">{offer.capacity} أشخاص</p>
                    </div>
                  )}
                  {offer.cuisineType && (
                    <div>
                      <h3 className="font-medium text-gray-500">نوع المطبخ</h3>
                      <p className="text-gray-800">{offer.cuisineType}</p>
                    </div>
                  )}
                  {offer.destination && (
                    <div>
                      <h3 className="font-medium text-gray-500">الوجهة</h3>
                      <p className="text-gray-800">{offer.destination}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-500">تاريخ الإضافة</h3>
                    <p className="text-gray-800">{offer.createdAt}</p>
                  </div>
                </div>
                {/* --- Packages OR Starting Price --- */}
                {offer.packages && offer.packages.length > 0 ? (
                  // Packages Section
                  <div className="mb-4 border-t pt-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">
                      اختر الباقات
                    </h2>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {offer.packages.map((pkg, index) => (
                        <div
                          key={index}
                          className={`p-3 border rounded-lg transition-colors duration-200 ${
                            selectedPackages.some((p) => p.index === index)
                              ? "border-[#D4AF37] bg-[#fefcf4]"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-start">
                            <input
                              type="checkbox"
                              id={`pkg-${index}`}
                              checked={selectedPackages.some(
                                (p) => p.index === index
                              )}
                              onChange={() => handlePackageSelect(index)}
                              className="mt-1 ml-3 h-4 w-4 text-[#D4AF37] focus:ring-[#B8860B] border-gray-300 rounded cursor-pointer flex-shrink-0"
                            />
                            <label
                              htmlFor={`pkg-${index}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex justify-between items-center flex-wrap gap-x-2">
                                {/* Allow wrap */}
                                <h3 className="font-semibold text-gray-800">
                                  {pkg.name || `باقة ${index + 1}`}
                                </h3>
                                <span className="text-[#B8860B] font-bold text-sm whitespace-nowrap">
                                  {pkg.pricePerPerson != null
                                    ? `${pkg.pricePerPerson} درهم/للشخص`
                                    : "السعر غير محدد"}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {pkg.description || "لا يوجد وصف للباقة."}
                              </p>
                              {selectedPackages.some((p) => p.index === index) && (
                                <div className="mt-3">
                                  <label
                                    htmlFor={`count-${index}`}
                                    className="block text-sm font-medium text-gray-600 mb-1"
                                  >
                                    عدد الأشخاص (الحد الأقصى:{" "}
                                    {pkg.maxPersons || "غير محدد"})
                                  </label>
                                  <input
                                    type="number"
                                    id={`count-${index}`}
                                    min="1"
                                    max={pkg.maxPersons}
                                    value={
                                      selectedPackages.find(
                                        (p) => p.index === index
                                      )?.personCount || 1
                                    }
                                    onChange={(e) =>
                                      handlePersonCountChange(
                                        index,
                                        e.target.value
                                      )
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-black focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                                  />
                                  <div className="mt-1 text-xs text-gray-500">
                                    السعر لهذه الباقة:{" "}
                                    {(
                                      (pkg.pricePerPerson || 0) *
                                      (selectedPackages.find(
                                        (p) => p.index === index
                                      )?.personCount || 1)
                                    ).toFixed(2)}{" "}
                                    درهم
                                  </div>
                                </div>
                              )}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Starting Price Display (if no packages)
                  offer.startingPrice != null && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">
                          السعر الأساسي:
                        </span>
                        <span className="text-lg font-bold text-[#D4AF37]">
                          {offer.startingPrice} درهم إماراتي
                        </span>
                      </div>
                    </div>
                  )
                )}
                {/* Total Price Display (if packages selected) */}
                {selectedPackages.length > 0 && (
                  <div className="mt-1 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800">
                        الإجمالي للباقات المختارة:
                      </span>
                      <span className="text-xl font-bold text-green-700">
                        {calculateTotalPrice().toFixed(2)} درهم
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      لـ {calculateTotalPersons()}{" "}
                      {calculateTotalPersons() === 1 ? "شخص" : "أشخاص"}
                    </div>
                  </div>
                )}
                {/* --- Action Buttons --- */}
                <div className="mt-auto space-y-3 pt-5 border-t">
                  {/* Display Action-Related Errors (Validation, Cart Add) */}
                  {error && (
                    <p className="text-red-500 text-xs text-center mb-2">
                      {error}
                    </p>
                  )}
                  {/* Contact Button */}
                  <button
                    onClick={handleContact}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2.5 px-6 rounded-lg font-medium border border-gray-300 transition disabled:opacity-50"
                  >
                    تواصل بخصوص العرض
                  </button>
                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCart}
                    disabled={
                      // Determine disabled state
                      isCartAdded ||
                      isLoadingCart ||
                      (offer.packages?.length > 0 &&
                        selectedPackages.length === 0 &&
                        !error) || // Disable if packages exist but none selected (and no current error)
                      (offer.packages?.length === 0 && offer.startingPrice == null) // Disable if no packages and no starting price
                    }
                    className={`w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition ${
                      isCartAdded
                        ? "bg-green-100 text-green-800 cursor-default" // Already in cart style
                        : isLoadingCart ||
                          (offer.packages?.length > 0 &&
                            selectedPackages.length === 0 &&
                            !error) ||
                          (offer.packages?.length === 0 &&
                            offer.startingPrice == null)
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed" // Disabled style
                        : "bg-[#D4AF37] hover:bg-[#B8860B] text-white" // Active style
                    }`}
                  >
                    {isCartAdded ? (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>{" "}
                        تمت الإضافة للسلة
                      </>
                    ) : isLoadingCart ? (
                      "جاري الإضافة..."
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>{" "}
                        أضف إلى السلة
                      </>
                    )}
                  </button>
                  {/* Reminder about Firestore Rules */}
                  {/* For production, ensure Firestore Security Rules protect write access to the 'users' cart field. */}
                </div>
              </div>
            </div>
          </div>
          {/* --- Features Section --- */}
          {offer.features && offer.features.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                المميزات
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                {offer.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="w-4 h-4 text-[#D4AF37] mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* --- Related Offers Section --- */}
          {relatedOffers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">عروض مشابهة قد تعجبك</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {relatedOffers.map((related) => (
                       <div key={related.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow flex flex-col">
                           <Link href={`/offers/${related.id}`} className="block group">
                               <div className="relative h-48 bg-gray-100">
                                   {related.imageUrl ? (
                                       <Image src={related.imageUrl} alt={related.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" loading="lazy"/>
                                   ) : ( <div className="flex items-center justify-center h-full text-gray-400">لا توجد صورة</div> )}
                               </div>
                           </Link>
                           <div className="p-4 flex-grow flex flex-col justify-between">
                               <div>
                                   <Link href={`/offers/${related.id}`} className="block"><h3 className="text-lg font-bold text-gray-800 mb-2 hover:text-[#D4AF37] transition line-clamp-2">{related.name}</h3></Link>
                                   <div className="flex items-center mb-3 text-xs">
                                        <div className="flex text-[#D4AF37] ml-1">{[...Array(5)].map((_, i) => ( <svg key={i} className="w-4 h-4" fill={i < Math.round(related.rating) ? "currentColor" : "none"} /* ... */ > {/* Path */}</svg> ))}</div>
                                        <span className="text-gray-500">({related.ratingCount} تقييم)</span>
                                   </div>
                               </div>
                               <div className="flex justify-between items-center mt-2">
                                    <span className="font-semibold text-sm text-[#B8860B]">{related.startingPrice != null ? `يبدأ من ${related.startingPrice} درهم` : 'السعر عند الطلب'}</span>
                                    <Link href={`/offers/${related.id}`} className="bg-[#D4AF37] hover:bg-[#B8860B] text-white px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap">عرض التفاصيل</Link>
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
    </div>
  );
}