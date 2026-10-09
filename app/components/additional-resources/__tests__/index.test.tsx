import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AdditionalResources } from '../index';
import { describe, it, expect } from 'vitest';

describe('AdditionalResources', () => {
  const mockResources = [
    {
      title: 'Test Resource 1',
      image: 'https://example.com/image1.jpg',
      url: '/test-resource-1',
    },
    {
      title: 'Test Resource 2',
      image: 'https://example.com/image2.jpg',
      url: '/test-resource-2',
    },
  ];

  it('renders the correct heading', () => {
    render(
      <MemoryRouter>
        <AdditionalResources type='button' resources={mockResources} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Additional Resources')).toBeInTheDocument();
  });

  it('renders buttons with correct titles and URLs', () => {
    render(
      <MemoryRouter>
        <AdditionalResources type='button' resources={mockResources} />
      </MemoryRouter>,
    );

    mockResources.forEach((resource) => {
      const button = screen.getByText(resource.title);
      expect(button).toBeInTheDocument();
      expect(button.closest('a')).toHaveAttribute('href', resource.url);
    });
  });

  it('renders the correct number of buttons', () => {
    render(
      <MemoryRouter>
        <AdditionalResources type='button' resources={mockResources} />
      </MemoryRouter>,
    );
    const buttons = screen.getAllByRole('link');
    expect(buttons).toHaveLength(mockResources.length);
  });

  it("renders cards when type is 'card'", () => {
    render(
      <MemoryRouter>
        <AdditionalResources type='card' resources={mockResources} />
      </MemoryRouter>,
    );

    mockResources.forEach((resource) => {
      const card = screen.getByText(resource.title);
      expect(card).toBeInTheDocument();
      expect(card.closest('a')).toHaveAttribute('href', resource.url);

      const image = screen.getByAltText(resource.title);
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', resource.image);
    });
  });

  it('renders the correct number of cards', () => {
    render(
      <MemoryRouter>
        <AdditionalResources type='card' resources={mockResources} />
      </MemoryRouter>,
    );
    const cards = screen.getAllByRole('link');
    expect(cards).toHaveLength(mockResources.length);
  });

  it('defaults to button type when no type is specified', () => {
    render(
      <MemoryRouter>
        <AdditionalResources type='button' resources={mockResources} />
      </MemoryRouter>,
    );
    const buttons = screen.getAllByRole('link');
    expect(buttons).toHaveLength(mockResources.length);
  });
});
