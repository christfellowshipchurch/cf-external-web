import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import ReminderFlow from '../reminder-flow.component';

vi.mock('~/lib/gtm', () => ({ pushFormEvent: vi.fn() }));

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useLoaderData: () => ({
      campusName: 'Palm Beach Gardens',
      campusUrl: 'palm-beach-gardens',
    }),
  };
});

// Mock child components to isolate ReminderFlow step logic
vi.mock('../reminder-form.component', () => ({
  default: ({ onSuccess }: { onSuccess: () => void }) => (
    <div>
      <span>ReminderForm</span>
      <button onClick={onSuccess}>form-success</button>
    </div>
  ),
}));

vi.mock('../confirmation.component', () => ({
  default: ({ onSuccess }: { onSuccess: () => void }) => (
    <div>
      <span>ReminderConfirmation</span>
      <button onClick={onSuccess}>confirm-success</button>
    </div>
  ),
}));

describe('ReminderFlow', () => {
  it('renders ReminderForm on the initial step', () => {
    render(
      <MemoryRouter>
        <ReminderFlow setOpenModal={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('ReminderForm')).toBeInTheDocument();
    expect(screen.queryByText('ReminderConfirmation')).not.toBeInTheDocument();
  });

  it('transitions to confirmation step when form reports success', () => {
    render(
      <MemoryRouter>
        <ReminderFlow setOpenModal={vi.fn()} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('form-success'));
    expect(screen.getByText('ReminderConfirmation')).toBeInTheDocument();
    expect(screen.queryByText('ReminderForm')).not.toBeInTheDocument();
  });

  it('calls setOpenModal(false) when confirmation reports success', () => {
    const setOpenModal = vi.fn();
    render(
      <MemoryRouter>
        <ReminderFlow setOpenModal={setOpenModal} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('form-success'));
    fireEvent.click(screen.getByText('confirm-success'));
    expect(setOpenModal).toHaveBeenCalledWith(false);
  });
});
