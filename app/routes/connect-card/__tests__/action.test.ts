import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/.server/rock-workflow', () => ({
  postRockWorkflowLaunchWithApiInitiator: vi.fn(),
  buildRockWorkflowLaunchEndpoint: (
    workflowTypeId: string,
    workflowName: string,
  ) =>
    `Workflows/LaunchWorkflow/0?workflowTypeId=${workflowTypeId}&workflowName=${encodeURIComponent(workflowName)}`,
}));

import { postRockWorkflowLaunchWithApiInitiator } from '~/lib/.server/rock-workflow';
import { buildConnectCardSubmission } from '../build-submission';
import { action } from '../action';

const mockPostRockWorkflowLaunchWithApiInitiator =
  postRockWorkflowLaunchWithApiInitiator as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockPostRockWorkflowLaunchWithApiInitiator.mockResolvedValue(undefined);
});

function makeRequest(fields: Record<string, string>) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.set(key, value));

  return new Request('http://localhost/connect-card', {
    method: 'POST',
    body: formData,
  });
}

describe('buildConnectCardSubmission', () => {
  it('maps Spanish submissions to workflow 403 attribute keys', () => {
    const submission = buildConnectCardSubmission({
      language: 'Spanish',
      firstName: 'Test',
      lastName: 'Form',
      email: 'test@example.com',
      phone: '555-123-4567',
      campus: 'campus-guid',
      nextStep: '1',
      'selection-0': 'Encontrar comunidad',
      'selection-1': 'Hacer la diferencia ayudando como voluntario',
      'selection-other': 'Otro',
      otherContent: 'Something else',
      decision: 'Hoy tomé la decisión de seguir a Cristo.',
    });

    expect(submission.workflowTypeId).toBe('403');
    expect(submission.workflowName).toBe('CFDP Web Connect Card');
    expect(submission.body).toEqual({
      FirstName: 'Test',
      LastName: 'Form',
      Campus: 'campus-guid',
      PhoneNumber: '555-123-4567',
      EmailAddress: 'test@example.com',
      LaunchSource: 'app',
      NextStep: '1',
      Selection:
        'Encontrar comunidad,Hacer la diferencia ayudando como voluntario,Otro',
      Decision: 'Hoy tomé la decisión de seguir a Cristo.',
      Other: 'Something else',
    });
  });

  it('maps English submissions to workflow 902 attribute keys', () => {
    const submission = buildConnectCardSubmission({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '555-000-0000',
      campus: 'campus-guid',
      'allThatApplies-0': 'guid-a',
      'allThatApplies-1': 'guid-b',
      'allThatApplies-4': 'journey-guid',
      'allThatApplies-5': 'baptism-guid',
    });

    expect(submission.workflowTypeId).toBe('902');
    expect(submission.workflowName).toBe('CFDP Web Connect Card');
    expect(submission.body).toEqual({
      FirstName: 'Jane',
      LastName: 'Doe',
      Campus: 'campus-guid',
      PhoneNumber: '555-000-0000',
      EmailAddress: 'jane@example.com',
      AllThatApplies: 'guid-a,guid-b,journey-guid,baptism-guid',
    });
  });
});

describe('connect-card action', () => {
  it('launches Spanish and English through the same Rock workflow path', async () => {
    await action({
      request: makeRequest({
        language: 'Spanish',
        firstName: 'Test',
        lastName: 'Form',
        email: 'test@example.com',
        phone: '555-123-4567',
        campus: 'campus-guid',
      }),
    } as Parameters<typeof action>[0]);

    expect(mockPostRockWorkflowLaunchWithApiInitiator).toHaveBeenCalledWith({
      workflowTypeId: '403',
      workflowName: 'CFDP Web Connect Card',
      body: {
        FirstName: 'Test',
        LastName: 'Form',
        Campus: 'campus-guid',
        PhoneNumber: '555-123-4567',
        EmailAddress: 'test@example.com',
        LaunchSource: 'app',
      },
      instanceName: 'Test Form',
    });

    vi.clearAllMocks();

    await action({
      request: makeRequest({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '555-000-0000',
        campus: 'campus-guid',
      }),
    } as Parameters<typeof action>[0]);

    expect(mockPostRockWorkflowLaunchWithApiInitiator).toHaveBeenCalledWith({
      workflowTypeId: '902',
      workflowName: 'CFDP Web Connect Card',
      body: {
        FirstName: 'Jane',
        LastName: 'Doe',
        Campus: 'campus-guid',
        PhoneNumber: '555-000-0000',
        EmailAddress: 'jane@example.com',
        AllThatApplies: '',
      },
      instanceName: 'Jane Doe',
    });
  });
});
