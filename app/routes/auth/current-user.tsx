import { data } from 'react-router';
import { getCurrentPerson } from '~/lib/.server/authentication/rock-authentication';
import { decrypt } from '~/lib/.server/decrypt';
import { registerToken } from '~/lib/.server/token';
import { AuthenticationError, RockAPIError } from '~/lib/.server/error-types';
import { createImageUrlFromGuid } from '~/lib/utils';
import { User } from '~/providers/auth-provider';
import { fetchRockData, TTL } from '~/lib/.server/fetch-rock-data';

export const currentUser = async (token: string) => {
  try {
    if (!token || typeof token !== 'string') {
      throw new AuthenticationError('Token is required and must be a string');
    }

    let decryptedToken;
    try {
      decryptedToken = decrypt(token);
    } catch {
      throw new AuthenticationError(
        'Invalid or expired token, please log in again',
      );
    }

    const { rockCookie } = registerToken(decryptedToken);

    if (!rockCookie) {
      throw new AuthenticationError('rockCookie is undefined');
    }

    const person = await getCurrentPerson(rockCookie);
    const { id, firstName, lastName, email } = person;

    // Fetch phone numbers separately
    const phoneNumbers = await fetchRockData({
      endpoint: 'PhoneNumbers',
      queryParams: {
        $filter: `PersonId eq ${id}`,
      },
      customHeaders: {
        Cookie: rockCookie,
      },
      ttl: TTL.NONE,
    });

    // Fetch photo separately
    const personWithPhoto = await fetchRockData({
      endpoint: 'People',
      queryParams: {
        $filter: `Id eq ${id}`,
        $expand: 'Photo',
      },
      customHeaders: {
        Cookie: rockCookie,
      },
      ttl: TTL.NONE,
    });

    const fullName = [firstName, lastName].filter(Boolean).join(' ') || '';
    const photoData = Array.isArray(personWithPhoto)
      ? personWithPhoto[0]?.photo
      : personWithPhoto?.photo;
    const phoneNumber =
      Array.isArray(phoneNumbers) && phoneNumbers.length > 0
        ? phoneNumbers[0].number || ''
        : '';

    /**
     * todo: Finish implementing the rest of the user data
     */
    const currentUser: User = {
      id: String(id),
      fullName,
      email: email || '',
      phoneNumber,
      birthDate: '',
      gender: '',
      guid: '',
      photo: photoData?.guid ? createImageUrlFromGuid(photoData.guid) : '',
    };

    return new Response(JSON.stringify(currentUser), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return data({ error: error.message }, { status: 401 });
    }
    if (error instanceof RockAPIError) {
      return data({ error: error.message }, { status: error.statusCode });
    }
    return data({ error: 'An unexpected error occurred' }, { status: 500 });
  }
};
