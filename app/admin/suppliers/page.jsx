"use client";
import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs,getDoc , updateDoc, doc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import "../../../app/globals.css"; // Assuming this imports Tailwind base/components/utilities
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import axios from "axios";

// Helper function to format currency (reuse or adapt as needed)
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-AE', {
      style: 'currency',
      currency: 'AED'
    }).format(amount);
  };

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all"); // 'all', 'approved', 'pending'

  // State to hold combined supplier data including revenue/orders
  const [supplierDetails, setSupplierDetails] = useState([]);

  // Overall stats (optional, but good for summary)
  const [totalCompletedRevenue, setTotalCompletedRevenue] = useState(0);
  const [totalCompletedOrdersCount, setTotalCompletedOrdersCount] = useState(0);

  const router = useRouter();

  // --- Main Fetching Logic ---
  useEffect(() => {
    fetchSuppliersAndRevenue();
  }, [filter, searchTerm]); // Re-fetch when filter or search term changes

  const fetchSuppliersAndRevenue = async () => {
    setLoading(true);
    try {
      // 1. Fetch Base Supplier Data based on filter and search term
      const suppliersRef = collection(db, "users");
      let q = query(suppliersRef, where("userType", "==", "supplier"));

      if (filter !== "all") {
        // Note: Firestore requires an index for composite queries (userType + approved)
        q = query(q, where("approved", "==", filter === "approved"));
      }

      const suppliersSnapshot = await getDocs(q);
      let baseSuppliers = [];
      suppliersSnapshot.forEach((doc) => {
        baseSuppliers.push({ id: doc.id, ...doc.data() });
      });

      // Apply search term filtering client-side after initial fetch
      const filteredBaseSuppliers = searchTerm
        ? baseSuppliers.filter((supplier) =>
            supplier.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supplier.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : baseSuppliers;

      // Store the base list (optional, if you need it elsewhere)
      setSuppliers(filteredBaseSuppliers);

      // 2. Fetch ALL Completed Orders ONCE
      const ordersRef = collection(db, "orders");
      const completedOrdersQuery = query(ordersRef, where("status", "==", "paymentcompleted"));
      const completedOrdersSnapshot = await getDocs(completedOrdersQuery);

      // 3. Process Orders to Calculate Revenue/Counts per Supplier
      const supplierRevenueMap = new Map(); // Use a Map for efficient lookups { supplierId => { revenue: X, orders: Set<orderId> } }
      let overallTotalRevenue = 0;
      let overallCompletedOrders = new Set(); // Use Set for unique order count

      completedOrdersSnapshot.forEach((orderDoc) => {
        const orderData = orderDoc.data();
        const orderId = orderDoc.id;

        overallTotalRevenue += orderData.totalAmount || 0; // Sum up total order amounts for overall stats
        overallCompletedOrders.add(orderId); // Add to set for overall count

        if (orderData.items && Array.isArray(orderData.items)) {
          orderData.items.forEach(item => {
            const supplierId = item.supplierId;
            const price = item.price || 0;
            const quantity = item.quantity || 1; // Default quantity to 1 if missing/zero

            // Check if this supplier is in our filtered list
            if (filteredBaseSuppliers.some(s => s.id === supplierId)) {
                // Initialize if first time seeing this supplier
                if (!supplierRevenueMap.has(supplierId)) {
                    supplierRevenueMap.set(supplierId, { revenue: 0, orders: new Set() });
                }

                const currentData = supplierRevenueMap.get(supplierId);
                currentData.revenue += price * quantity; // CORRECT revenue calculation
                currentData.orders.add(orderId); // Add order ID to the Set for this supplier

                supplierRevenueMap.set(supplierId, currentData); // Update the map
            }
          });
        }
      });

      // 4. Combine Base Supplier Data with Calculated Revenue/Order Counts
      const combinedDetails = filteredBaseSuppliers.map(supplier => {
        const revenueData = supplierRevenueMap.get(supplier.id);
        return {
          ...supplier,
          completedRevenue: revenueData?.revenue || 0,
          completedOrdersCount: revenueData?.orders?.size || 0, // Size of the Set gives unique order count
        };
      });

      setSupplierDetails(combinedDetails); // Update state with combined data for the table
      setTotalCompletedRevenue(overallTotalRevenue); // Update overall stats state
      setTotalCompletedOrdersCount(overallCompletedOrders.size); // Update overall stats state

    } catch (error) {
      console.error("Error fetching supplier data and revenue:", error);
      // Handle error appropriately (e.g., show error message to user)
      setSupplierDetails([]); // Clear data on error
    } finally {
      setLoading(false);
    }
  };

  // --- Action Handlers (Approve, Reject, Edit) ---
  const handleApprove = async (supplierId) => {
    try {
      const supplierDoc = await getDoc(doc(db, "users", supplierId));
      const supplierData = supplierDoc.data();
      
      await updateDoc(doc(db, "users", supplierId), {
        approved: true,
        approvedAt: new Date().toISOString()
      });
  
      try {
        await axios.post("/api/send-approval-email", {
          email: supplierData.email,
          name: supplierData.displayName,
          businessName: supplierData.businessName
        });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        // Continue even if email fails - you might want to show a warning
      }
  
      fetchSuppliersAndRevenue();
      alert("تم اعتماد المورد بنجاح وإرسال بريد التأكيد");
    } catch (error) {
      console.error("Error approving supplier:", error);
      alert("حدث خطأ أثناء الموافقة على المورد");
    }
  };

  const handleReject = async (supplierId) => {
     if (window.confirm("هل أنت متأكد من حذف هذا المورد؟ لا يمكن التراجع عن هذا الإجراء.")) {
        try {
            await deleteDoc(doc(db, "users", supplierId));
            // Optional: Add logic here to handle related data cleanup (e.g., services, orders if needed)
            fetchSuppliersAndRevenue(); // Refresh the data
        } catch (error) {
            console.error("Error deleting supplier:", error);
            alert("حدث خطأ أثناء حذف المورد.");
        }
     }
  };

  const handleEdit = (supplierId) => {
    router.push(`/admin/suppliers/edit/${supplierId}`);
  };

  // --- Excel Export ---
  const exportToExcel = () => {
    const dataToExport = supplierDetails.map(supplier => ({
        "اسم المنشأة": supplier.businessName || "غير محدد",
        "المسؤول": supplier.displayName || "غير محدد",
        "البريد الإلكتروني": supplier.email,
        "نوع الخدمة": supplier.businessType || "غير محدد",
        "الحالة": supplier.approved ? "معتمد" : "في انتظار الموافقة",
        "عدد الطلبات المكتملة": supplier.completedOrdersCount,
        "إجمالي الإيرادات (د.إ)": supplier.completedRevenue // Use calculated revenue
    }));

    // Add summary row
    dataToExport.push({}); // Spacer row
    dataToExport.push({
      "اسم المنشأة": "الإجمالي العام (جميع الطلبات المكتملة)",
      "عدد الطلبات المكتملة": totalCompletedOrdersCount, // Use overall state
      "إجمالي الإيرادات (د.إ)": totalCompletedRevenue, // Use overall state
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport, {
        header: [ // Define headers explicitly for order and formatting
            "اسم المنشأة",
            "المسؤول",
            "البريد الإلكتروني",
            "نوع الخدمة",
            "الحالة",
            "عدد الطلبات المكتملة",
            "إجمالي الإيرادات (د.إ)"
        ]
    });

    // Optional: Format numbers in Excel - This requires more advanced usage or SheetJS Pro
    // For basic export, numbers will be exported as numbers. Formatting is best done in Excel itself.

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الموردين");
    XLSX.writeFile(wb, "تقرير_الموردين.xlsx");
  };

  // --- Render Logic ---
  return (
    <div>
    <NavBar />
    <div dir="rtl" className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">إدارة الموردين</h1>
          <Link
            href="/admin/dashboard" // Link back to admin dashboard
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            العودة للوحة التحكم
          </Link>
        </div>

        {/* Summary Card & Export */}
        <div className="bg-blue-50 rounded-lg shadow p-6 mb-6 border border-blue-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
             <div>
                <h2 className="text-lg font-semibold text-blue-800">ملخص الطلبات المكتملة (الإجمالي العام)</h2>
                <p className="text-sm text-blue-600 mt-1">
                    إجمالي الإيرادات: <span className="font-semibold">{formatCurrency(totalCompletedRevenue)}</span>
                </p>
                <p className="text-sm text-blue-600">
                    عدد الطلبات: <span className="font-semibold">{totalCompletedOrdersCount}</span>
                </p>
            </div>
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center self-end sm:self-center"
            >
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              تصدير إلى Excel
            </button>
          </div>
        </div>

        {/* Filter/Search and Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
             <h2 className="text-xl font-semibold text-gray-700">قائمة الموردين</h2>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 sm:space-x-reverse w-full sm:w-auto"> {/* Adjusted for flex and spacing */}
                <div className="relative w-full sm:w-auto">
                    <input
                    type="text"
                    placeholder="بحث (اسم، مسؤول، بريد)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 pl-4 py-2 text-black border rounded-md focus:ring-2 focus:ring-blue-400 outline-none w-full"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </span>
                </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border text-black rounded-md focus:ring-2 focus:ring-blue-400 outline-none w-full sm:w-auto"
              >
                <option value="all">الكل</option>
                <option value="approved">معتمد</option>
                <option value="pending">في انتظار الموافقة</option>
              </select>
            </div>
          </div>

          {/* Table Display */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : supplierDetails.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {searchTerm || filter !== 'all' ? 'لا يوجد موردين يطابقون البحث أو الفلتر.' : 'لا يوجد موردين لعرضهم.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">اسم المنشأة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المسؤول</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">البريد الإلكتروني</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع الخدمة</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">طلبات مكتملة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إيرادات مكتملة</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {supplierDetails.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.businessName || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{supplier.displayName || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{supplier.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{supplier.businessType || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${supplier.approved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                          {supplier.approved ? "معتمد" : "قيد الانتظار"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">{supplier.completedOrdersCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(supplier.completedRevenue)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center items-center space-x-2 space-x-reverse"> {/* Use flex for actions */}
                          {!supplier.approved && (
                            <button onClick={() => handleApprove(supplier.id)} className="text-green-600 hover:text-green-800" title="اعتماد">✓</button>
                          )}
                          <button onClick={() => handleEdit(supplier.id)} className="text-blue-600 hover:text-blue-800" title="تعديل">✎</button>
                          <button onClick={() => handleReject(supplier.id)} className="text-red-600 hover:text-red-800" title="حذف">🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
    <Footer />
    </div>
  );
}