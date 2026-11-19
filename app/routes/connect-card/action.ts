import { ActionFunction, data } from 'react-router';
import { buildConnectCardSubmission } from './build-submission';
import { launchRockWorkflow } from '~/lib/.server/rock-workflow';

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = Object.fromEntries(await request.formData());
    const submission = buildConnectCardSubmission(formData);
    // --- Live Rock submission ---
    await launchRockWorkflow({
      workflowTypeId: submission.workflowTypeId,
      workflowName: submission.workflowName,
      body: submission.body,
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
