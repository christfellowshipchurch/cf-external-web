import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DynamicHero } from '../index';
import { describe, it, expect } from 'vitest';

describe('DynamicHero', () => {
  const defaultProps = {
    imagePath: '/test-image.jpg',
  };

  it('renders with default title from path', () => {
    const testPath = '/test-page';
    render(
      <MemoryRouter initialEntries={[testPath]}>
        <DynamicHero {...defaultProps} />
      </MemoryRouter>,
    );

    // Get the h1 element specifically
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent('Test Page');
  });

  it('renders with custom title when provided', () => {
    const customTitle = 'Custom Hero Title';
    render(
      <MemoryRouter>
        <DynamicHero {...defaultProps} customTitle={customTitle} />
      </MemoryRouter>,
    );

    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent(customTitle);
  });

  it('renders the title without a heading when titleAs is div', () => {
    // Location pages put their single <h1> in the campus info section (SEO),
    // so the hero title must not compete for it.
    render(
      <MemoryRouter>
        <DynamicHero {...defaultProps} customTitle='Hero Title' titleAs='div' />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByText('Hero Title')).toBeInTheDocument();
  });

  it('renders CTAs when provided', () => {
    const ctas = [
      { href: '/link1', title: 'CTA 1' },
      { href: '/link2', title: 'CTA 2' },
    ];

    render(
      <MemoryRouter>
        <DynamicHero {...defaultProps} ctas={ctas} />
      </MemoryRouter>,
    );

    ctas.forEach((cta) => {
      const buttons = screen.getAllByRole('button', { name: cta.title });
      // We expect 2 buttons - one for desktop and one for mobile
      expect(buttons).toHaveLength(2);
      buttons.forEach((button) => {
        expect(button).toBeInTheDocument();
        expect(button.closest('a')).toHaveAttribute('href', cta.href);
      });
    });
  });

  it('renders breadcrumbs', () => {
    render(
      <MemoryRouter>
        <DynamicHero {...defaultProps} />
      </MemoryRouter>,
    );

    // Get the breadcrumb link specifically
    const breadcrumbLink = screen.getByRole('link', { name: 'Home' });
    expect(breadcrumbLink).toBeInTheDocument();
  });

  it('renders top divider from lg when there are no CTAs', () => {
    render(
      <MemoryRouter>
        <DynamicHero {...defaultProps} />
      </MemoryRouter>,
    );

    const desktopDivider = document.querySelector(
      '[role="separator"].hidden.lg\\:block',
    );
    expect(desktopDivider).toBeInTheDocument();
    expect(desktopDivider).toHaveClass('h-[2px]');
    expect(desktopDivider).toHaveClass('bg-[#D9D9D9]');
  });

  it('renders top divider from md when CTAs are present', () => {
    const ctas = [{ href: '/x', title: 'Go' }];
    render(
      <MemoryRouter>
        <DynamicHero {...defaultProps} ctas={ctas} />
      </MemoryRouter>,
    );

    const desktopDivider = document.querySelector(
      '[role="separator"].hidden.md\\:block',
    );
    expect(desktopDivider).toBeInTheDocument();
    expect(desktopDivider).toHaveClass('h-[2px]');
    expect(desktopDivider).toHaveClass('bg-[#D9D9D9]');
  });

  it('renders mobile divider when CTAs are present', () => {
    const ctas = [{ href: '/test', title: 'Test CTA' }];
    render(
      <MemoryRouter>
        <DynamicHero {...defaultProps} ctas={ctas} />
      </MemoryRouter>,
    );

    // Find the divider by its class and role
    const mobileDivider = document.querySelector(
      '[role="separator"].md\\:hidden',
    );
    expect(mobileDivider).toBeInTheDocument();
    expect(mobileDivider).toHaveClass('h-[2px]');
    expect(mobileDivider).toHaveClass('bg-[#D9D9D9]');
  });
});
