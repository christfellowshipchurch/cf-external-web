import { parsePhoneNumber } from 'awesome-phonenumber';
import { postRockData } from './fetch-rock-data';

export const parsePhoneNumberUtil = (
  phoneNumber: string,
): {
  valid: boolean;
  significantNumber: string;
  countryCode: number | undefined;
  e164: string;
} => {
  const parsedNumber = parsePhoneNumber(phoneNumber, { regionCode: 'US' });

  return {
    valid: parsedNumber.valid,
    significantNumber: parsedNumber.number?.significant || '',
    countryCode: parsedNumber.countryCode,
    e164: parsedNumber.number?.e164 || '',
  };
};

export const createPhoneNumberInRock = async ({
  personId,
  phoneNumber,
  countryCode,
}: {
  personId: string;
  phoneNumber: string;
  countryCode: number;
}): Promise<boolean> => {
  try {
    await postRockData({
      endpoint: 'PhoneNumbers',
      body: {
        PersonId: personId,
        Number: phoneNumber,
        CountryCode: countryCode,
        IsMessagingEnabled: true,
        IsSystem: false,
        NumberTypeValueId: 13,
      },
    });
    return true;
  } catch (error) {
    console.error('Failed to create phone number in Rock:', error);
    return false;
  }
};
