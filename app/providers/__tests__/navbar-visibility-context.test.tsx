import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  NavbarVisibilityProvider,
  useNavbarVisibility,
} from '../navbar-visibility-context';

function TestConsumer() {
  const {
    isNavbarVisible,
    setIsNavbarVisible,
    isSiteBannerVisible,
    setIsSiteBannerVisible,
    isFinderFilterOpen,
    setIsFinderFilterOpen,
    isFinderFilterOpenRef,
  } = useNavbarVisibility();
  return (
    <div>
      <span data-testid='visibility'>{String(isNavbarVisible)}</span>
      <span data-testid='banner'>{String(isSiteBannerVisible)}</span>
      <span data-testid='finder-filter'>{String(isFinderFilterOpen)}</span>
      <span data-testid='finder-filter-ref'>
        {String(isFinderFilterOpenRef.current)}
      </span>
      <button onClick={() => setIsNavbarVisible(false)}>hide</button>
      <button onClick={() => setIsNavbarVisible(true)}>show</button>
      <button onClick={() => setIsSiteBannerVisible(true)}>banner-on</button>
      <button onClick={() => setIsSiteBannerVisible(false)}>banner-off</button>
      <button onClick={() => setIsFinderFilterOpen(true)}>filter-on</button>
      <button onClick={() => setIsFinderFilterOpen(false)}>filter-off</button>
    </div>
  );
}

describe('NavbarVisibilityProvider', () => {
  it('provides default isNavbarVisible as true', () => {
    render(
      <NavbarVisibilityProvider>
        <TestConsumer />
      </NavbarVisibilityProvider>,
    );
    expect(screen.getByTestId('visibility').textContent).toBe('true');
    expect(screen.getByTestId('banner').textContent).toBe('false');
    expect(screen.getByTestId('finder-filter').textContent).toBe('false');
    expect(screen.getByTestId('finder-filter-ref').textContent).toBe('false');
  });

  it('updates isSiteBannerVisible', () => {
    render(
      <NavbarVisibilityProvider>
        <TestConsumer />
      </NavbarVisibilityProvider>,
    );
    fireEvent.click(screen.getByText('banner-on'));
    expect(screen.getByTestId('banner').textContent).toBe('true');
    fireEvent.click(screen.getByText('banner-off'));
    expect(screen.getByTestId('banner').textContent).toBe('false');
  });

  it('updates isFinderFilterOpen and sync ref', () => {
    render(
      <NavbarVisibilityProvider>
        <TestConsumer />
      </NavbarVisibilityProvider>,
    );
    fireEvent.click(screen.getByText('filter-on'));
    expect(screen.getByTestId('finder-filter').textContent).toBe('true');
    expect(screen.getByTestId('finder-filter-ref').textContent).toBe('true');
    fireEvent.click(screen.getByText('filter-off'));
    expect(screen.getByTestId('finder-filter').textContent).toBe('false');
    expect(screen.getByTestId('finder-filter-ref').textContent).toBe('false');
  });

  it('updates isNavbarVisible to false', () => {
    render(
      <NavbarVisibilityProvider>
        <TestConsumer />
      </NavbarVisibilityProvider>,
    );
    fireEvent.click(screen.getByText('hide'));
    expect(screen.getByTestId('visibility').textContent).toBe('false');
  });

  it('updates isNavbarVisible back to true', () => {
    render(
      <NavbarVisibilityProvider>
        <TestConsumer />
      </NavbarVisibilityProvider>,
    );
    fireEvent.click(screen.getByText('hide'));
    fireEvent.click(screen.getByText('show'));
    expect(screen.getByTestId('visibility').textContent).toBe('true');
  });

  it('throws when useNavbarVisibility used outside provider', () => {
    const originalError = console.error;
    console.error = () => {};
    expect(() => render(<TestConsumer />)).toThrow(
      'useNavbarVisibility must be used within a NavbarVisibilityProvider',
    );
    console.error = originalError;
  });

  it('renders children', () => {
    render(
      <NavbarVisibilityProvider>
        <p>child content</p>
      </NavbarVisibilityProvider>,
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });
});
