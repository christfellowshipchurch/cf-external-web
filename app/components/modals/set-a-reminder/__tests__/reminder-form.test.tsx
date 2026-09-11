import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ReminderForm from '../reminder-form.component';

vi.mock('~/lib/gtm', () => ({ pushFormEvent: vi.fn() }));

const mockLoadFetcher = {
  state: 'idle' as const,
  data: undefined as unknown,
  load: vi.fn(),
  submit: vi.fn(),
};
const mockSubmitFetcher = {
  state: 'idle' as const,
  data: undefined as unknown,
  load: vi.fn(),
  submit: vi.fn(),
};
let fetcherCallCount = 0;

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    ...actual,
    useFetcher: () => {
      fetcherCallCount++;
      return fetcherCallCount % 2 === 1 ? mockLoadFetcher : mockSubmitFetcher;
    },
  };
});

const defaultProps = {
  setServiceTime: vi.fn(),
  onSuccess: vi.fn(),
  url: 'palm-beach-gardens',
};

const mockFormData = {
  serviceTimes: [{ hour: ['9:00 AM', '11:00 AM'] }],
  campusName: 'Palm Beach Gardens',
  user: { firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
};

function renderForm(props = defaultProps) {
  fetcherCallCount = 0;
  return render(
    <MemoryRouter>
      <ReminderForm {...props} />
    </MemoryRouter>,
  );
}

describe('ReminderForm', () => {
  beforeEach(() => {
    mockLoadFetcher.data = undefined;
    mockLoadFetcher.state = 'idle';
    mockSubmitFetcher.data = undefined;
    mockSubmitFetcher.state = 'idle';
    vi.clearAllMocks();
  });

  it('shows Loading... when form data not yet available', () => {
    renderForm();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it("shows 'Set a Reminder!' heading for in-person English campus", () => {
    mockLoadFetcher.data = mockFormData;
    renderForm();
    expect(screen.getByText('Set a Reminder!')).toBeInTheDocument();
  });

  it("shows 'Set a Reminder!' heading for Online campus", () => {
    mockLoadFetcher.data = {
      ...mockFormData,
      campusName: 'Christ Fellowship Online',
    };
    renderForm({ ...defaultProps, url: 'cf-everywhere' });
    expect(screen.getByText('Set a Reminder!')).toBeInTheDocument();
  });

  it("shows 'Visítanos' heading for Español campus", () => {
    mockLoadFetcher.data = {
      ...mockFormData,
      campusName: 'Español PBG',
    };
    renderForm();
    expect(screen.getByText('Visítanos')).toBeInTheDocument();
  });

  it('renders English field labels by default', () => {
    mockLoadFetcher.data = mockFormData;
    renderForm();
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders Español field labels for Español campus', () => {
    mockLoadFetcher.data = { ...mockFormData, campusName: 'Español PBG' };
    renderForm();
    expect(screen.getByText('Primer nombre')).toBeInTheDocument();
    expect(screen.getByText('Apellido')).toBeInTheDocument();
  });

  it('pre-fills user name from loader data', () => {
    mockLoadFetcher.data = mockFormData;
    renderForm();
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
  });

  it('renders service time options', () => {
    mockLoadFetcher.data = mockFormData;
    renderForm();
    expect(screen.getByText('9:00 AM')).toBeInTheDocument();
    expect(screen.getByText('11:00 AM')).toBeInTheDocument();
  });

  it('calls setServiceTime when a service time is selected', () => {
    const setServiceTime = vi.fn();
    mockLoadFetcher.data = mockFormData;
    renderForm({ ...defaultProps, setServiceTime });
    const select = screen
      .getByText('Select a Service Time')
      .closest('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '9:00 AM' } });
    expect(setServiceTime).toHaveBeenCalledWith('9:00 AM');
  });

  it('shows Submit button', () => {
    mockLoadFetcher.data = mockFormData;
    renderForm();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('shows error message when submission returns error', () => {
    mockLoadFetcher.data = mockFormData;
    mockSubmitFetcher.data = { error: 'Invalid phone number' };
    renderForm();
    expect(screen.getByText('Invalid phone number')).toBeInTheDocument();
  });

  it('loads form data with correct URL on mount', () => {
    renderForm();
    expect(mockLoadFetcher.load).toHaveBeenCalledWith(
      '/set-a-reminder?location=palm-beach-gardens',
    );
  });
});
