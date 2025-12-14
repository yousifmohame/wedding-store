// src/app/terms/page.jsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export default function TermsPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = "شروط وأحكام استخدام الموقع | منصة معذوم";
  }, []);

  return (
    <div>
    <NavBar />
    <div dir="rtl" className="min-h-screen bg-[#fdfcf9] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#D4AF37] to-[#b78e2d] p-8 text-white text-center">
            <h1 className="text-4xl font-extrabold tracking-tight">شروط وأحكام استخدام الموقع</h1>
            <p className="mt-2 text-sm text-[#fffdf5]">آخر تحديث: 1 يناير 2024</p>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-10 space-y-10 text-gray-800 leading-relaxed">
            {/* Section Reusable Component */}
            {[
              {
                title: "1. المقدمة",
                content: (
                  <p>
                    مرحبًا بكم في منصة معزوم. يرجى قراءة هذه الشروط والأحكام بعناية قبل استخدام موقعنا الإلكتروني أو الخدمات المقدمة من خلاله.
                    باستخدامك للموقع، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام موقعنا.
                  </p>
                ),
              },
              {
                title: "2. تعريفات",
                content: (
                  <ul className="list-disc pr-5 space-y-2">
                    <li><strong>"المنصة"</strong> تشير إلى موقع حفلة الإلكتروني وتطبيقاته.</li>
                    <li><strong>"المستخدم"</strong> هو أي شخص يزور أو يتفاعل مع المنصة.</li>
                    <li><strong>"مقدم الخدمة"</strong> هو مزود خدمات الزفاف المسجل في المنصة.</li>
                    <li><strong>"الخدمات"</strong> تشير إلى جميع الخدمات المتعلقة بالزفاف المقدمة عبر المنصة.</li>
                  </ul>
                ),
              },
              {
                title: "3. شروط الاستخدام العامة",
                content: (
                  <ul className="list-disc pr-5 space-y-3">
                    <li>يجب أن يكون عمر المستخدم 18 عامًا على الأقل لاستخدام خدماتنا.</li>
                    <li>يجب توفير معلومات دقيقة وكاملة عند التسجيل أو طلب الخدمات.</li>
                    <li>يمنع استخدام المنصة لأي أغراض غير قانونية أو مخالفة للآداب العامة.</li>
                    <li>جميع المحتويات المنشورة على المنصة محمية بحقوق الملكية الفكرية.</li>
                    <li>نحتفظ بالحق في رفض أو إيقاف أي حساب ينتهك هذه الشروط.</li>
                  </ul>
                ),
              },
              {
                title: "4. الحجوزات والدفعات",
                content: (
                  <ul className="list-disc pr-5 space-y-3">
                    <li>جميع الحجوزات تخضع لتوفر مقدم الخدمة.</li>
                    <li>يتم الدفع إلكترونيًا عبر بوابة الدفع الآمنة الخاصة بنا.</li>
                    <li>تختلف سياسات الإلغاء والاسترجاع حسب كل مقدم خدمة.</li>
                    <li>قد يتم تطبيق رسوم إدارية في حالات الإلغاء.</li>
                    <li>يجب مراجعة تفاصيل الحجز بعناية قبل التأكيد النهائي.</li>
                  </ul>
                ),
              },
              {
                title: "5. الخصوصية والأمان",
                content: (
                  <>
                    <p className="mb-3">
                      نحن نلتزم بحماية خصوصيتك. يرجى مراجعة سياسة الخصوصية الخاصة بنا لفهم كيفية جمعنا واستخدامنا لمعلوماتك الشخصية.
                    </p>
                    <ul className="list-disc pr-5 space-y-2">
                      <li>نستخدم تقنيات تشفير متقدمة لحماية بياناتك.</li>
                      <li>لا نبيع أو نشارك معلوماتك الشخصية مع أطراف ثالثة دون موافقتك.</li>
                      <li>أنت مسؤول عن الحفاظ على سرية معلومات تسجيل الدخول الخاصة بك.</li>
                    </ul>
                  </>
                ),
              },
              {
                title: "6. مسؤولية المستخدم",
                content: (
                  <ul className="list-disc pr-5 space-y-3">
                    <li>أنت مسؤول عن جميع الأنشطة التي تتم باستخدام حسابك.</li>
                    <li>يجب الإبلاغ فورًا عن أي استخدام غير مصرح به لحسابك.</li>
                    <li>يمنع نسخ أو إعادة نشر أي محتوى من المنصة دون إذن كتابي.</li>
                    <li>أنت توافق على استخدام المنصة وفقًا للقوانين المحلية والدولية.</li>
                  </ul>
                ),
              },
              {
                title: "7. التعديلات على الشروط",
                content: (
                  <p>
                    نحتفظ بالحق في تعديل هذه الشروط والأحكام في أي وقت. سيتم نشر أي تغييرات على هذه الصفحة مع تحديث تاريخ "آخر تحديث".
                    يعد استمرارك في استخدام المنصة بعد نشر التغييرات موافقة منك على الشروط المعدلة.
                  </p>
                ),
              },
              {
                title: "8. الاتصال بنا",
                content: (
                  <p>
                    إذا كانت لديك أي أسئلة حول هذه الشروط والأحكام، يرجى الاتصال بنا :
                    
                     عبر نموذج الاتصال الموجود في قسم "تواصل معنا" بالموقع.
                  </p>
                ),
              },
            ].map((section, index) => (
              <motion.section
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl font-bold text-[#D4AF37] mb-4">{section.title}</h2>
                <div className="text-justify text-[17px]">{section.content}</div>
              </motion.section>
            ))}

            <div className="pt-6 border-t border-gray-200 text-center">
              <button
                onClick={() => router.back()}
                className="px-8 py-3 text-lg bg-[#D4AF37] text-white rounded-full shadow-md hover:bg-[#b78e2d] transition duration-300"
              >
                العودة
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
    <Footer />
    </div>
  );
}
