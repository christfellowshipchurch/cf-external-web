import { data } from 'react-router';
import { authenticateUser } from '~/lib/.server/authentication/authenticate-user';

import {
  AuthenticationError,
  EncryptionError,
  RockAPIError,
} from '~/lib/.server/error-types';

type AuthenticateData = {
  identity: string;
  password: string;
};

export const authenticate = async ({
  identity,
  password,
}: AuthenticateData) => {
  try {
    if (!identity || !password) {
      return data(
        { error: 'Identity and password are required' },
        { status: 400 },
      );
    }

    const { encryptedToken } = await authenticateUser(
      identity as string,
      password as string,
    );

    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `auth-token=${encryptedToken}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=34560000`,
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return data({ error: error.message }, { status: 401 });
    }
    if (error instanceof RockAPIError) {
      return data({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof EncryptionError) {
      return data({ error: error.message }, { status: 400 });
    }
    console.error('Unhandled authentication error:', error);
    return data(
      { error: 'An unexpected error occurred during authentication' },
      { status: 500 },
    );
  }
};
