import { data, type ActionFunction } from 'react-router';
import { launchRockWorkflow } from '~/lib/.server/rock-workflow';
import type { DreamTeamKickoffFormType } from './types';

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = Object.fromEntries(await request.formData());
    const url = new URL(request.url);
    const group = url.searchParams.get('Group') ?? '';

    const submission: DreamTeamKickoffFormType = {
      FirstName: formData.FirstName as string,
      LastName: formData.LastName as string,
      PhoneNumber: formData.PhoneNumber as string,
      EmailAddress: formData.EmailAddress as string,
      Campus: formData.Campus as string,
      Birthdate: formData.Birthdate as string,
      CompletedJourney: formData.CompletedJourney as string,
      FilledOutApplication: formData.FilledOutApplication as string,
      ActiveOnDreamTeam: formData.ActiveOnDreamTeam as string,
      LaunchSource: 'app',
    };

    if (group) {
      submission.Group = group;
    }

    await launchRockWorkflow({
      workflowTypeId: '1568',
      workflowName: 'Dream Team Kickoff Sign Up',
      body: submission,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return data({ error: error.message }, { status: 400 });
    }
    return data({ error: 'Network error please try again' }, { status: 400 });
  }
};
