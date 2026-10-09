import { ActionFunction, data } from 'react-router';
import { postRockWorkflowLaunchWithApiInitiator } from '~/lib/.server/rock-workflow';
import { NewsletterSubscriptionFormType } from './types';

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = Object.fromEntries(await request.formData());
    const { FirstName, LastName, PhoneNumber, EmailAddress, Campus } = formData;

    const newsletterSubscriptionSubmission: NewsletterSubscriptionFormType = {
      FirstName: FirstName as string,
      LastName: LastName as string,
      PhoneNumber: PhoneNumber as string,
      EmailAddress: EmailAddress as string,
      Campus: Campus as string,
      LaunchSource: 'app',
    };

    const firstName = FirstName as string;
    const lastName = LastName as string;

    await postRockWorkflowLaunchWithApiInitiator({
      workflowTypeId: '1202',
      workflowName: 'Newsletter Subscription',
      body: newsletterSubscriptionSubmission,
      instanceName: `${firstName} ${lastName}`.trim(),
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
