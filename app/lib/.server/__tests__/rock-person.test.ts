import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../fetch-rock-data', () => ({
  fetchRockData: vi.fn(),
  patchRockData: vi.fn(),
  postRockData: vi.fn(),
  TTL: { NONE: 0 },
}));

// The reads stay on the mocked v1 call, so the v2 tests below only cover the write.
vi.mock('../rock-people-groups', async () => {
  const { fetchRockData } = await import('../fetch-rock-data');
  return { fetchPeople: fetchRockData, fetchPhoneNumbers: fetchRockData };
});

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
import { fetchRockData, patchRockData } from '../fetch-rock-data';
import { sendRockV2 } from '../fetch-rock-v2';

const mockFetchRockData = fetchRockData as ReturnType<typeof vi.fn>;
const mockPatchRockData = patchRockData as ReturnType<typeof vi.fn>;

const fields = { email: 'new@example.com', phoneNumber: '+15615551234' };

/**
 * Rock ignores $select on People/{id} and returns the whole entity, so the email
 * lookup uses the collection form. fetchRockData unwraps a single match to an
 * object and leaves a miss as an empty array — updatePerson has to read both.
 */
const mockPersonLookup = (personResult: unknown) => {
  mockFetchRockData.mockImplementation(async ({ endpoint }) =>
    endpoint === 'People' ? personResult : [{ personId: 1 }],
  );
};

describe('updatePerson email lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks for the collection form so Rock honors $select', async () => {
    mockPersonLookup({ email: 'existing@example.com' });

    await updatePerson('42', fields);

    expect(mockFetchRockData).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'People',
        queryParams: { $filter: 'Id eq 42', $select: 'Email,Guid' },
      }),
    );
    expect(mockFetchRockData).not.toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'People/42' }),
    );
  });

  it('leaves an existing email alone', async () => {
    mockPersonLookup({ email: 'existing@example.com' });

    await updatePerson('42', fields);

    expect(mockPatchRockData).not.toHaveBeenCalled();
  });

  it('patches the email when the person has none', async () => {
    mockPersonLookup({ id: 42 });

    await updatePerson('42', fields);

    expect(mockPatchRockData).toHaveBeenCalledWith({
      endpoint: 'People/42',
      body: { Email: fields.email },
    });
  });

  it('still patches when the collection form returns a single-element array', async () => {
    mockPersonLookup([{ id: 42 }]);

    await updatePerson('42', fields);

    expect(mockPatchRockData).toHaveBeenCalledWith({
      endpoint: 'People/42',
      body: { Email: fields.email },
    });
  });

  it('treats an empty result as no email rather than reading a field off it', async () => {
    mockPersonLookup([]);

    await expect(updatePerson('42', fields)).resolves.not.toThrow();
    expect(mockPatchRockData).toHaveBeenCalledWith({
      endpoint: 'People/42',
      body: { Email: fields.email },
    });
  });
});

describe('updatePerson email on Rock v2', () => {
  const PERSON_GUID = '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ROCK_V2_ENABLED', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('patches the person by Guid and not on v1', async () => {
    mockPersonLookup({ id: 42, guid: PERSON_GUID });

    await updatePerson('42', fields);

    expect(sendRockV2).toHaveBeenCalledWith('PATCH', `people/${PERSON_GUID}`, {
      Email: fields.email,
    });
    expect(mockPatchRockData).not.toHaveBeenCalled();
  });

  it('patches on v1 when the person has no Guid', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPersonLookup({ id: 42 });

    await updatePerson('42', fields);

    expect(sendRockV2).not.toHaveBeenCalled();
    expect(mockPatchRockData).toHaveBeenCalledWith({
      endpoint: 'People/42',
      body: { Email: fields.email },
    });
  });
});
