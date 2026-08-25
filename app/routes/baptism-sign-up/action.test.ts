import type { ActionFunctionArgs } from 'react-router-dom';
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
      body: createFormData(),
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
        MyStory: 'I am ready.',
        ShareYourStory: 'Yes',
        'T-ShirtSize': 'Adult Medium',
      }),
    });
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

  // 1644 labels the story memo as ShareYourStory and the yes/no as MyStory,
  // and Address is an Address field — sending the English shape silently
  // fails the workflow so the person never lands in the group.
  it('adapts English form fields to the Spanish 1644 attribute types', async () => {
    const formData = createFormData();
    formData.set('tShirtSize', 'Adult Small');

    await action({
      request: new Request(
        'http://localhost/baptism-sign-up?Group=spanish-group-guid-123&Language=Spanish',
        { method: 'POST', body: formData },
      ),
    } as ActionFunctionArgs);

    expect(fetchRockData).not.toHaveBeenCalled();
    expect(postRockData).toHaveBeenCalledTimes(1);
    expect(postRockData).toHaveBeenCalledWith({
      endpoint:
        'Workflows/LaunchWorkflow/0?workflowTypeId=1644&workflowName=Baptism%20Finder%20Sign%20Up',
      body: expect.objectContaining({
        Group: 'spanish-group-guid-123',
        FirstName: 'Test',
        LastName: 'Person',
        Campus1: 'campus-guid-123',
        LaunchSource: 'app',
        ShareYourStory: 'I am ready.',
        MyStory: 'Si',
        Address: '123 Main St, Apt 2, Palm Beach Gardens, FL 33418',
        'T-ShirtSize': 'Adult S',
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
