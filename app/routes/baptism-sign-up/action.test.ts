import type { ActionFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRockData, postRockData } from '~/lib/.server/fetch-rock-data';
import { action } from './action';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  fetchRockData: vi.fn(),
  postRockData: vi.fn(),
  TTL: { NONE: 0 },
}));

const createFormData = () => {
  const formData = new FormData();
  formData.set('firstName', 'Test');
  formData.set('lastName', 'Person');
  formData.set('phone', '5555555555');
  formData.set('email', 'test@example.com');
  formData.set('campus', 'campus-guid-123');
  formData.set('birthdate', '2000-01-01');
  formData.set('addressLine1', '123 Main St');
  formData.set('addressLine2', 'Apt 2');
  formData.set('city', 'Palm Beach Gardens');
  formData.set('state', 'FL');
  formData.set('zip', '33418');
  formData.set('tShirtSize', 'Adult Medium');
  formData.set('myStory', 'I am ready.');
  formData.set('shareYourStory', 'Yes');
  return formData;
};

const createRequest = (options: {
  group?: string;
  language?: 'English' | 'Spanish';
  formData?: FormData;
}) => {
  const searchParams = new URLSearchParams();
  if (options.group) {
    searchParams.set('Group', options.group);
  }
  if (options.language) {
    searchParams.set('Language', options.language);
  }

  return new Request(
    `http://localhost/baptism-sign-up?${searchParams.toString()}`,
    {
      method: 'POST',
      body: options.formData ?? createFormData(),
    },
  );
};

