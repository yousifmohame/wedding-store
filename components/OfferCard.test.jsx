// components/OfferCard.test.jsx
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfferCard from './OfferCard';

jest.mock('next/link', () => {
  return ({ children, href, className }) => {
    return (
      <a href={href} className={className} data-testid="mock-link">
        {children}
      </a>
    );
  };
});

describe('OfferCard Component', () => {
  const mockOffer = {
    id: 'o456',
    imageUrl: '/images/test-offer.jpg',
    title: 'عرض المصور الذهبي',
    description: 'خصم 50% على باقة تصوير العرس الكاملة والمونتاج الاحترافي.',
    price: 3500,
  };

  test('يجب أن يعرض عنوان العرض بشكل صحيح', () => {
    render(<OfferCard offer={mockOffer} />);

    const titleElement = screen.getByText('عرض المصور الذهبي');
    expect(titleElement).toBeInTheDocument();
  });

  test('يجب أن يعرض سعر العرض مع العملة', () => {
    render(<OfferCard offer={mockOffer} />);

    const priceElement = screen.getByText('3500 ر.س');
    expect(priceElement).toBeInTheDocument();
  });

  test('يجب أن يعرض وصف العرض', () => {
    render(<OfferCard offer={mockOffer} />);
    const descriptionElement = screen.getByText(
      /خصم 50% على باقة تصوير العرس الكاملة/i
    );
    expect(descriptionElement).toBeInTheDocument();
  });

  test('يجب أن يحتوي على رابط صحيح لتفاصيل العرض', () => {
    render(<OfferCard offer={mockOffer} />);

    const linkElement = screen.getByRole('link', { name: 'عرض التفاصيل' });

    expect(linkElement).toHaveAttribute('href', `/offers/${mockOffer.id}`); // متوقع: /offers/o456
  });

  test('يجب أن يعرض الصورة بخاصية alt مناسبة', () => {
    render(<OfferCard offer={mockOffer} />);

    const imageElement = screen.getByAltText(mockOffer.title);
    expect(imageElement).toBeInTheDocument();
    expect(imageElement).toHaveAttribute('src', mockOffer.imageUrl);
  });
});