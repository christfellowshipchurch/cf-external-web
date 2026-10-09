import { useNavigate, useRevalidator } from 'react-router';
import React, { createContext, useContext, useEffect, useState } from 'react';

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AUTH_TOKEN_KEY = 'auth-token';

export enum User_Auth_Status {
  ExistingAppUser = 'EXISTING_APP_USER',
  NewAppUser = 'NEW_APP_USER',
  None = 'NONE',
}

export enum RegistrationTypes {
  EMAIL = 'email',
  SMS = 'sms',
}

export type User = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  guid: string;
  gender: string;
  birthDate: string;
  photo: string;
};

export type UserProfileField = {
  field: string | null;
  value: string | null;
};

export type UserInputData = {
  phoneNumber: string | null;
  email: string | null;
  pin?: string | null;
  password?: string | null;
  userProfile: UserProfileField[];
};

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithEmail: (identity: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkUserExists: (identity: string) => Promise<boolean>;
  registerUser: (
    userInputData: UserInputData,
    registrationType: RegistrationTypes,
  ) => Promise<void>;
  requestSmsPin: (phoneNumber: string) => Promise<void>;
  loginWithSms: (phoneNumber: string, pin: string) => Promise<void>;
}

const handleError = (error: unknown, message: string) => {
  if (typeof window === 'undefined') return; // Guard for server-side

  console.error(message, error);
  // Clear HttpOnly auth cookie server-side (fire-and-forget)
  const fd = new FormData();
  fd.append('formType', 'logout');
  fetch('/auth', { method: 'POST', body: fd });
  throw error;
};

const ROUTES = {
  LOGIN: '/',
  LOGOUT: '/',
} as const;

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { revalidate } = useRevalidator();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadToken = async () => {
      try {
        const formData = new FormData();
        formData.append('formType', 'currentUser');
        const response = await fetch('/auth', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          setIsLoading(false);
          return;
        }

        const currentUser = await response.json();
        if (currentUser && currentUser.id) {
          setUser(currentUser);
        }
        setIsLoading(false);
      } catch (error) {
        if (error instanceof Error) {
          handleError(error.message, 'Error loading token:');
        } else {
          handleError('Unknown error occurred', 'Error loading token:');
        }
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const handleLogin = async () => {
    // Cookie is already set server-side via Set-Cookie header on the login response.
    // Just fetch the current user — the browser sends the HttpOnly cookie automatically.
    try {
      const formData = new FormData();
      formData.append('formType', 'currentUser');
      const response = await fetch('/auth', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data after login');
      }

      const currentUser = await response.json();
      setUser(currentUser);
      revalidate();
      navigate(ROUTES.LOGIN);
    } catch (error) {
      handleError(error, 'Error fetching user data after login:');
    }
  };

  const loginWithEmail = async (identity: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append('formType', 'authenticate');
      formData.append('identity', identity);
      formData.append('password', password);

      const response = await fetch('/auth', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unknown error occurred');
      }

      handleLogin();
    } catch (error) {
      handleError(error, 'Login error:');
      throw error; // Re-throw the error to be caught by the caller
    }
  };

  const logout = async () => {
    const formData = new FormData();
    formData.append('formType', 'logout');
    await fetch('/auth', { method: 'POST', body: formData });
    setUser(null);
    revalidate(); // revalidate the loader data to update page
  };

  /**
   * Rejects rather than answering false when the server did not answer. A 500, a
   * Rock timeout or a malformed body leaves `userExists` absent, and returning
   * that (or catching it as false) told the user their account does not exist on
   * the strength of a server failure. Callers must render a failure as a failure.
   */
  const checkUserExists = async (identity: string): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('formType', 'checkUserExists');
      formData.append('identity', identity);

      const response = await fetch('/auth', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || typeof result?.userExists !== 'boolean') {
        throw new Error(
          `Could not determine whether the user exists (status ${response.status})`,
        );
      }

      return result.userExists;
    } catch (error) {
      // Logged and rethrown rather than routed through handleError: a failed
      // existence check is not a reason to clear the auth cookie.
      console.error('Error checking user existence:', error);
      throw error;
    }
  };

  const registerUser = async (
    userInputData: UserInputData,
    registrationType: RegistrationTypes,
  ) => {
    try {
      const formData = new FormData();
      formData.append('formType', 'registerPerson');
      formData.append('registrationType', registrationType);
      formData.append('userInputData', JSON.stringify(userInputData));

      const response = await fetch('/auth', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      handleLogin();
    } catch (error) {
      handleError(error, 'Person registration error:');
    }
  };

  const requestSmsPin = async (phoneNumber: string) => {
    try {
      const formData = new FormData();
      formData.append('formType', 'requestSmsPin');
      formData.append('phoneNumber', phoneNumber);

      //trigger SMS pin request action
      await fetch('/auth', {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      handleError(error, 'SMS PIN request error:');
    }
  };

  const loginWithSms = async (phoneNumber: string, pin: string) => {
    try {
      const formData = new FormData();
      formData.append('formType', 'loginWithSms');
      formData.append('phoneNumber', phoneNumber);
      formData.append('pin', pin);

      // trigger SMS authentication action
      const response = await fetch('/auth', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unknown error occurred');
      }

      handleLogin();
    } catch (error) {
      console.error('SMS login error:', error);
    }
  };

  const contextValue: AuthContextType = {
    user,
    isLoading,
    loginWithEmail,
    logout,
    checkUserExists,
    registerUser,
    requestSmsPin,
    loginWithSms,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
