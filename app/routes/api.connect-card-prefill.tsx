import { type LoaderFunction, data } from 'react-router';
import {
  fetchRockData,
  postRockData,
  TTL,
} from '~/lib/.server/fetch-rock-data';
import type {
  ConnectCardPrefill,
  ConnectCardPrefillResponse,
} from './connect-card/types';

type RockPerson = {
  id?: number | string | null;
  Id?: number | string | null;
  firstName?: string;
  FirstName?: string;
  lastName?: string;
  LastName?: string;
  email?: string;
  Email?: string;
  primaryCampusId?: number | string | null;
  PrimaryCampusId?: number | string | null;
  campusId?: number | string | null;
  CampusId?: number | string | null;
  primaryCampus?: RockCampus | null;
  PrimaryCampus?: RockCampus | null;
  campus?: RockCampus | null;
  Campus?: RockCampus | null;
};

type RockPhoneNumber = {
  number?: string;
  Number?: string;
  numberFormatted?: string;
  NumberFormatted?: string;
};

type RockCampus = {
  id?: number | string;
  Id?: number | string;
  guid?: string;
  Guid?: string;
  name?: string;
  Name?: string;
};

const ROCK_PERSON_TOKEN_MAX_LENGTH = 512;
const ROCK_PERSON_ID_QUERY_PARAMS = ['rckpid', 'rckipid'] as const;

const hasControlCharacters = (value: string) =>
  Array.from(value).some((char) => {
    const code = char.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const hasUnsafeTokenCharacters = (value: string) =>
  hasControlCharacters(value) ||
  value.includes('"') ||
  value.includes('\\') ||
  value.includes('{{') ||
  value.includes('}}') ||
  value.includes('{%') ||
  value.includes('%}');

const isValidRockPersonToken = (value: string | null): value is string => {
  if (!value) return false;

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > ROCK_PERSON_TOKEN_MAX_LENGTH) {
    return false;
  }

  return !hasUnsafeTokenCharacters(trimmed);
};

const getRockPersonToken = (url: URL): string | null => {
  for (const paramName of ROCK_PERSON_ID_QUERY_PARAMS) {
    const value = url.searchParams.get(paramName)?.trim();
    if (value) {
      return value;
    }
  }

  return null;
};

const asArray = <T,>(value: T | T[] | null | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const getPersonId = (person: RockPerson): string | undefined => {
  const personId = person.id ?? person.Id;
  return personId == null ? undefined : String(personId);
};

const getPersonCampusId = (person: RockPerson): string | undefined => {
  const id =
    person.primaryCampusId ??
    person.PrimaryCampusId ??
    person.campusId ??
    person.CampusId ??
    person.primaryCampus?.id ??
    person.PrimaryCampus?.Id ??
    person.campus?.id ??
    person.Campus?.Id;

  return id == null ? undefined : String(id);
};

const getPersonCampusGuid = (person: RockPerson): string | undefined =>
  normalizeString(person.primaryCampus?.guid) ??
  normalizeString(person.PrimaryCampus?.Guid) ??
  normalizeString(person.campus?.guid) ??
  normalizeString(person.Campus?.Guid);

const getPersonCampusName = (person: RockPerson): string | undefined =>
  normalizeString(person.primaryCampus?.name) ??
  normalizeString(person.PrimaryCampus?.Name) ??
  normalizeString(person.campus?.name) ??
  normalizeString(person.Campus?.Name);

const resolveCampusGuid = (
  person: RockPerson,
  campuses: RockCampus[],
): string | undefined => {
  const personCampusGuid = getPersonCampusGuid(person);
  if (personCampusGuid) {
    return personCampusGuid;
  }

  const personCampusId = getPersonCampusId(person);
  if (personCampusId) {
    const campusById = campuses.find(
      (campus) => String(campus.id ?? campus.Id) === personCampusId,
    );
    const campusGuid = normalizeString(campusById?.guid ?? campusById?.Guid);
    if (campusGuid) {
      return campusGuid;
    }
  }

  const personCampusName = getPersonCampusName(person)?.toLowerCase();
  if (personCampusName) {
    const campusByName = campuses.find(
      (campus) =>
        normalizeString(campus.name ?? campus.Name)?.toLowerCase() ===
        personCampusName,
    );
    return normalizeString(campusByName?.guid ?? campusByName?.Guid);
  }

  return undefined;
};

const parseRockPersonResponse = (value: unknown): RockPerson | null => {
  let person = value;

  if (typeof person === 'string') {
    try {
      person = JSON.parse(person) as RockPerson;
    } catch {
      return null;
    }
  }

  if (!person || typeof person !== 'object') {
    return null;
  }

  return person as RockPerson;
};

const resolveRockPersonFromToken = async (
  personToken: string,
): Promise<RockPerson | null> => {
  const lavaTemplate =
    `{% assign person = "${personToken}" | PersonTokenRead %}` +
    '{{ person | ToJSON }}';

  const response = await postRockData({
    endpoint: '/Lava/RenderTemplate',
    body: lavaTemplate,
    contentType: 'text/plain',
  });

  return parseRockPersonResponse(response);
};

const buildPrefill = async (
  personToken: string,
): Promise<ConnectCardPrefillResponse> => {
  const person = await resolveRockPersonFromToken(personToken);

  if (!person || typeof person !== 'object') {
    return { status: 'not-found' };
  }

  const personId = getPersonId(person);
  if (!personId) {
    return { status: 'not-found' };
  }

  const [phoneNumbers, campuses] = await Promise.all([
    fetchRockData({
      endpoint: 'PhoneNumbers',
      queryParams: {
        $filter: `PersonId eq ${personId}`,
        $select: 'Number,NumberFormatted',
      },
      ttl: TTL.NONE,
    }),
    fetchRockData({
      endpoint: 'Campuses',
      queryParams: {
        $filter: 'IsActive eq true',
        $orderby: 'Order',
        $select: 'Id,Name,Guid',
      },
      ttl: TTL.NONE,
    }),
  ]);

  const phone = asArray(phoneNumbers as RockPhoneNumber[] | RockPhoneNumber)[0];
  const prefill: ConnectCardPrefill = {
    firstName: normalizeString(person.firstName ?? person.FirstName),
    lastName: normalizeString(person.lastName ?? person.LastName),
    email: normalizeString(person.email ?? person.Email),
    phone:
      normalizeString(phone?.numberFormatted ?? phone?.NumberFormatted) ??
      normalizeString(phone?.number ?? phone?.Number),
    campus: resolveCampusGuid(
      person,
      asArray(campuses as RockCampus[] | RockCampus),
    ),
  };

  return { status: 'success', prefill };
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const personToken = getRockPersonToken(url);

  if (!isValidRockPersonToken(personToken)) {
    return data<ConnectCardPrefillResponse>({ status: 'invalid-id' });
  }

  try {
    return data<ConnectCardPrefillResponse>(await buildPrefill(personToken));
  } catch (error) {
    console.error('Connect Card prefill failed:', error);
    return data<ConnectCardPrefillResponse>(
      { status: 'error', message: 'Unable to load prefill data' },
      { status: 500 },
    );
  }
};
