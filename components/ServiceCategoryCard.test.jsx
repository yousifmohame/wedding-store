// components/ServiceCategoryCard.test.jsx
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ServiceCategoryCard from './ServiceCategoryCard';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }) => <img src={src} alt={alt} data-testid="mock-image" />,
}));

jest.mock('next/link', () => {
  return ({ children, href }) => {
    return <a href={href} data-testid="mock-link">{children}</a>;
  };
});

describe('ServiceCategoryCard Component', () => {
  const mockProps = {
    id: '123',
    image: '/images/wedding-hall.jpeg',
    name: 'قاعات الزفاف',
  };

  test('يجب أن يعرض اسم الفئة بشكل صحيح', () => {
    render(<ServiceCategoryCard {...mockProps} />);

    const categoryNameElement = screen.getByText('قاعات الزفاف');

    expect(categoryNameElement).toBeInTheDocument();
  });

  test('يجب أن يحتوي على رابط صحيح إلى صفحة الفئة', () => {
    // 1. عرض المكون
    render(<ServiceCategoryCard {...mockProps} />);
    
    const linkElement = screen.getByTestId('mock-link');

    expect(linkElement).toHaveAttribute('href', '/services/category/123');
  });

  test('يجب أن يعرض صورة بخاصية alt مناسبة', () => {
    render(<ServiceCategoryCard {...mockProps} />);

    const imageElement = screen.getByTestId('mock-image');

    expect(imageElement).toHaveAttribute('src', mockProps.image);
    expect(imageElement).toHaveAttribute('alt', mockProps.name);
  });
});