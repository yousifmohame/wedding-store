// src/app/admin/supplier-approvals/page.jsx
"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SupplierApprovals() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Check admin status and fetch pending suppliers
  useEffect(() => {
    const checkAdminAndFetchSuppliers = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.push("/admin/login");
          return;
        }

        // Check if user is admin - FIXED QUERY SYNTAX
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("uid", "==", user.uid));
        const userDoc = await getDocs(q);
        
        if (userDoc.empty || !userDoc.docs[0].data().isAdmin) {
          router.push("/admin/unauthorized");
          return;
        }

        // Fetch pending suppliers
        const suppliersQuery = query(
          collection(db, "users"),
          where("userType", "==", "supplier"),
          where("approved", "==", false)
        );
        const querySnapshot = await getDocs(suppliersQuery);
        const suppliersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSuppliers(suppliersData);
      } catch (err) {
        console.error("Error fetching suppliers:", err);
        setError("Failed to load supplier data");
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetchSuppliers();
  }, [router]);

  const handleApproval = async (supplierId, approved) => {
    try {
      await updateDoc(doc(db, "users", supplierId), {
        approved,
        reviewedAt: new Date().toISOString(),
        reviewedBy: auth.currentUser.uid
      });

      // Update local state
      setSuppliers(suppliers.filter(s => s.id !== supplierId));
      
      // TODO: Send approval/denial email to supplier
    } catch (err) {
      console.error("Error updating supplier status:", err);
      setError("Failed to update supplier status");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">طلبات الموردين الجدد</h1>
          <Link 
            href="/admin/dashboard"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            العودة للوحة التحكم
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {suppliers.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-600">لا توجد طلبات جديدة للمراجعة</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      اسم المنشأة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      نوع الخدمة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      البريد الإلكتروني
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الجوال
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاريخ التسجيل
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {supplier.businessName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {supplier.displayName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {supplier.businessType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {supplier.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {supplier.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(supplier.createdAt).toLocaleDateString("ar-SA")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleApproval(supplier.id, true)}
                            className="text-green-600 hover:text-green-900 bg-green-100 px-3 py-1 rounded"
                          >
                            قبول
                          </button>
                          <button
                            onClick={() => handleApproval(supplier.id, false)}
                            className="text-red-600 hover:text-red-900 bg-red-100 px-3 py-1 rounded"
                          >
                            رفض
                          </button>
                          <Link
                            href={`/admin/suppliers/${supplier.id}`}
                            className="text-blue-600 hover:text-blue-900 bg-blue-100 px-3 py-1 rounded"
                          >
                            تفاصيل
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}