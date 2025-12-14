// src/components/OfferCard.jsx
import Link from "next/link";

export default function OfferCard({ offer }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-48 bg-gray-200 overflow-hidden">
        <img 
          src={offer.imageUrl || "/images/default-offer.jpg"} 
          alt={offer.title}
          className="w-full h-full object-contain"
        />
      </div>
      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{offer.title}</h3>
        <p className="text-gray-600 mb-4 line-clamp-2">{offer.description}</p>
        <div className="flex justify-between items-center">
          <span className="font-bold text-blue-600">{offer.price} ر.س</span>
          <Link 
            href={`/offers/${offer.id}`}
            className="text-blue-500 hover:text-blue-700 font-medium"
          >
            عرض التفاصيل
          </Link>
        </div>
      </div>
    </div>
  );
}