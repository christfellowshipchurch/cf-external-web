import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  fetchRockData: vi.fn(),
  TTL: { NONE: 0, SHORT: 300 },
}));

import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import {
  fetchVolunteerMissionDetailFromRock,
  missionGroupRequest,
} from '../outreach-mission-rock.server';

const mockFetchRockData = fetchRockData as ReturnType<typeof vi.fn>;

const GROUP_GUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const groupRow = {
  id: 9,
  name: 'Feed the City',
  attributeValues: {
    contactPersonId: { value: '77' },
    contactPerson: { value: '', valueFormatted: 'Jane Formatted' },
  },
};

/**
 * The contact lookup uses the collection form because Rock ignores $select on
 * People/{id}. fetchRockData unwraps a single match to an object and leaves a
 * miss as an empty array, so the call site has to handle both.
 */
const mockRock = (personResult: unknown) => {
  mockFetchRockData.mockImplementation(async ({ endpoint }) => {
    if (endpoint === 'Groups') return [groupRow];
    if (endpoint === 'People') return personResult;
    return [];
  });
};

const person = {
  nickName: 'Janie',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
};

describe('fetchVolunteerMissionDetailFromRock contact lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks for the collection form so Rock honors $select', async () => {
    mockRock(person);

    await fetchVolunteerMissionDetailFromRock(GROUP_GUID);

    expect(mockFetchRockData).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'People',
        queryParams: {
          $filter: 'Id eq 77',
          $select: 'FirstName,LastName,NickName,Email',
        },
      }),
    );
    expect(mockFetchRockData).not.toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'People/77' }),
    );
  });

  it('reads the contact off an unwrapped single match', async () => {
    mockRock(person);

    const detail = await fetchVolunteerMissionDetailFromRock(GROUP_GUID);

    expect(detail?.contactName).toBe('Janie Doe');
    expect(detail?.contactEmail).toBe('jane@example.com');
  });

  it('reads the contact off a single-element array', async () => {
    mockRock([person]);

    const detail = await fetchVolunteerMissionDetailFromRock(GROUP_GUID);

    expect(detail?.contactName).toBe('Janie Doe');
    expect(detail?.contactEmail).toBe('jane@example.com');
  });

  it('falls back to the formatted attribute name when the person is not found', async () => {
    mockRock([]);

    const detail = await fetchVolunteerMissionDetailFromRock(GROUP_GUID);

    expect(detail?.contactName).toBe('Jane Formatted');
    expect(detail?.contactEmail).toBeUndefined();
  });
});

describe('fetchVolunteerMissionDetailFromRock Groups request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches with missionGroupRequest so the admin cache endpoint deletes the key this page reads', async () => {
    mockRock(person);

    await fetchVolunteerMissionDetailFromRock(GROUP_GUID);

    expect(mockFetchRockData).toHaveBeenCalledWith({
      ...missionGroupRequest(GROUP_GUID),
      ttl: 300,
    });
  });
});
