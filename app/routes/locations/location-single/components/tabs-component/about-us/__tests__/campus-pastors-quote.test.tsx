import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CampusPastorsQuote } from '../campus-pastors-quote';

const pastor = {
  email: 'pastor@example.com',
  firstName: 'Brian',
  lastName: 'Smith',
  photo: '/pastor.jpg',
};

function renderQuote({
  campusUrl,
  isSpanish = false,
}: {
  campusUrl?: string;
  isSpanish?: boolean;
}) {
  return render(
    <CampusPastorsQuote
      campusPastor={pastor}
      campusUrl={campusUrl}
      isSpanish={isSpanish}
      quote='Welcome to campus.'
      title='Christ Fellowship Jupiter'
    />,
  );
}

describe('CampusPastorsQuote', () => {
  it('labels couple-led campuses as Campus Pastors in English and Spanish', () => {
    const { rerender } = renderQuote({ campusUrl: 'jupiter' });
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(
      'Campus Pastors',
    );

    rerender(
      <CampusPastorsQuote
        campusPastor={pastor}
        campusUrl='iglesia-royal-palm-beach'
        isSpanish
        quote='Welcome to campus.'
        title='Christ Fellowship'
      />,
    );
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(
      'Pastores del Campus',
    );
  });

  it('keeps the singular label for Trinity and Online, including Spanish', () => {
    const { rerender } = renderQuote({ campusUrl: 'trinity' });
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(
      'Campus Pastor',
    );

    rerender(
      <CampusPastorsQuote
        campusPastor={pastor}
        campusUrl='cf-everywhere'
        isSpanish
        quote='Welcome to campus.'
        title='Christ Fellowship Everywhere'
      />,
    );
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(
      'Pastor del Campus',
    );
  });
});
