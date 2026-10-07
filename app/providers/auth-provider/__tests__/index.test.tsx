import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import {
  AuthProvider,
  useAuth,
  AUTH_TOKEN_KEY,
  User_Auth_Status,
  RegistrationTypes,
} from '../index';

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useRevalidator: () => ({ revalidate: mockRevalidate }),
  };
});

const mockNavigate = vi.fn();
const mockRevalidate = vi.fn();

function TestConsumer() {
  const { user, isLoading } = useAuth();
  return (
    <div>
      <span data-testid='loading'>{String(isLoading)}</span>
      <span data-testid='user'>{user ? user.fullName : 'null'}</span>
    </div>
  );
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const mockUser = {
  id: '1',
  fullName: 'Test User',
  email: 'test@test.com',
  phoneNumber: '5551234567',
  guid: 'abc-123',
  gender: 'Male',
  birthDate: '1990-01-01',
  photo: '/photo.jpg',
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with isLoading=true then sets false when server returns 401', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    await act(async () => {
      renderWithRouter(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );
    });
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('loads user from cookie on mount', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    await act(async () => {
      renderWithRouter(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('Test User'),
    );
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('sets no user when server returns 401 on mount', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    await act(async () => {
      renderWithRouter(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );
    });
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('throws when useAuth used outside AuthProvider', () => {
    const originalError = console.error;
    console.error = () => {};
    expect(() => renderWithRouter(<TestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider',
    );
    console.error = originalError;
  });

  it('renders children', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    await act(async () => {
      renderWithRouter(
        <AuthProvider>
          <p>hello world</p>
        </AuthProvider>,
      );
    });
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });
});

describe('useAuth - loginWithEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  function LoginTestConsumer() {
    const { loginWithEmail, user } = useAuth();
    return (
      <div>
        <span data-testid='user'>{user ? user.fullName : 'null'}</span>
        <button onClick={() => loginWithEmail('user@test.com', 'password123')}>
          login
        </button>
      </div>
    );
  }

  it('loginWithEmail sets cookie server-side and then sets user', async () => {
    // 1: mount currentUser check → no cookie yet
    // 2: authenticate → success (server sets cookie via Set-Cookie header)
    // 3: currentUser after login → user data
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

    await act(async () => {
      renderWithRouter(
        <AuthProvider>
          <LoginTestConsumer />
        </AuthProvider>,
      );
    });

    await act(async () => {
      screen.getByText('login').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('Test User'),
    );
    expect(mockRevalidate).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});

describe('useAuth - logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  function LogoutTestConsumer() {
    const { logout, user } = useAuth();
    return (
      <div>
        <span data-testid='user'>{user ? user.fullName : 'null'}</span>
        <button onClick={logout}>logout</button>
      </div>
    );
  }

  it('logout clears user and calls server to clear cookie', async () => {
    // 1: mount currentUser → user found via cookie
    // 2: logout → server clears cookie
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => mockUser })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    await act(async () => {
      renderWithRouter(
        <AuthProvider>
          <LogoutTestConsumer />
        </AuthProvider>,
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('Test User'),
    );

    await act(async () => {
      screen.getByText('logout').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('null'),
    );
    expect(mockRevalidate).toHaveBeenCalled();
  });
});

describe('useAuth - checkUserExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  function CheckUserConsumer() {
    const { checkUserExists } = useAuth();
    const [result, setResult] = React.useState<boolean | null>(null);
    return (
      <div>
        <span data-testid='result'>{String(result)}</span>
        <button
          onClick={async () => {
            const r = await checkUserExists('user@test.com');
            setResult(r);
          }}
        >
          check
        </button>
      </div>
    );
  }

  it('checkUserExists returns true when userExists is true', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, status: 401 }) // mount
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ userExists: true }),
      });

    await act(async () => {
      renderWithRouter(
        <AuthProvider>
          <CheckUserConsumer />
        </AuthProvider>,
      );
    });

    await act(async () => {
      screen.getByText('check').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('result').textContent).toBe('true'),
    );
  });

  /**
   * A 500, a Rock timeout or a malformed body leaves userExists absent. Reading
   * that as false told the user their account does not exist on the strength of
   * a server failure, so the failure has to reach the caller as a failure. The
   * response itself stays uniform on purpose — it must not become an oracle for
   * whether an identity has an account.
   */
  function CheckUserOutcomeConsumer() {
    const { checkUserExists } = useAuth();
    const [outcome, setOutcome] = React.useState('none');
    return (
      <div>
        <span data-testid='outcome'>{outcome}</span>
        <button
          onClick={async () => {
            try {
              setOutcome(String(await checkUserExists('user@test.com')));
            } catch {
              setOutcome('error');
            }
          }}
        >
          check
        </button>
      </div>
    );
  }

  const errorResponses: Array<[string, Record<string, unknown>]> = [
    [
      'a 500 with an error body',
      {
        ok: false,
        status: 500,
        json: async () => ({ error: 'Rock exploded' }),
      },
    ],
    [
      'a 200 whose body has no userExists',
      { ok: true, status: 200, json: async () => ({ error: 'Rock exploded' }) },
    ],
    [
      'a body that is not JSON at all',
      {
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Unexpected token');
        },
      },
    ],
  ];

  it.each(errorResponses)(
    'does not take the userExists === false path on %s',
    async (_label, response) => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: false, status: 401 }) // mount
        .mockResolvedValueOnce(response);

      await act(async () => {
        renderWithRouter(
          <AuthProvider>
            <CheckUserOutcomeConsumer />
          </AuthProvider>,
        );
      });

      await act(async () => {
        screen.getByText('check').click();
      });

      await waitFor(() =>
        expect(screen.getByTestId('outcome').textContent).toBe('error'),
      );
      expect(screen.getByTestId('outcome').textContent).not.toBe('false');
    },
  );
});

describe('AuthProvider - exports', () => {
  it('exports AUTH_TOKEN_KEY', () => {
    expect(AUTH_TOKEN_KEY).toBe('auth-token');
  });

  it('exports User_Auth_Status enum values', () => {
    expect(User_Auth_Status.ExistingAppUser).toBe('EXISTING_APP_USER');
    expect(User_Auth_Status.NewAppUser).toBe('NEW_APP_USER');
    expect(User_Auth_Status.None).toBe('NONE');
  });

  it('exports RegistrationTypes enum values', () => {
    expect(RegistrationTypes.EMAIL).toBe('email');
    expect(RegistrationTypes.SMS).toBe('sms');
  });
});
