import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../redis-config', () => ({ default: null }));
vi.mock('../fetch-rock-data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchRockData: vi.fn(),
}));

import { fetchRockData } from '../fetch-rock-data';
import {
  fetchGroupMembers,
  fetchPeople,
  fetchPersonAliases,
} from '../rock-people-groups';

const PERSON_GUID = '1b5c2e3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e';

const okResponse = (data: unknown) => ({
  ok: true,
  status: 200,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

const stubRock = (...responses: unknown[]) => {
  const fetchMock = vi.fn();
  responses.forEach((data) =>
    fetchMock.mockResolvedValueOnce(okResponse(data)),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const sentBody = (call = 0) =>
  JSON.parse(String(vi.mocked(global.fetch).mock.calls[call][1]?.body));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('ROCK_V2_ENABLED', 'true');
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('ROCK_API', 'https://rock.example.com/api/');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.mocked(fetchRockData).mockResolvedValue('v1');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('fetchPeople', () => {
  // v1's People endpoint never returns deceased people; v2 must not either.
  it('leaves deceased people out, as v1 does', async () => {
    stubRock({ count: 0, items: [] });

    await fetchPeople({
      endpoint: 'People',
      queryParams: { $filter: "Email eq 'a@b.c'", $select: 'Id' },
    });

    expect(sentBody().where).toBe('IsDeceased == false && (Email == "a@b.c")');
    expect(sentBody().select).toBe('new (Id)');
  });

  it('selects only $select, plus the Id the wrong-record guard checks', async () => {
    stubRock({
      count: 1,
      items: [{ id: 7, firstName: 'Ann', lastName: 'Lee' }],
    });

    await expect(
      fetchPeople({
        endpoint: 'People',
        queryParams: { $filter: 'Id eq 7', $select: 'FirstName, LastName' },
      }),
    ).resolves.toEqual({ id: 7, firstName: 'Ann', lastName: 'Lee' });
    expect(sentBody().select).toBe('new (FirstName, LastName, Id)');
  });

  // The people search answers 500 when it selects PersonAttributeValues.
  it('reads attribute values per person, not in the search', async () => {
    const fetchMock = stubRock(
      {
        count: 1,
        items: [
          { id: 7, guid: PERSON_GUID, photo__Guid: null, photo__Path: null },
        ],
      },
      { AuthorBio: { value: 'Bio', textValue: 'Bio' } },
    );

    const person = await fetchPeople({
      endpoint: 'People',
      queryParams: {
        $filter: 'Id eq 7',
        $expand: 'Photo',
        loadAttributes: 'simple',
      },
    });

    expect(sentBody().select).not.toContain('PersonAttributeValues');
    expect(fetchMock.mock.calls[1][0]).toBe(
      `https://rock.example.com/api/v2/models/people/${PERSON_GUID}/attributevalues`,
    );
    expect(person).toMatchObject({
      id: 7,
      // No photo comes back as null, like v1's $expand.
      photo: null,
      attributeValues: { authorBio: { value: 'Bio', valueFormatted: 'Bio' } },
    });
  });

  it('nests the expanded photo like v1', async () => {
    stubRock({
      count: 1,
      items: [{ id: 7, photo__Guid: 'photo-guid', photo__Path: 'a.jpg' }],
    });

    await expect(
      fetchPeople({
        endpoint: 'People',
        queryParams: { $filter: 'Id eq 7', $expand: 'Photo' },
      }),
    ).resolves.toMatchObject({ photo: { guid: 'photo-guid', path: 'a.jpg' } });
  });
});

describe('fetchPersonAliases', () => {
  it('reads through the camelCase personAliases search', async () => {
    stubRock({
      count: 1,
      items: [{ id: 3, personId: 7, person__NickName: 'Ann' }],
    });

    await expect(
      fetchPersonAliases({
        endpoint: 'PersonAlias',
        queryParams: { $filter: 'Id eq 3', $expand: 'Person', $top: '1' },
      }),
    ).resolves.toMatchObject({
      id: 3,
      personId: 7,
      person: { nickName: 'Ann' },
    });
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toMatch(
      /personaliases\/search\/personAliases$/,
    );
  });
});

describe('fetchGroupMembers', () => {
  it('filters on the status name and returns v1’s status number', async () => {
    stubRock({
      count: 1,
      items: [
        {
          id: 1,
          groupMemberStatus: 'Active',
          person__Id: 7,
          person__Photo__Guid: 'photo-guid',
          groupRole__IsLeader: true,
        },
      ],
    });

    const member = await fetchGroupMembers({
      endpoint: 'GroupMembers',
      queryParams: {
        $filter: "GroupId eq 5 and GroupMemberStatus eq 'Active'",
        $expand: 'Person/Photo,GroupRole',
      },
    });

    expect(sentBody().where).toBe(
      '(GroupId == 5 && GroupMemberStatus == "Active")',
    );
    expect(member).toMatchObject({
      groupMemberStatus: 1,
      person: { id: 7, photo: { guid: 'photo-guid' } },
      groupRole: { isLeader: true },
    });
  });

  it('selects only the requested attribute keys', async () => {
    stubRock({ count: 0, items: [] });

    await fetchGroupMembers({
      endpoint: 'GroupMembers',
      queryParams: {
        $filter: 'GroupId eq 5',
        loadAttributes: 'simple',
        attributeKeys: 'Session1,Session2',
      },
    });

    expect(sentBody().select).toContain(
      'GroupMemberAttributeValues.Where(av => av.Key == "Session1" || av.Key == "Session2")',
    );
  });
});
