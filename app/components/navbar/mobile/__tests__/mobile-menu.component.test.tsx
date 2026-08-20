import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MobileMenu from '../mobile-menu.component';

// The drawer's own behavior is under test; its contents pull in Algolia and the
// root route loader, neither of which this exercises.
vi.mock('../mobile-menu-content', () => ({
  default: () => <div data-testid='menu-content' />,
}));
vi.mock('../search/mobile-search.component', () => ({
  MobileSearch: () => <div data-testid='mobile-search' />,
}));

function renderMenu() {
  return render(
    <BrowserRouter>
      <MobileMenu mode='light' setMode={vi.fn()} />
    </BrowserRouter>,
  );
}

/** The drawer panel is hidden via classes rather than unmounted. */
function drawer() {
  const panel = document
    .querySelector('[data-testid="menu-content"]')
    ?.closest('.fixed');
  if (!panel) {
    throw new Error('Expected the drawer panel to be rendered');
  }
  return panel;
}

const openMenu = () => fireEvent.click(screen.getByLabelText('Menu'));

beforeEach(() => {
  window.history.pushState({}, '', '/ministries');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MobileMenu history behavior', () => {
  it('does not mount search until visitor opens it', () => {
    renderMenu();

    expect(screen.queryByTestId('mobile-search')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Search'));
    expect(screen.getByTestId('mobile-search')).toBeInTheDocument();
  });

  // Without an entry of its own, the back gesture carried the user off the page
  // and Clarity logged the return trip as a Quick Back (CFDP-4232).
  it('gives the open drawer a history entry at the current URL', () => {
    renderMenu();
    const entriesBefore = window.history.length;

    openMenu();

    expect(drawer()).toHaveClass('translate-x-0');
    expect(window.history.length).toBe(entriesBefore + 1);
    // Same URL, so the entry is not a navigation Clarity can count.
    expect(window.location.pathname).toBe('/ministries');
  });

  it('closes on a back gesture instead of leaving the page', () => {
    renderMenu();
    openMenu();

    act(() => {
      window.dispatchEvent(new Event('popstate'));
    });

    expect(drawer()).toHaveClass('translate-x-full');
  });

  it('consumes its history entry when dismissed, so entries do not stack', () => {
    renderMenu();
    // React Router pops via history.go, not history.back.
    const goSpy = vi.spyOn(window.history, 'go').mockImplementation(() => {});

    openMenu();
    fireEvent.click(screen.getByLabelText('Close menu'));

    expect(drawer()).toHaveClass('translate-x-full');
    expect(goSpy).toHaveBeenCalledWith(-1);
  });

  it('leaves history alone when the drawer was never opened', () => {
    renderMenu();
    const goSpy = vi.spyOn(window.history, 'go').mockImplementation(() => {});

    fireEvent.click(screen.getByLabelText('Close menu'));

    expect(goSpy).not.toHaveBeenCalled();
  });
});
