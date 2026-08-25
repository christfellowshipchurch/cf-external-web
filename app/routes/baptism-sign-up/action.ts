import { ActionFunction, data } from 'react-router-dom';
import { BaptismSignUpFormType } from './types';
import {
  fetchRockData,
  postRockData,
  TTL,
} from '~/lib/.server/fetch-rock-data';

type RockLocation = {
  guid: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

type AddressInput = Omit<RockLocation, 'guid'>;

const normalizeAddressPart = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');

const escapeODataValue = (value: string) => value.replace(/'/g, "''");

const hasMatchingAddress = (location: RockLocation, address: AddressInput) =>
  [
    ['street1', address.street1],
    ['street2', address.street2 ?? ''],
    ['city', address.city],
    ['state', address.state],
    ['postalCode', address.postalCode],
    ['country', address.country ?? ''],
  ].every(
    ([key, value]) =>
      normalizeAddressPart(
        location[key as keyof RockLocation],
      ).toLowerCase() === value.toLowerCase(),
  );

const findMatchingRockLocation = async (address: AddressInput) => {
  const matchingLocations = await fetchRockData({
    endpoint: 'locations',
    queryParams: {
      $filter: `Street1 eq '${escapeODataValue(address.street1)}'`,
    },
    ttl: TTL.NONE,
  });
  const locations = Array.isArray(matchingLocations)
    ? matchingLocations
    : matchingLocations
      ? [matchingLocations]
      : [];
  const existingLocation = locations.find((location) =>
    hasMatchingAddress(location as RockLocation, address),
  ) as RockLocation | undefined;

  return existingLocation?.guid;
};

const findOrCreateRockLocation = async (address: AddressInput) => {
  const existingLocationGuid = await findMatchingRockLocation(address);
  if (existingLocationGuid) return existingLocationGuid;

  const createdLocation = (await postRockData({
    endpoint: 'locations',
    body: {
      Street1: address.street1,
      Street2: address.street2,
      City: address.city,
      State: address.state,
      PostalCode: address.postalCode,
      Country: address.country,
    },
  })) as { guid?: string; Guid?: string };
  const locationGuid = createdLocation.guid ?? createdLocation.Guid;
  if (locationGuid) return locationGuid;

  const createdLocationGuid = await findMatchingRockLocation(address);
  if (createdLocationGuid) return createdLocationGuid;

  throw new Error('Rock did not return a GUID for the created location');
};

const formatAddressForSpanishWorkflow = (address: AddressInput): string => {
  const localityLine = [
    address.city,
    [address.state, address.postalCode].filter(Boolean).join(' ').trim(),
  ]
    .filter(Boolean)
    .join(', ');

  return [address.street1, address.street2, localityLine]
    .filter(Boolean)
    .join(', ');
};

/** Rock 1644 uses Spanish option text for these single-selects. */
const SPANISH_SHARE_STORY_VALUES: Record<string, string> = {
  Yes: 'Si',
  No: 'No',
  'No Preference': 'Sin preferencia',
};

const SPANISH_T_SHIRT_SIZES: Record<string, string> = {
  'Adult Small': 'Adult S',
};

/**
 * Spanish workflow 1644 keeps the same keys as English 1465, but two fields
 * are reversed on the Rock type: the story memo is `ShareYourStory` and the
 * yes/no is `MyStory`. Address is an Address field, not a Location GUID.
 */
const adaptPayloadForSpanishWorkflow = (
  payload: BaptismSignUpFormType,
  formattedAddress: string,
): BaptismSignUpFormType => ({
  ...payload,
  Address: formattedAddress,
  ShareYourStory: payload.MyStory,
  MyStory:
    SPANISH_SHARE_STORY_VALUES[payload.ShareYourStory] ?? payload.ShareYourStory,
  'T-ShirtSize':
    SPANISH_T_SHIRT_SIZES[payload['T-ShirtSize']] ?? payload['T-ShirtSize'],
});

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = Object.fromEntries(await request.formData());
    const url = new URL(request.url);
    const group = url.searchParams.get('Group') ?? '';
    const language =
      url.searchParams.get('Language') === 'Spanish' ? 'Spanish' : 'English';
    const workflowTypeId = language === 'Spanish' ? '1644' : '1465';

    const {
      firstName,
      lastName,
      phone,
      email,
      campus,
      birthdate,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      tShirtSize,
      myStory,
      shareYourStory,
      areYouInHighSchool,
      grade,
      gFirstName,
      gLastName,
      guardiansEmail,
      guardiansPhone,
      relationship,
    } = formData;

    if (!group) {
      return data({ error: 'Missing required fields' }, { status: 400 });
    }

    const address = {
      street1: normalizeAddressPart(addressLine1),
      street2: normalizeAddressPart(addressLine2),
      city: normalizeAddressPart(city),
      state: normalizeAddressPart(state),
      postalCode: normalizeAddressPart(zip),
      country: 'US',
    };
    const isSpanish = language === 'Spanish';
    const locationGuid = isSpanish
      ? undefined
      : await findOrCreateRockLocation(address);

    let baptismSignUpSubmission: BaptismSignUpFormType = {
      FirstName: firstName as string,
      LastName: lastName as string,
      PhoneNumber: phone as string,
      EmailAddress: email as string,
      Campus1: campus as string,
      Birthdate: birthdate as string,
      Address: locationGuid ?? '',
      'T-ShirtSize': tShirtSize as string,
      ShareYourStory: shareYourStory as string,
      MyStory: myStory as string,
      LaunchSource: 'app',
      Group: group,
    };

    // Age-conditional fields — the form only submits these when its age logic
    // requires them, so include each only when present rather than sending
    // empty strings.
    if (areYouInHighSchool) {
      baptismSignUpSubmission.AreyouinHighSchool = areYouInHighSchool as string;
    }
    if (grade) {
      baptismSignUpSubmission.Grade = grade as string;
    }
    if (gFirstName) {
      baptismSignUpSubmission.GFirstName = gFirstName as string;
    }
    if (gLastName) {
      baptismSignUpSubmission.GLastName = gLastName as string;
    }
    if (guardiansEmail) {
      baptismSignUpSubmission.GuardiansEmail = guardiansEmail as string;
    }
    if (guardiansPhone) {
      baptismSignUpSubmission.GuardiansPhoneNumber = guardiansPhone as string;
    }
    if (relationship) {
      baptismSignUpSubmission.Relationship = relationship as string;
    }

    if (isSpanish) {
      baptismSignUpSubmission = adaptPayloadForSpanishWorkflow(
        baptismSignUpSubmission,
        formatAddressForSpanishWorkflow(address),
      );
    }

    const debugPayload = {
      location: { ...address, guid: locationGuid },
      workflow: baptismSignUpSubmission,
    };
    if (import.meta.env.DEV) {
      console.warn('[Baptism sign-up] Rock payload', debugPayload);
    }

    await postRockData({
      endpoint: `Workflows/LaunchWorkflow/0?workflowTypeId=${workflowTypeId}&workflowName=Baptism%20Finder%20Sign%20Up`,
      body: baptismSignUpSubmission,
    });

    return new Response(
      JSON.stringify({
        success: true,
        ...(import.meta.env.DEV ? { debug: debugPayload } : {}),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      return data({ error: error.message }, { status: 400 });
    }
    return data({ error: 'Network error please try again' }, { status: 400 });
  }
};
