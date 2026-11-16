import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../fetch-rock-data', () => ({
  fetchRockData: vi.fn(),
  patchRockData: vi.fn(),
  postRockData: vi.fn(),
  TTL: { NONE: 0 },
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
        queryParams: { $filter: 'Id eq 42', $select: 'Email' },
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
