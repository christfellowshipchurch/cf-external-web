import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChurchRoleCard } from '../components/church-role-card.component';

const role = {
  id: 'missions-role-guid',
  title: 'Missions',
  description: '<p>Serve with missions.</p>',
};

// jsdom has no layout, so stub the clamp's measured heights.
function stubClampHeights(scrollHeight: number, clientHeight: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(
    scrollHeight,
  );
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(
    clientHeight,
  );
}

function renderCard() {
  return render(
    <ChurchRoleCard role={role} selected={false} onSelect={vi.fn()} />,
  );
}

describe('ChurchRoleCard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hides "Read more" when the description fits on one line, since expanding would show nothing new', () => {
    stubClampHeights(23, 23);
    renderCard();

    expect(
      screen.queryByRole('button', { name: /read more/i }),
    ).not.toBeInTheDocument();
  });

  it('shows "Read more" when the one-line clamp hides part of the description', () => {
    stubClampHeights(182, 23);
    renderCard();

    expect(
      screen.getByRole('button', { name: /read more/i }),
    ).toBeInTheDocument();
  });
});
