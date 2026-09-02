import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { hasRegistrationContent } from '../types';

const mockLoaderData = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return { ...actual, useLoaderData: () => mockLoaderData() };
});

vi.mock('../components/session-registration', () => ({
  SessionRegistration: () => <div data-testid='session-registration' />,
}));

vi.mock('../components/clickthrough-registration.component', () => ({
  ClickThroughRegistration: () => <div data-testid='clickthrough' />,
}));

const { RegistrationSection } =
  await import('../partials/registration.partial');

const renderWith = (data: object) => {
  mockLoaderData.mockReturnValue({ title: 'A Day to Lead', ...data });
  return render(<RegistrationSection />);
};

describe('hasRegistrationContent', () => {
  it('is true when the event has session cards', () => {
    expect(
      hasRegistrationContent({ sessionScheduleCards: [{} as never] }),
    ).toBe(true);
  });

  it('is true when the event has a click-through groupType', () => {
    expect(hasRegistrationContent({ groupType: 'Baptism' })).toBe(true);
  });

  it('is false for an event with neither', () => {
    expect(hasRegistrationContent({ sessionScheduleCards: [] })).toBe(false);
    expect(hasRegistrationContent({})).toBe(false);
  });
});

describe('RegistrationSection', () => {
  // The `#register` wrapper used to render unconditionally, leaving an empty
  // <section> — dead markup, and an anchor target leading nowhere — on events
  // with no sessions and no groupType.
  it('renders nothing when there is no registration content', () => {
    const { container } = renderWith({ sessionScheduleCards: [] });
    expect(container.querySelector('#register')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the section for an event with session cards', () => {
    const { container } = renderWith({ sessionScheduleCards: [{}] });
    expect(container.querySelector('#register')).not.toBeNull();
    expect(screen.getByTestId('session-registration')).toBeTruthy();
  });

  it('renders the section for a click-through event', () => {
    const { container } = renderWith({
      sessionScheduleCards: [],
      groupType: 'Baptism',
    });
    expect(container.querySelector('#register')).not.toBeNull();
    expect(screen.getByTestId('clickthrough')).toBeTruthy();
  });
});
