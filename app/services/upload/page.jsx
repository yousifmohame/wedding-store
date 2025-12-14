"use client";
import { useState, useEffect } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { auth, db, storage } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

// Service categories
const serviceCategories = [
  {
    id: 1,
    title: "قاعات الأفراح",
    type: "venue",
    fields: [
      { name: "capacity", label: "السعة (عدد الأشخاص)", type: "number", required: true },
      { name: "locationType", label: "نوع القاعة", type: "select", options: ["داخلية", "خارجية", "كوكتيل"], required: true },
      { name: "parking", label: "موقف سيارات", type: "checkbox" },
      { name: "pricePerPerson", label: "متوسط سعر الشخص (درهم)", type: "number" }
    ]
  },
  {
    id: 2,
    title: "المطابخ والمطاعم",
    type: "catering",
    fields: [
      { name: "cuisineType", label: "نوع المطبخ", type: "select", options: ["عربي", "آسيوي", "غربي", "مشاوي", "حلويات", "متنوع"], required: true },
      { name: "serviceType", label: "نوع الخدمة", type: "select", options: ["توصيل", "خدمة داخل المطعم", "خدمة مناسبات"], required: true },
      { name: "minOrder", label: "الحد الأدنى للطلب (درهم)", type: "number" }
    ]
  },
  {
    id: 3,
    title: "خدمات السفر وشهر العسل",
    type: "travel",
    fields: [
      { name: "destination", label: "الوجهة", type: "text", required: true },
      { name: "duration", label: "المدة (أيام)", type: "number", required: true },
      { name: "packageType", label: "نوع الباقة", type: "select", options: ["فندقية", "سياحية", "تذاكر طيران", "شاملة"], required: true }
    ]
  },
  {
    id: 4,
    title: "الفرق الغنائية وDJ",
    type: "entertainment",
    fields: [
      { name: "artistType", label: "نوع الفنان", type: "select", options: ["فرقة غنائية", "دي جي", "فنان منفرد"], required: true },
      { name: "musicGenre", label: "النوع الموسيقي", type: "select", options: ["عربي", "غربي", "هندي", "متنوع"], required: true },
      { name: "performanceDuration", label: "مدة الأداء (ساعات)", type: "number", required: true }
    ]
  },
  {
    id: 5,
    title: "خدمات التنظيم",
    type: "eventPlanning",
    fields: [
      { name: "eventType", label: "نوع المناسبة", type: "select", options: ["زفاف", "خطوبة", "حفل تخرج", "عيد ميلاد", "حفل شركة"], required: true },
      { name: "serviceScope", label: "نطاق الخدمة", type: "select", options: ["تنظيم كامل", "ديكور", "ضيافة", "إدارة الحدث"], required: true },
      { name: "teamSize", label: "عدد أعضاء الفريق", type: "number" }
    ]
  },
  {
    id: 6,
    title: "خدمات متنوعة",
    type: "miscellaneous",
    fields: [
      { name: "serviceType", label: "نوع الخدمة", type: "select", options: ["ميكب ارتست", "قساتين", "خدمات الضيافة", "توزيعات", "تأجير السيارات", "فرق استعراضية", "تصوير", "أخرى"], required: true },
      { name: "occasion", label: "نوع المناسبة", type: "text" },
      { name: "serviceDuration", label: "مدة الخدمة (ساعات)", type: "number" }
    ]
  },
  {
    id: 7,
    title: "مراكز التجميل والعيادات التجميلية",
    type: "beauty",
    fields: [
      { name: "serviceType", label: "نوع الخدمة", type: "select", options: ["عناية بالبشرة", "مكياج", "علاجات تجميلية", "مساج", "عناية بالشعر", "أظافر"], required: true },
      { name: "duration", label: "مدة الخدمة (دقائق)", type: "number", required: true },
      { name: "specialistGender", label: "جنس المختص", type: "select", options: ["أنثى", "ذكر", "لا يهم"] }
    ]
  },
  {
    id: 8,
    title: "خدمات المشاهير",
    type: "celebrities",
    fields: [
      { name: "celebrityType", label: "نوع المشهور", type: "select", options: ["ممثل", "مغني", "رياضي", "مؤثر", "إعلامي"], required: true },
      { name: "appearanceType", label: "نوع الحضور", type: "select", options: ["حفل", "إعلان", "مناسبة خاصة", "فيديو تحية"], required: true },
      { name: "appearanceDuration", label: "مدة الحضور (ساعات)", type: "number" }
    ]
  }
];

