import { parseISO, isValid, getMonth, getDate, getYear } from 'date-fns';
import {
  fetchRockData,
  patchRockData,
  postRockData,
  TTL,
} from './fetch-rock-data';
import {
  createPhoneNumberInRock,
  parsePhoneNumberUtil,
} from './authentication/sms-authentication';

export enum Gender {
  Female = 'Female',
  Male = 'Male',
  Unknown = 'Unknown',
}

const RockGenderMap: { [key in Gender]: number } = {
  [Gender.Unknown]: 0,
  [Gender.Male]: 1,
  [Gender.Female]: 2,
};

interface PersonProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  BirthDate?: string;
  [key: string]: unknown;
}

export const createPerson = async (profile: PersonProfile) => {
  const inputProfileFields = await mapInputFieldsToRock(profile);
  return await postRockData({
    endpoint: 'People',
    body: {
      Gender: 0,
      ...inputProfileFields,
      IsSystem: false,
    },
  });
};

export const updatePerson = async (
  id: string,
  fields: { email: string; phoneNumber: string },
) => {
  // Update User email if user does not have one in Rock.
  // Collection form, not People/{id}: Rock ignores $select on by-id routes and
  // returns the whole entity. fetchRockData unwraps a single match to an object
  // and leaves a miss as an empty array, so handle both shapes.
  const emailInRock = await fetchRockData({
    endpoint: 'People',
    queryParams: {
      $filter: `Id eq ${id}`,
      $select: 'Email',
    },
    ttl: TTL.NONE, // no cache
  });
  const personInRock = Array.isArray(emailInRock)
    ? emailInRock[0]
    : emailInRock;

  if (!personInRock?.email) {
    await patchRockData({
      endpoint: `People/${id}`,
      body: {
        Email: fields.email,
      },
    });
  }

  // Create Phone Number in Rock
  const { significantNumber, countryCode } = parsePhoneNumberUtil(
    fields.phoneNumber,
  );

  const existingPhoneNumbers = await fetchRockData({
    endpoint: 'PhoneNumbers',
    queryParams: {
      $select: 'PersonId',
      $filter: `Number eq '${significantNumber}'`,
    },
    ttl: TTL.NONE, // no cache
  });

  if (!existingPhoneNumbers || existingPhoneNumbers.length === 0) {
    if (!countryCode) {
      throw new Error('Country code is required for creating phone number');
    }
    await createPhoneNumberInRock({
      personId: id,
      phoneNumber: fields.phoneNumber,
      countryCode,
    });
  }
};

// Update mapGender function
export const mapGender = (gender: number): Gender | undefined => {
  // Find the key in RockGenderMap that matches the gender value
  return (Object.keys(RockGenderMap) as Array<keyof typeof RockGenderMap>).find(
    (key) => RockGenderMap[key] === gender,
  ) as Gender | undefined;
};

// Add this to create profile when ready...
export const mapInputFieldsToRock = (fields: PersonProfile) => {
  const profileFields = fields;

  // Create a shallow copy of profileFields
  let rockUpdateFields = { ...profileFields };

  if (profileFields.BirthDate) {
    delete rockUpdateFields.BirthDate;
    const birthDate = parseISO(profileFields.BirthDate);

    if (!isValid(birthDate)) {
      throw new Error('BirthDate must be a valid date');
    }

    rockUpdateFields = {
      ...rockUpdateFields,
      // months in date-fns are 0 indexed
      BirthMonth: getMonth(birthDate) + 1,
      BirthDay: getDate(birthDate),
      BirthYear: getYear(birthDate),
    };
  }

  return rockUpdateFields;
};
