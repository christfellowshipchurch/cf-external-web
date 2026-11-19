import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../fetch-rock-data', () => ({
  fetchRockData: vi.fn(),
  postRockData: vi.fn(),
  TTL: { NONE: 0 },
}));

vi.mock('../rock-people-groups', () => ({
  fetchPeople: vi.fn(),
  fetchPhoneNumbers: vi.fn(),
}));

vi.mock('../fetch-rock-v2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../fetch-rock-v2')>()),
  sendRockV2: vi.fn(),
}));

vi.mock('../rock-phone-numbers', () => ({
  createPhoneNumberInRock: vi.fn(),
  parsePhoneNumberUtil: vi.fn(() => ({
    significantNumber: '5615551234',
    countryCode: '1',
  })),
}));

import { updatePerson } from '../rock-person';
import { fetchPeople, fetchPhoneNumbers } from '../rock-people-groups';
import { sendRockV2 } from '../fetch-rock-v2';
import { RockAPIError } from '../error-types';
import { createPhoneNumberInRock } from '../rock-phone-numbers';

const PERSON_GUID = '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f';
const fields = { email: 'new@example.com', phoneNumber: '+15615551234' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchPhoneNumbers).mockResolvedValue([{ personId: 1 }]);
});

describe('updatePerson email', () => {
  it('reads Email and Guid by person id', async () => {
    vi.mocked(fetchPeople).mockResolvedValue({
      email: 'existing@example.com',
      guid: PERSON_GUID,
    });

    await updatePerson('42', fields);

    expect(fetchPeople).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'People',
        queryParams: { $filter: 'Id eq 42', $select: 'Email,Guid' },
      }),
    );
  });

  it('leaves an existing email alone', async () => {
    vi.mocked(fetchPeople).mockResolvedValue({
      email: 'existing@example.com',
      guid: PERSON_GUID,
    });

    await updatePerson('42', fields);

    expect(sendRockV2).not.toHaveBeenCalled();
  });

  // The read can come back as an object or a one-item array.
  it.each([
    ['an object', { id: 42, guid: PERSON_GUID }],
    ['a one-item array', [{ id: 42, guid: PERSON_GUID }]],
  ])(
    'patches the person by Guid when they have no email (%s)',
    async (_, person) => {
      vi.mocked(fetchPeople).mockResolvedValue(person);

      await updatePerson('42', fields);

      expect(sendRockV2).toHaveBeenCalledTimes(1);
      expect(sendRockV2).toHaveBeenCalledWith(
        'PATCH',
        `people/${PERSON_GUID}`,
        { Email: fields.email },
      );
    },
  );

  it.each([
    ['has no Guid', { id: 42 }],
    ['is not found', []],
  ])('throws a 404 without writing when the person %s', async (_, person) => {
    vi.mocked(fetchPeople).mockResolvedValue(person);

    const error = await updatePerson('42', fields).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RockAPIError);
    expect((error as RockAPIError).statusCode).toBe(404);
    expect(sendRockV2).not.toHaveBeenCalled();
    expect(createPhoneNumberInRock).not.toHaveBeenCalled();
  });

  it('throws when the email PATCH fails, and does not retry it', async () => {
    vi.mocked(fetchPeople).mockResolvedValue({ id: 42, guid: PERSON_GUID });
    const error = new RockAPIError('refused', 401);
    vi.mocked(sendRockV2).mockRejectedValue(error);

    await expect(updatePerson('42', fields)).rejects.toBe(error);
    expect(sendRockV2).toHaveBeenCalledTimes(1);
  });
});

describe('updatePerson phone number', () => {
  beforeEach(() => {
    vi.mocked(fetchPeople).mockResolvedValue({
      email: 'existing@example.com',
      guid: PERSON_GUID,
    });
  });

  it('creates the number when no one has it', async () => {
    vi.mocked(fetchPhoneNumbers).mockResolvedValue([]);

    await updatePerson('42', fields);

    expect(createPhoneNumberInRock).toHaveBeenCalledWith({
      personId: '42',
      phoneNumber: fields.phoneNumber,
      countryCode: '1',
    });
  });

  it('leaves an existing number alone', async () => {
    await updatePerson('42', fields);

    expect(createPhoneNumberInRock).not.toHaveBeenCalled();
  });
});
