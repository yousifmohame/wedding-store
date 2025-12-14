// src/components/ServiceCategoryCard.jsx
import Link from "next/link";
import Image from "next/image";

const ServiceCategoryCard = ({ category }) => {
  return (
    <Link href={category.href}>
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col border border-gray-200 hover:border-[#D4AF37]">
        <div className="relative h-48 bg-gray-100">
          <Image
            src={`/images/category-${category.id}.jpg`}
            alt={category.title}
            fill
            className="object-cover"
            priority
          />
          {category.featured && (
            <div className="absolute top-3 left-3 bg-[#D4AF37] text-white px-3 py-1 rounded-full text-xs font-bold">
              مميز
            </div>
          )}
        </div>
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-center mb-3">
            <div className="bg-[#F5E8C7] p-2 rounded-full mr-3">
              <Image
                src={category.icon}
                alt={category.title}
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </div>
            <h3 className="text-xl font-bold text-gray-800">{category.title}</h3>
          </div>
          <p className="text-gray-600 mb-4 flex-1">{category.description}</p>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{category.count} مزود خدمة</span>
            <button className="text-[#D4AF37] hover:text-[#B8860B] font-medium">
              تصفح الخدمات →
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ServiceCategoryCard;