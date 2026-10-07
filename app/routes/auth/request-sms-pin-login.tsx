import { data } from 'react-router';
import { requestSmsLogin } from '~/lib/.server/authentication/sms-authentication';
import {
  AuthenticationError,
  EncryptionError,
  RateLimitError,
  RockAPIError,
} from '~/lib/.server/error-types';

export const requestSmsPinLogin = async (phoneNumber: string) => {
  try {
    if (!phoneNumber) {
      return data({ error: 'Phone number is required' }, { status: 400 });
    }

    await requestSmsLogin(phoneNumber as string);

    return new Response(
      JSON.stringify({ success: true, message: 'SMS PIN sent successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return data({ error: error.message }, { status: 429 });
    }
    if (error instanceof AuthenticationError) {
      console.error('AuthenticationError:', error.message);
      return data({ error: error.message }, { status: 401 });
    }
    if (error instanceof RockAPIError) {
      console.error('RockAPIError:', error.message);
      return data({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof EncryptionError) {
      console.error('EncryptionError:', error.message);
      return data({ error: error.message }, { status: 400 });
    }
    console.error('Unhandled authentication error:', error);
    return data(
      { error: 'An unexpected error occurred during authentication' },
      { status: 500 },
    );
  }
};