export default function UploadServicePageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <UploadServicePage />
    </Suspense>
  );
}

function UploadServicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startingPrice: "",
    categoryId: categoryId || "",
    location: "",
    features: "",
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isSupplier, setIsSupplier] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [showPackages, setShowPackages] = useState(false);

  // Initialize package fields when showPackages is true
  const [packageFields, setPackageFields] = useState({
    package1Name: "",
    package1MaxPersons: "",
    package1PricePerPerson: "",
    package1Description: "",
    package2Name: "",
    package2MaxPersons: "",
    package2PricePerPerson: "",
    package2Description: "",
    package3Name: "",
    package3MaxPersons: "",
    package3PricePerPerson: "",
    package3Description: "",
    package4Name: "",
    package4MaxPersons: "",
    package4PricePerPerson: "",
    package4Description: "",
  });

  useEffect(() => {
    if (categoryId) {
      const foundCategory = serviceCategories.find(
        (cat) => cat.id === parseInt(categoryId)
      );
      setCurrentCategory(foundCategory);
      setFormData((prev) => ({ ...prev, categoryId }));
      
      if (foundCategory && foundCategory.fields) {
        const initialFields = {};
        foundCategory.fields.forEach(field => {
          initialFields[field.name] = field.type === 'checkbox' ? false : '';
        });
        setFormData(prev => ({ ...prev, ...initialFields }));
      }
    }
  }, [categoryId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          router.push(
            `/login?redirect=/services/upload${
              categoryId ? `?categoryId=${categoryId}` : ""
            }`
          );
          return;
        }
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setIsSupplier(userData.userType === "supplier" ||"subadmin");
          setIsApproved(userData.approved === true);
          if (!["supplier", "subadmin"].includes(userData.userType)|| !userData.approved) {
            setError("يجب أن تكون مزود خدمة معتمد لإضافة خدمات جديدة");
            router.push("/services");
          }
        }
      } catch (err) {
        console.error("Error checking user status:", err);
        setError("حدث خطأ في التحقق من صلاحياتك");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, categoryId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePackageChange = (e) => {
    const { name, value } = e.target;
    setPackageFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setImageFiles(files);
      const urls = files.map(file => URL.createObjectURL(file));
      setPreviewUrls(urls);
    }
  };

  const renderDynamicFields = () => {
    if (!currentCategory || !currentCategory.fields) return null;

    return currentCategory.fields.map((field) => {
      switch (field.type) {
        case 'select':
          return (
            <div key={field.name} className="mb-4">
              <label htmlFor={field.name} className="block text-gray-700 mb-2">
                {field.label} {field.required && '*'}
              </label>
              <select
                id={field.name}
                name={field.name}
                value={formData[field.name] || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-lg text-black focus:ring-2 focus:ring-[#D4AF37] outline-none"
                required={field.required}
              >
                <option value="">اختر {field.label.toLowerCase()}</option>
                {field.options.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          );
        case 'number':
          return (
            <div key={field.name} className="mb-4">
              <label htmlFor={field.name} className="block text-gray-700 mb-2">
                {field.label} {field.required && '*'}
              </label>
              <input
                type="number"
                id={field.name}
                name={field.name}
                value={formData[field.name] || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-lg text-black focus:ring-2 focus:ring-[#D4AF37] outline-none"
                required={field.required}
                min="0"
              />
            </div>
          );
        case 'checkbox':
          return (
            <div key={field.name} className="mb-4 flex items-center">
              <input
                type="checkbox"
                id={field.name}
                name={field.name}
                checked={formData[field.name] || false}
                onChange={handleInputChange}
                className="h-5 w-5 text-[#D4AF37] focus:ring-[#D4AF37] border-gray-300 rounded"
              />
              <label htmlFor={field.name} className="mr-2 block text-gray-700">
                {field.label}
              </label>
            </div>
          );
        default:
          return (
            <div key={field.name} className="mb-4">
              <label htmlFor={field.name} className="block text-gray-700 mb-2">
                {field.label} {field.required && '*'}
              </label>
              <input
                type="text"
                id={field.name}
                name={field.name}
                value={formData[field.name] || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                required={field.required}
              />
            </div>
          );
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setUploading(true);
    try {
      const user = auth.currentUser;
      if (!user || !isSupplier || !isApproved) {
        throw new Error("غير مصرح لك بإضافة خدمات");
      }

      // Validate required fields
      if (
        !formData.name ||
        !formData.description ||
        !formData.startingPrice ||
        !formData.categoryId
      ) {
        throw new Error("الرجاء ملء جميع الحقول الأساسية المطلوبة");
      }

      // Validate required dynamic fields based on currentCategory
      if (currentCategory && currentCategory.fields) {
        for (const field of currentCategory.fields) {
          if (field.required && !formData[field.name]) {
            throw new Error(`الحقل "${field.label}" مطلوب`);
          }
        }
      }

      // Upload images
      const imageUrls = [];
      if (imageFiles.length > 0) {
        const filesToUpload = imageFiles.slice(0, 5);
        for (const file of filesToUpload) {
          const storageRef = ref(
            storage,
            `providers/${user.uid}/${Date.now()}_${file.name}`
          );
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          imageUrls.push(url);
        }
      }

      const providerData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        startingPrice: Number(formData.startingPrice),
        categoryId: Number(formData.categoryId),
        location: formData.location?.trim() || "",
        features: formData.features.split("\n").map(f => f.trim()).filter((f) => f.trim() !== ""),
        imageUrls,
        imageUrl: imageUrls.length > 0 ? imageUrls[0] : null,
        supplierId: user.uid,
        createdAt: new Date().toISOString(),
        rating: 0,
        ratingCount: 0,
        views: 0,
        status: "pending",
        currency: "AED", // إضافة العملة كدرهم إماراتي
        ...(currentCategory && currentCategory.fields
          ? currentCategory.fields.reduce((acc, field) => {
              acc[field.name] = formData[field.name];
              return acc;
            }, {})
          : {}),
      };

      // Add packages only if showPackages is true
      if (showPackages) {
        providerData.packages = [1, 2, 3, 4]
          .map(num => ({
            name: packageFields[`package${num}Name`]?.trim(),
            maxPersons: packageFields[`package${num}MaxPersons`] ? Number(packageFields[`package${num}MaxPersons`]) : null,
            pricePerPerson: packageFields[`package${num}PricePerPerson`] ? Number(packageFields[`package${num}PricePerPerson`]) : null,
            description: packageFields[`package${num}Description`]?.trim(),
            currency: "AED" // عملة الباقات
          }))
          .filter(pkg => pkg.name && pkg.maxPersons !== null);
      }

      // Add document to 'providers' collection
      await addDoc(collection(db, "providers"), providerData);

      setSuccess("تم إضافة الخدمة بنجاح! بانتظار الموافقة من الإدارة.");
      setFormData({
        name: "",
        description: "",
        startingPrice: "",
        categoryId: categoryId || "",
        location: "",
        features: "",
      });
      setPackageFields({
        package1Name: "",
        package1MaxPersons: "",
        package1PricePerPerson: "",
        package1Description: "",
        package2Name: "",
        package2MaxPersons: "",
        package2PricePerPerson: "",
        package2Description: "",
        package3Name: "",
        package3MaxPersons: "",
        package3PricePerPerson: "",
        package3Description: "",
        package4Name: "",
        package4MaxPersons: "",
        package4PricePerPerson: "",
        package4Description: "",
      });
      setImageFiles([]);
      setPreviewUrls([]);
      setShowPackages(false);

      setTimeout(() => {
        router.push(`/services/category/${providerData.categoryId}`);
      }, 2000);

    } catch (err) {
      console.error("Error uploading service:", err);
      setError(err.message || "فشل رفع الخدمة، يرجى المحاولة لاحقاً والتأكد من ملء كافة الحقول المطلوبة.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              إضافة خدمة جديدة
            </h1>
            {currentCategory && (
              <p className="text-gray-600 mt-2">
                إضافة خدمة جديدة لتصنيف:{" "}
                <span className="font-semibold">{currentCategory.title}</span>
              </p>
            )}
          </div>
          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              ✓ {success}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload - Multiple */}
            <div>
              <label className="block text-gray-700 mb-2">صور الخدمة (يمكن اختيار أكثر من صورة)</label>
              <div className="flex flex-wrap gap-4 mb-4">
                {previewUrls.length > 0 ? (
                  previewUrls.map((url, index) => (
                    <div key={index} className="relative w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={url}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center w-32 h-32 bg-gray-100 rounded-lg text-gray-400">
                    لا توجد صور
                  </div>
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="images"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  multiple
                />
                <label
                  htmlFor="images"
                  className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded cursor-pointer transition"
                >
                  اختر صوراً
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  يمكنك تحميل حتى 5 صور (يفضل 800x600 بكسل)
                </p>
              </div>
            </div>
    
            {/* Service Name */}
            <div>
              <label htmlFor="name" className="block text-gray-700 mb-2">
                اسم الخدمة *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border text-black rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                required
                maxLength={100}
              />
            </div>
    
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-gray-700 mb-2">
                وصف الخدمة *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border text-black rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                required
                maxLength={500}
              ></textarea>
            </div>
    
            {/* Starting Price */}
            <div>
              <label htmlFor="startingPrice" className="block text-gray-700 mb-2">
                السعر الأساسي (درهم إماراتي) *
              </label>
              <input
                type="number"
                id="startingPrice"
                name="startingPrice"
                value={formData.startingPrice}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border text-black rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                required
                min="0"
                step="1"
              />
            </div>
    
            {/* Category (if not pre-selected) */}
            {!categoryId && (
              <div>
                <label htmlFor="categoryId" className="block text-gray-700 mb-2">
                  التصنيف *
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={(e) => {
                    handleInputChange(e);
                    const selectedCategory = serviceCategories.find(
                      cat => cat.id === parseInt(e.target.value)
                    );
                    setCurrentCategory(selectedCategory);
                    
                    if (selectedCategory && selectedCategory.fields) {
                      const initialFields = {};
                      selectedCategory.fields.forEach(field => {
                        initialFields[field.name] = field.type === 'checkbox' ? false : '';
                      });
                      setFormData(prev => ({ ...prev, ...initialFields }));
                    }
                  }}
                  className="w-full px-4 py-2 text-black border rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                  required
                >
                  <option value="">اختر تصنيف الخدمة</option>
                  {serviceCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
    
            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-gray-700 mb-2">
                الموقع *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border text-black rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                required
                maxLength={100}
              />
            </div>
    
            {/* Features */}
            <div>
              <label htmlFor="features" className="block text-gray-700 mb-2">
                المميزات (كل ميزة في سطر)
              </label>
              <textarea
                id="features"
                name="features"
                value={formData.features}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 text-black border rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                placeholder="ميزة 1
ميزة 2
ميزة 3"
              ></textarea>
            </div>
    
            {/* Dynamic Fields based on category */}
            {renderDynamicFields()}

            {/* Packages Section - Optional */}
            <div className="border-t pt-4 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">الباقات المتاحة (اختياري)</h3>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPackages}
                    onChange={() => setShowPackages(!showPackages)}
                    className="h-4 w-4 text-[#D4AF37]  focus:ring-[#D4AF37] border-gray-300 rounded"
                  />
                  <span className="text-gray-900">إضافة باقات</span>
                </label>
              </div>

              {showPackages && (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((num) => (
                    <div key={num} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">الباقة {num}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-gray-700 text-sm mb-1">اسم الباقة</label>
                          <input
                            type="text"
                            name={`package${num}Name`}
                            value={packageFields[`package${num}Name`] || ''}
                            onChange={handlePackageChange}
                            className="w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                            placeholder={`اسم الباقة ${num}`}
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-1">الحد الأقصى لعدد الأشخاص</label>
                          <input
                            type="number"
                            name={`package${num}MaxPersons`}
                            value={packageFields[`package${num}MaxPersons`] || ''}
                            onChange={handlePackageChange}
                            className="w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                            placeholder="الحد الأقصى"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-1">سعر الفرد (درهم)</label>
                          <input
                            type="number"
                            name={`package${num}PricePerPerson`}
                            value={packageFields[`package${num}PricePerPerson`] || ''}
                            onChange={handlePackageChange}
                            className="w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                            placeholder="سعر الشخص"
                            min="0"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-gray-700 text-sm mb-1">وصف الباقة</label>
                        <textarea
                          name={`package${num}Description`}
                          value={packageFields[`package${num}Description`] || ''}
                          onChange={handlePackageChange}
                          rows={2}
                          className="w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                          placeholder={`وصف الباقة ${num}`}
                        ></textarea>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={uploading}
                className={`w-full py-3 px-6 rounded-lg font-medium text-white ${
                  uploading
                    ? "bg-[#B8860B] cursor-not-allowed"
                    : "bg-[#D4AF37] hover:bg-[#B8860B]"
                }`}
              >
                {uploading ? "جاري رفع الخدمة..." : "إضافة الخدمة"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}