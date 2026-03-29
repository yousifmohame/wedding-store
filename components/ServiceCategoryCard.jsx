// components/ServiceCategoryCard.jsx
import Link from 'next/link';
import Image from 'next/image';

const ServiceCategoryCard = ({ id, image, name }) => {
  return (
    <Link href={`/services/category/${id}`}>
      <div className='relative shadow-xl hover:shadow-2xl transition duration-300 transform hover:scale-105'>
        <div className='w-full h-[250px]'>
          <Image
            src={image || '/images/default-category.jpg'}
            alt={name}
            layout='fill'
            objectFit='cover'
            className='rounded-xl'
          />
        </div>
        <div className='absolute inset-0 bg-black bg-opacity-30 rounded-xl flex items-center justify-center'>
          <h3 className='text-white text-3xl font-bold p-4'>{name}</h3>
        </div>
      </div>
    </Link>
  );
};

export default ServiceCategoryCard;