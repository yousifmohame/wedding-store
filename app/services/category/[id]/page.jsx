"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { auth, db, storage } from "@/lib/firebase";
import { collection, query, where, doc, getDoc, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";

const EditProviderModal = ({ provider, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: provider.name,
    description: provider.description,
    startingPrice: provider.startingPrice,
    taxRate: provider.taxRate || 0,
    serviceTax: provider.serviceTax || 0,
    features: provider.features?.join('\n') || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'taxRate' || name === 'serviceTax' || name === 'startingPrice' ? 
        Math.max(0, parseFloat(value) || 0) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...provider,
      ...formData,
      features: formData.features.split('\n').filter(f => f.trim()),
      taxRate: parseFloat(formData.taxRate) || 0,
      serviceTax: parseFloat(formData.serviceTax) || 0,
      startingPrice: parseFloat(formData.startingPrice) || 0
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">تعديل مزود الخدمة</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-1">اسم مزود الخدمة</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1">الوصف</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1">السعر الأساسي (ر.س)</label>
                <input
                  type="number"
                  name="startingPrice"
                  value={formData.startingPrice}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-1">ضريبة القيمة المضافة (%)</label>
                <input
                  type="number"
                  name="taxRate"
                  value={formData.taxRate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1">ضريبة الخدمة (%)</label>
                <input
                  type="number"
                  name="serviceTax"
                  value={formData.serviceTax}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              <div></div>
            </div>

            <div>
              <label className="block text-gray-700 mb-1">المميزات (كل ميزة في سطر)</label>
              <textarea
                name="features"
                value={formData.features}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-100"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#B8860B]"
              >
                حفظ التغييرات
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const EditCategoryModal = ({ category, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: category.title,
    description: category.description,
    features: category.details.features.join('\n') || ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(category.details.image);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      let imageUrl = category.details.image;
      
      if (imageFile) {
        const storageRef = ref(storage, `categories/${category.id}/${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      onSave({
        ...category,
        title: formData.title,
        description: formData.description,
        details: {
          ...category.details,
          image: imageUrl,
          features: formData.features.split('\n').filter(f => f.trim())
        }
      });
    } catch (error) {
      console.error("Error updating category:", error);
      alert("حدث خطأ أثناء حفظ التغييرات");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">تعديل التصنيف</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-1">عنوان التصنيف</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1">الوصف</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1">صورة التصنيف</label>
              {imagePreview && (
                <div className="relative h-48 mb-4">
                  <Image
                    src={imagePreview}
                    alt="Category Preview"
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1">المميزات (كل ميزة في سطر)</label>
              <textarea
                name="features"
                value={formData.features}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-100"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#B8860B] disabled:opacity-50"
                disabled={uploading}
              >
                {uploading ? "جاري الحفظ..." : "حفظ التغييرات"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function ServiceCategoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSupplier, setIsSupplier] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [providers, setProviders] = useState([]);
  const [userLoading, setUserLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setIsSupplier(userData.userType === "supplier" || userData.userType === "subadmin");
            setIsApproved(userData.approved === true);
            setIsAdmin(userData.role === "admin" || userData.role === "subadmin");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      setUserLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCategoryAndProviders = async () => {
      try {
        setLoading(true);
        
        // Fetch category from Firestore 'home' collection
        const categoryRef = doc(db, "home", id);
        const categorySnap = await getDoc(categoryRef);
        
        if (categorySnap.exists()) {
          const categoryData = categorySnap.data();
          setCategory({
            id: categorySnap.id,
            title: categoryData.title,
            description: categoryData.description,
            details: {
              image: categoryData.image || "/images/placeholder.png",
              description: categoryData.description || "No description available",
              features: categoryData.features || []
            }
          });
          
          // Fetch providers for this category
          const providersRef = collection(db, "providers");
          const q = query(providersRef, where("categoryId", "==", id));
          const querySnapshot = await getDocs(q);
          
          const providersData = [];
          querySnapshot.forEach((doc) => {
            providersData.push({ 
              id: doc.id, 
              ...doc.data(),
              taxRate: doc.data().taxRate || 0,
              serviceTax: doc.data().serviceTax || 0
            });
          });
          
          setProviders(providersData);
        } else {
          setCategory(null);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndProviders();
  }, [id]);

  const handleAddService = () => {
    router.push(`/services/upload?categoryId=${id}`);
  };

  const handleEditCategory = () => {
    setEditingCategory(category);
  };

  const handleSaveCategory = async (updatedCategory) => {
    try {
      const categoryRef = doc(db, "home", updatedCategory.id);
      await updateDoc(categoryRef, {
        title: updatedCategory.title,
        description: updatedCategory.description,
        image: updatedCategory.details.image,
        features: updatedCategory.details.features
      });
      
      setCategory(updatedCategory);
      setEditingCategory(null);
      alert("تم تحديث التصنيف بنجاح");
    } catch (error) {
      console.error("Error updating category:", error);
      alert("حدث خطأ أثناء تحديث التصنيف");
    }
  };

  const handleEditProvider = (provider) => {
    setEditingProvider(provider);
  };

  const handleSaveProvider = async (updatedProvider) => {
    try {
      const providerRef = doc(db, "providers", updatedProvider.id);
      await updateDoc(providerRef, {
        name: updatedProvider.name,
        description: updatedProvider.description,
        startingPrice: updatedProvider.startingPrice,
        taxRate: updatedProvider.taxRate,
        serviceTax: updatedProvider.serviceTax,
        features: updatedProvider.features
      });
      
      setProviders(prev => prev.map(p => 
        p.id === updatedProvider.id ? updatedProvider : p
      ));
      setEditingProvider(null);
      alert("تم تحديث مزود الخدمة بنجاح");
    } catch (error) {
      console.error("Error updating provider:", error);
      alert("حدث خطأ أثناء حفظ التغييرات");
    }
  };

  const handleDeleteProvider = async (providerId) => {
    if (confirm("هل أنت متأكد من حذف مزود الخدمة هذا؟")) {
      try {
        await deleteDoc(doc(db, "providers", providerId));
        setProviders(prev => prev.filter(p => p.id !== providerId));
        alert("تم حذف مزود الخدمة بنجاح");
      } catch (error) {
        console.error("Error deleting provider:", error);
        alert("حدث خطأ أثناء محاولة الحذف");
      }
    }
  };

  const calculateTotalPrice = (price, taxRate, serviceTax) => {
    const numericPrice = parseFloat(price) || 0;
    const numericTaxRate = parseFloat(taxRate) || 0;
    const numericServiceTax = parseFloat(serviceTax) || 0;
    return (numericPrice * (1 + (numericTaxRate + numericServiceTax) / 100)).toFixed(2);
  };

  if (loading || userLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800">الصفحة غير موجودة</h1>
        <Link href="/services" className="mt-4 text-[#D4AF37] hover:text-[#B8860B]">
          العودة إلى صفحة الخدمات
        </Link>
      </div>
    );
  }

  return (
    <div>
      <NavBar />
      <div dir="rtl" className="min-h-screen bg-gray-50 py-8 font-sans">
        <div className="container mx-auto px-4">
          {/* Category Banner with Edit Button */}
          <div className="relative h-64 md:h-80 rounded-xl overflow-hidden mb-8">
            <Image
              src={category.details.image}
              alt={category.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <h1 className="text-3xl md:text-4xl font-bold text-white">{category.title}</h1>
            </div>
            {(isAdmin || isSupplier) && (
              <div className="absolute top-4 left-4 z-10">
                <button
                  onClick={handleEditCategory}
                  className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition"
                  title="تعديل التصنيف"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between mb-6">
            {(isAdmin || (isSupplier && isApproved)) && (
              <button
                onClick={handleAddService}
                className="bg-[#D4AF37] hover:bg-[#B8860B] text-white px-6 py-3 rounded-lg font-medium flex items-center"
              >
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {isAdmin ? "إضافة خدمة جديدة" : "إضافة خدمة"}
              </button>
            )}
          </div>

          {/* Category Content */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">عن هذه الخدمة</h2>
            <p className="text-gray-600 mb-6">{category.details.description}</p>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">المميزات:</h3>
            <ul className="space-y-2 mb-6">
              {category.details.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-[#D4AF37] mr-2">•</span>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="bg-[#F5E8C7] p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">كيفية الحجز</h3>
              <p className="text-gray-700">
                يمكنك تصفح مزودي الخدمة أدناه واختيار ما يناسبك، ثم الضغط على زر الحجز واتباع التعليمات.
              </p>
            </div>
          </div>

          {/* Service Providers */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">مزودو الخدمة ({providers.length})</h2>
            </div>
            
            {providers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {providers.map((provider) => (
                  <div key={provider.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow relative">
                    {(isAdmin || (isSupplier && isApproved)) && (
                      <div className="absolute top-2 left-2 flex gap-2 z-10">
                        <button 
                          onClick={() => handleEditProvider(provider)}
                          className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition"
                          title="تعديل"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteProvider(provider.id)}
                          className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                          title="حذف"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    <div className="relative h-48 bg-gray-100">
                      {provider.imageUrl ? (
                        <Image
                          src={provider.imageUrl}
                          alt={provider.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          لا توجد صورة
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{provider.name}</h3>
                      <div className="flex items-center mb-3">
                        <div className="flex text-[#D4AF37]">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-gray-500 text-sm mr-1">({provider.ratingCount || 0} تقييم)</span>
                      </div>
                      <p className="text-gray-600 mb-4">{provider.description?.substring(0, 100)}...</p>
                      <div className="space-y-2">
                        <div>
                          <span className="font-semibold text-gray-900">السعر الأساسي: </span>
                          <span className="font-semibold text-gray-900">{provider.startingPrice || "N/A"} د.إ</span>
                        </div>
                        {provider.taxRate > 0 && (
                          <div>
                            <span className="font-semibold text-gray-900">ضريبة القيمة المضافة ({provider.taxRate}%): </span>
                            <span className="font-semibold text-gray-900">{(provider.startingPrice * provider.taxRate / 100).toFixed(2)} د.إ</span>
                          </div>
                        )}
                        {provider.serviceTax > 0 && (
                          <div>
                            <span className="font-semibold text-gray-900">رسوم الخدمة ({provider.serviceTax}%): </span>
                            <span className="font-semibold text-gray-900">{(provider.startingPrice * provider.serviceTax / 100).toFixed(2)} د.إ</span>
                          </div>
                        )}
                        <div className="font-bold text-[#D4AF37]">
                          السعر الإجمالي: {calculateTotalPrice(provider.startingPrice, provider.taxRate, provider.serviceTax)} د.إ
                        </div>
                      </div>
                      <div className="mt-4">
                        <Link 
                          href={`/services/provider/${provider.id}`}
                          className="w-full block text-center bg-[#D4AF37] hover:bg-[#B8860B] text-white px-4 py-2 rounded-lg text-sm"
                        >
                          عرض التفاصيل
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600">لا يوجد مزودو خدمة متاحون حاليًا في هذا التصنيف</p>
                {(isAdmin || (isSupplier && isApproved)) && (
                  <button
                    onClick={handleAddService}
                    className="mt-4 bg-[#D4AF37] hover:bg-[#B8860B] text-white px-6 py-2 rounded-lg"
                  >
                    كن أول مزود خدمة في هذا التصنيف
                  </button>
                )}
              </div>
            )}
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">أسئلة شائعة</h2>
            <div className="space-y-4">
              {[
                {
                  question: "كيف أختار القاعة المناسبة لزفافي؟",
                  answer: "نوصي بالنظر إلى عدة عوامل مثل السعة، الموقع، التصميم، والخدمات المقدمة. يمكنك استخدام عوامل التصفية في أعلى الصفحة لمساعدتك في الاختيار."
                },
                {
                  question: "هل يمكنني زيارة القاعة قبل الحجز؟",
                  answer: "نعم، معظم مزودي الخدمة يسمحون بزيارة القاعة بعد التنسيق معهم. يمكنك التواصل معهم مباشرة عبر المنصة."
                },
                {
                  question: "ما هي سياسة الإلغاء أو التعديل؟",
                  answer: "تختلف سياسات الإلغاء حسب مزود الخدمة. يمكنك الاطلاع على الشروط الخاصة بكل مزود في صفحة التفاصيل."
                }
              ].map((faq, index) => (
                <div key={index} className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />

      {/* Edit Provider Modal */}
      {editingProvider && (
        <EditProviderModal
          provider={editingProvider}
          onClose={() => setEditingProvider(null)}
          onSave={handleSaveProvider}
        />
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={handleSaveCategory}
        />
      )}
    </div>
  );
}