describe('baptism sign up action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(postRockData).mockResolvedValue(undefined);
    vi.mocked(fetchRockData).mockResolvedValue({
      guid: 'location-guid-123',
      street1: '123 Main St',
      street2: 'Apt 2',
      city: 'Palm Beach Gardens',
      state: 'FL',
      postalCode: '33418',
      country: 'US',
    });
  });

  it('posts English submissions to workflow ID 1465 by default', async () => {
    await action({
      request: createRequest({ group: 'group-guid-123' }),
    } as ActionFunctionArgs);

    expect(postRockData).toHaveBeenCalledWith({
      endpoint:
        'Workflows/LaunchWorkflow/0?workflowTypeId=1465&workflowName=Baptism%20Finder%20Sign%20Up',
      body: expect.objectContaining({
        Group: 'group-guid-123',
        LaunchSource: 'app',
        FirstName: 'Test',
        LastName: 'Person',
        Campus1: 'campus-guid-123',
        Address: 'location-guid-123',
        'T-ShirtSize': 'Adult Medium',
      }),
    });
  });

  it.each(['English', 'Spanish'] as const)(
    'preserves child and guardian details using confirmed %s Rock attribute keys',
    async (language) => {
      vi.mocked(postRockData).mockResolvedValueOnce('2031');
      const formData = createFormData();
      formData.set('birthdate', '2012-01-01');
      formData.set('grade', '8th');
      formData.set('gFirstName', 'Parent');
      formData.set('gLastName', 'Person');
      formData.set('guardiansEmail', 'parent@example.com');
      formData.set('guardiansPhone', '5615550100');
      formData.set('relationship', 'Mother');

      await action({
        request: createRequest({ group: 'group-guid-123', language, formData }),
      } as ActionFunctionArgs);

      expect(postRockData).toHaveBeenCalledWith({
        endpoint: expect.stringContaining(
          `workflowTypeId=${language === 'Spanish' ? '1644' : '1465'}&`,
        ),
        body: expect.objectContaining({
          FirstName: 'Test',
          LastName: 'Person',
          Birthdate: '2012-01-01',
          Grade: '2031',
          GFirstName: 'Parent',
          GLastName: 'Person',
          GuardiansEmail: 'parent@example.com',
          GuardiansPhoneNumber: '5615550100',
          Relationship: 'Mother',
          ShareYourStory: 'I am ready.',
          MyStory: 'Yes',
        }),
      });
      expect(postRockData).toHaveBeenCalledWith({
        endpoint: '/Lava/RenderTemplate',
        body: "{[ gradYearFromGrade grade:'8' ]}",
        contentType: 'text/plain',
      });
    },
  );

  it('does not launch a child workflow when Rock cannot resolve its grade option', async () => {
    vi.mocked(postRockData).mockResolvedValueOnce('');
    const formData = createFormData();
    formData.set('grade', '8th');

    const result = await action({
      request: createRequest({ group: 'group-guid-123', formData }),
    } as ActionFunctionArgs);

    expect(result).toMatchObject({
      data: { error: 'Rock did not return a valid graduation year' },
      init: { status: 400 },
    });
    expect(postRockData).toHaveBeenCalledTimes(1);
    expect(fetchRockData).not.toHaveBeenCalled();
  });

  it.each([
    ['Kindergarten', 0],
    ['1st', 1],
    ['2nd', 2],
    ['3rd', 3],
    ['4th', 4],
    ['5th', 5],
    ['6th', 6],
    ['7th', 7],
    ['8th', 8],
    ['9th', 9],
    ['10th', 10],
    ['11th', 11],
    ['12th', 12],
  ])(
    'resolves %s through its Rock graduation-year grade number',
    async (label, gradeNumber) => {
      vi.mocked(postRockData).mockResolvedValueOnce('2040');
      const formData = createFormData();
      formData.set('grade', String(label));

      await action({
        request: createRequest({ group: 'group-guid-123', formData }),
      } as ActionFunctionArgs);

      expect(postRockData).toHaveBeenNthCalledWith(1, {
        endpoint: '/Lava/RenderTemplate',
        body: `{[ gradYearFromGrade grade:'${gradeNumber}' ]}`,
        contentType: 'text/plain',
      });
      expect(postRockData).toHaveBeenNthCalledWith(2, {
        endpoint: expect.stringContaining('Workflows/LaunchWorkflow/'),
        body: expect.objectContaining({ Grade: '2040' }),
      });
    },
  );

  it('keeps adult submissions free of guardian attributes and maps story to its Rock text field', async () => {
    await action({
      request: createRequest({ group: 'group-guid-123' }),
    } as ActionFunctionArgs);

    const body = vi.mocked(postRockData).mock.calls[0][0].body;
    expect(body).toMatchObject({
      Birthdate: '2000-01-01',
      ShareYourStory: 'I am ready.',
      MyStory: 'Yes',
    });
    for (const key of [
      'Grade',
      'GFirstName',
      'GLastName',
      'GuardiansEmail',
      'GuardiansPhoneNumber',
      'Relationship',
      'AreyouinHighSchool',
    ]) {
      expect(body).not.toHaveProperty(key);
    }
  });

  it('creates a location before launching the workflow when none matches', async () => {
    vi.mocked(fetchRockData).mockResolvedValue([]);
    vi.mocked(postRockData)
      .mockResolvedValueOnce({ guid: 'new-location-guid-123' })
      .mockResolvedValueOnce(undefined);

    await action({
      request: createRequest({ group: 'group-guid-123' }),
    } as ActionFunctionArgs);

    expect(postRockData).toHaveBeenNthCalledWith(1, {
      endpoint: 'locations',
      body: {
        Street1: '123 Main St',
        Street2: 'Apt 2',
        City: 'Palm Beach Gardens',
        State: 'FL',
        PostalCode: '33418',
        Country: 'US',
      },
    });
    expect(postRockData).toHaveBeenNthCalledWith(2, {
      endpoint:
        'Workflows/LaunchWorkflow/0?workflowTypeId=1465&workflowName=Baptism%20Finder%20Sign%20Up',
      body: expect.objectContaining({ Address: 'new-location-guid-123' }),
    });
  });

  it('looks up a newly created location when Rock returns an empty response', async () => {
    vi.mocked(fetchRockData).mockResolvedValueOnce([]).mockResolvedValueOnce({
      guid: 'new-location-guid-123',
      street1: '123 Main St',
      street2: 'Apt 2',
      city: 'Palm Beach Gardens',
      state: 'FL',
      postalCode: '33418',
      country: 'US',
    });
    vi.mocked(postRockData)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(undefined);

    await action({
      request: createRequest({ group: 'group-guid-123' }),
    } as ActionFunctionArgs);

    expect(fetchRockData).toHaveBeenCalledTimes(2);
    expect(postRockData).toHaveBeenNthCalledWith(2, {
      endpoint:
        'Workflows/LaunchWorkflow/0?workflowTypeId=1465&workflowName=Baptism%20Finder%20Sign%20Up',
      body: expect.objectContaining({ Address: 'new-location-guid-123' }),
    });
  });

  it('does not launch the workflow when location creation fails', async () => {
    vi.mocked(fetchRockData).mockResolvedValue([]);
    vi.mocked(postRockData).mockRejectedValueOnce(
      new Error('Rock Locations API unavailable'),
    );

    const response = (await action({
      request: createRequest({ group: 'group-guid-123' }),
    } as ActionFunctionArgs)) as {
      data: { error: string };
      init: { status: number };
    };

    expect(response.init.status).toBe(400);
    expect(response.data).toEqual({ error: 'Rock Locations API unavailable' });
    expect(postRockData).toHaveBeenCalledTimes(1);
  });

  it('posts Spanish submissions to workflow ID 1644', async () => {
    await action({
      request: createRequest({
        group: 'spanish-group-guid-123',
        language: 'Spanish',
      }),
    } as ActionFunctionArgs);

    expect(postRockData).toHaveBeenCalledWith({
      endpoint:
        'Workflows/LaunchWorkflow/0?workflowTypeId=1644&workflowName=Baptism%20Finder%20Sign%20Up',
      body: expect.objectContaining({
        Group: 'spanish-group-guid-123',
        LaunchSource: 'app',
      }),
    });
  });

  it('returns 400 when Group is missing', async () => {
    const response = (await action({
      request: createRequest({}),
    } as ActionFunctionArgs)) as {
      data: { error: string };
      init: { status: number };
    };

    expect(response.init.status).toBe(400);
    expect(response.data).toEqual({ error: 'Missing required fields' });
    expect(postRockData).not.toHaveBeenCalled();
  });
});
