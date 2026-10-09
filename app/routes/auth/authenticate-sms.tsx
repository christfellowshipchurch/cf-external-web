import { data, isRouteErrorResponse } from 'react-router';
import { RateLimitError } from '~/lib/.server/error-types';
import { authenticateOrRegisterWithSms } from '~/lib/.server/authentication/authenticate-or-register-with-sms';

type AuthenticateSmsData = {
  pin: string;
  phoneNumber: string;
  userProfile?: string;
};

export const authenticateSms = async ({
  pin,
  phoneNumber,
}: AuthenticateSmsData) => {
  if (!pin || !phoneNumber) {
    console.error('Missing required fields:', {
      pin,
      phoneNumber,
    });
    throw new Error(
      JSON.stringify({
        message: 'Pin and phone number are required',
        status: 400,
      }),
    );
  }

  try {
    const { encryptedToken } = await authenticateOrRegisterWithSms({
      pin,
      phoneNumber,
      userProfile: [], //not creating new profile, just authenticating
    });

    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `auth-token=${encryptedToken}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=34560000`,
      },
    });
  } catch (error) {
    if (isRouteErrorResponse(error)) {
      return error;
    }
    if (error instanceof RateLimitError) {
      return data({ error: error.message }, { status: 429 });
    }
    console.error('Failed to authenticate with SMS:', error);
    return data({ error: 'Failed to authenticate with SMS' }, { status: 500 });
  }
};
