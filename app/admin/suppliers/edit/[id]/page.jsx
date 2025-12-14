"use client";
import { useState, useEffect } from "react";
import { db } from "../../../../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    businessName: "",
    businessType: "",
    phone: "",
    approved: false,
  });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSupplier();
    }
  }, [id]);

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, "users", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setSupplier(data);
        setFormData({
          displayName: data.displayName || "",
          email: data.email || "",
          businessName: data.businessName || "",
          businessType: data.businessType || "",
          phone: data.phone || "",
          approved: data.approved || false,
        });
      } else {
        console.log("No such document!");
        router.push("/admin/suppliers");
      }
    } catch (error) {
      console.error("Error fetching supplier:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "users", id), formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating supplier:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>المورد غير موجود</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">تعديل بيانات المورد</h1>
          <Link
            href="/admin/suppliers"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            العودة إلى القائمة
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
              تم تحديث بيانات المورد بنجاح
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-600 text-sm mb-1">اسم المسؤول</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="w-full px-4 py-2 text-black border rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-600 text-sm mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 text-black border rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-600 text-sm mb-1">اسم المنشأة</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                className="w-full px-4 py-2 text-black border rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-600 text-sm mb-1">نوع الخدمة</label>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className="w-full px-4 py-2 text-black border rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                required
              >
                <option value="">اختر نوع الخدمة</option>
                <option value="hall">قاعات أفراح</option>
                <option value="catering">مطاعم وضيافة</option>
                <option value="beauty">مراكز تجميل</option>
                <option value="music">فرق غنائية</option>
                <option value="photography">تصوير</option>
                <option value="decoration">ديكور</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-600 text-sm mb-1">رقم الجوال</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 text-black border rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="approved"
                name="approved"
                checked={formData.approved}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="approved" className="mr-2 block text-sm text-gray-900">
                الحساب معتمد
              </label>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => router.push("/admin/suppliers")}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                حفظ التغييرات
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}