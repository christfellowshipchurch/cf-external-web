import { data } from 'react-router';
import { z } from 'zod';
import { registerPersonWithEmail } from '~/lib/.server/authentication/rock-authentication';
import { RegistrationTypes } from '~/providers/auth-provider';
import { authenticateOrRegisterWithSms } from '~/lib/.server/authentication/authenticate-or-register-with-sms';

const UserProfileFieldSchema = z.object({
  field: z.string(),
  value: z.string().nullable(),
});

const UserInputDataSchema = z.object({
  phoneNumber: z.string().nullable(),
  email: z.string().email().nullable(),
  pin: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  userProfile: z.array(UserProfileFieldSchema),
});

type RegisterPersonType = {
  registrationType: RegistrationTypes;
  userInputData: unknown;
};

export const registerPerson = async ({
  registrationType,
  userInputData,
}: RegisterPersonType) => {
  if (!userInputData) {
    return data({ error: 'User input data is required' }, { status: 400 });
  }

  let registrationData;
  try {
    const parsed = JSON.parse(userInputData as string);
    registrationData = UserInputDataSchema.parse(parsed);
  } catch {
    return data({ error: 'Invalid registration data' }, { status: 400 });
  }

  switch (registrationType) {
    case 'sms': {
      if (!registrationData.phoneNumber || !registrationData.pin) {
        return data(
          { error: 'Phone number and PIN are required for SMS registration' },
          { status: 400 },
        );
      }
      try {
        const { encryptedToken } = await authenticateOrRegisterWithSms({
          phoneNumber: registrationData.phoneNumber,
          pin: registrationData.pin,
          email: registrationData.email,
          userProfile: registrationData.userProfile,
        });
        const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `auth-token=${encryptedToken}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=34560000`,
          },
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const statusCode =
          (error as { statusCode?: number })?.statusCode || 500;
        return data({ error: errorMessage }, { status: statusCode });
      }
    }
    case 'email': {
      if (!registrationData.email || !registrationData.password) {
        return data(
          { error: 'Email and password are required for email registration' },
          { status: 400 },
        );
      }
      try {
        const { token } = await registerPersonWithEmail({
          email: registrationData.email,
          password: registrationData.password,
          phoneNumber: registrationData.phoneNumber ?? undefined,
          userProfile: registrationData.userProfile,
        });
        const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `auth-token=${token}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=34560000`,
          },
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const statusCode =
          (error as { statusCode?: number })?.statusCode || 500;
        return data({ error: errorMessage }, { status: statusCode });
      }
    }
    default:
      return data({ error: 'Invalid registration type' }, { status: 400 });
  }
};
