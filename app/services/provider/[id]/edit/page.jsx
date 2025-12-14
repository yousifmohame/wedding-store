"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import Image from "next/image";

export default function EditServicePage() {
  const { id } = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startingPrice: "",
    location: "",
    features: "",
    capacity: "",
  });
  const [packages, setPackages] = useState([]);
  const [currentImage, setCurrentImage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push(`/login?redirect=/services/provider/${id}/edit`);
        return;
      }
  
      try {
        // Fetch provider data
        const providerRef = doc(db, "providers", id);
        const providerSnap = await getDoc(providerRef);
  
        if (!providerSnap.exists()) {
          setError("مزود الخدمة غير موجود");
          setLoading(false);
          return;
        }
  
        const providerData = providerSnap.data();
  
        // Fetch user data
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
  
        if (!userSnap.exists()) {
          setError("المستخدم غير موجود");
          setLoading(false);
          return;
        }
  
        const userData = userSnap.data();
  
        const isAdmin = userData.role === "admin"; // Assume you have a "role" field in users collection
  
        // Check if current user is the owner or an admin
        if (user.uid !== providerData.supplierId && !isAdmin) {
          setError("غير مصرح لك بتعديل هذه الخدمة");
          setLoading(false);
          return;
        }
  
        setIsOwner(true);
        setCurrentImage(providerData.imageUrl || "");
        setPackages(providerData.packages || []);
        setFormData({
          name: providerData.name || "",
          description: providerData.description || "",
          startingPrice: providerData.startingPrice?.toString() || "",
          location: providerData.location || "",
          features: providerData.features?.join("\n") || "",
          capacity: providerData.capacity?.toString() || "",
        });
      } catch (err) {
        console.error("Error fetching provider or user:", err);
        setError("حدث خطأ أثناء جلب بيانات الخدمة أو المستخدم");
      } finally {
        setLoading(false);
      }
    });
  
    return () => unsubscribe();
  }, [id, router]);
  

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setCurrentImage("");
  };

  const handlePackageChange = (index, field, value) => {
    const updatedPackages = [...packages];
    updatedPackages[index][field] = value;
    setPackages(updatedPackages);
  };

  const addNewPackage = () => {
    setPackages([
      ...packages,
      {
        name: "",
        description: "",
        pricePerPerson: "",
        maxPersons: "",
      },
    ]);
  };

  const removePackage = (index) => {
    const updatedPackages = [...packages];
    updatedPackages.splice(index, 1);
    setPackages(updatedPackages);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setUploading(true);

    try {
      const user = auth.currentUser;
      if (!user || !isOwner) {
        throw new Error("غير مصرح لك بتعديل هذه الخدمة");
      }

      // Validate required fields
      if (!formData.name || !formData.description || !formData.startingPrice) {
        throw new Error("الرجاء ملء جميع الحقول المطلوبة");
      }

      // Validate packages if they exist
      if (packages.length > 0) {
        for (const pkg of packages) {
          if (!pkg.name || !pkg.pricePerPerson || !pkg.maxPersons) {
            throw new Error("الرجاء ملء جميع حقول الباقات المطلوبة");
          }
        }
      }

      let imageUrl = currentImage;

      // Handle image upload if new image was selected
      if (imageFile) {
        // Delete old image if exists
        if (currentImage) {
          try {
            const oldImageRef = ref(storage, currentImage);
            await deleteObject(oldImageRef);
          } catch (err) {
            console.warn("Could not delete old image:", err);
          }
        }

        // Upload new image
        const storageRef = ref(storage, `services/${user.uid}/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      // Prepare package data
      const formattedPackages = packages.map(pkg => ({
        name: pkg.name.trim(),
        description: pkg.description.trim(),
        pricePerPerson: Number(pkg.pricePerPerson),
        maxPersons: Number(pkg.maxPersons),
      }));

      // Update provider document
      await updateDoc(doc(db, "providers", id), {
        name: formData.name.trim(),
        description: formData.description.trim(),
        startingPrice: Number(formData.startingPrice),
        location: formData.location.trim(),
        features: formData.features.split('\n').filter(f => f.trim() !== ''),
        capacity: formData.capacity ? Number(formData.capacity) : null,
        packages: formattedPackages,
        imageUrl,
        updatedAt: new Date().toISOString(),
        currency: "AED",
      });

      router.push(`/services/provider/${id}?edit=success`);
    } catch (err) {
      console.error("Error updating service:", err);
      setError(err.message || "فشل تحديث الخدمة، يرجى المحاولة لاحقاً");
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800">{error}</h1>
        <Link 
          href={`/services/provider/${id}`} 
          className="mt-4 text-[#D4AF37] hover:text-[#B8860B]"
        >
          العودة إلى صفحة الخدمة
        </Link>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">تعديل الخدمة</h1>
            <Link 
              href={`/services/provider/${id}`}
              className="text-[#D4AF37] hover:text-[#B8860B] text-sm"
            >
              العودة إلى صفحة الخدمة
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block text-gray-700 mb-2">صورة الخدمة</label>
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="relative w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  ) : currentImage ? (
                    <Image
                      src={currentImage}
                      alt="Current"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      لا توجد صورة
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <input
                      type="file"
                      id="image"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="image"
                      className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded cursor-pointer transition"
                    >
                      {currentImage || previewUrl ? "تغيير الصورة" : "اختر صورة"}
                    </label>
                  </div>
                  {(currentImage || previewUrl) && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-red-600 text-sm hover:text-red-800"
                    >
                      إزالة الصورة
                    </button>
                  )}
                  <p className="text-xs text-gray-500">
                    يفضل صورة بحجم 800x600 بكسل
                  </p>
                </div>
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
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
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
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                required
                maxLength={500}
              ></textarea>
            </div>

            {/* Starting Price (only shown if no packages exist) */}
            {packages.length === 0 && (
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
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                  required
                  min="0"
                  step="1"
                />
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
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
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
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                placeholder="ميزة 1
ميزة 2
ميزة 3"
              ></textarea>
            </div>

            {/* Capacity */}
            <div>
              <label htmlFor="capacity" className="block text-gray-700 mb-2">
                السعة (إن وجدت)
              </label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                min="0"
                step="1"
              />
            </div>

            {/* Packages Section */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">الباقات</h2>
                <button
                  type="button"
                  onClick={addNewPackage}
                  className="text-[#D4AF37] hover:text-[#B8860B] text-sm font-medium"
                >
                  + إضافة باقة جديدة
                </button>
              </div>

              {packages.length === 0 ? (
                <p className="text-gray-500 text-sm">لا توجد باقات مضافة</p>
              ) : (
                <div className="space-y-4">
                  {packages.map((pkg, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">الباقة {index + 1}</h3>
                        <button
                          type="button"
                          onClick={() => removePackage(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          حذف
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-700 text-sm mb-1">اسم الباقة *</label>
                          <input
                            type="text"
                            value={pkg.name}
                            onChange={(e) => handlePackageChange(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 text-sm mb-1">سعر الفرد (درهم) *</label>
                          <input
                            type="number"
                            value={pkg.pricePerPerson}
                            onChange={(e) => handlePackageChange(index, 'pricePerPerson', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                            min="0"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 text-sm mb-1">الحد الأقصى للأشخاص *</label>
                          <input
                            type="number"
                            value={pkg.maxPersons}
                            onChange={(e) => handlePackageChange(index, 'maxPersons', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                            min="1"
                            required
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-gray-700 text-sm mb-1">وصف الباقة</label>
                        <textarea
                          value={pkg.description}
                          onChange={(e) => handlePackageChange(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
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
                {uploading ? "جاري حفظ التعديلات..." : "حفظ التعديلات"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}