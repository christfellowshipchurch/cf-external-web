import { ActionFunction, data } from 'react-router';
import { ContactFormType } from './types';
import { launchRockWorkflow } from '~/lib/.server/rock-workflow';
import { getBotBlockReason, logBlockedSubmission } from '~/lib/bot-protection';

const successResponse = () =>
  new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = Object.fromEntries(await request.formData());

    // Bots get the same success response so they don't adapt, but never reach Rock.
    const botReason = getBotBlockReason(formData);
    if (botReason) {
      logBlockedSubmission('contact-us', botReason);
      return successResponse();
    }

    const { firstName, lastName, email, phone, campus, message } = formData;

    const contactFormSubmission: ContactFormType = {
      FirstName: firstName as string,
      LastName: lastName as string,
      EmailAddress: email as string,
      PhoneNumber: phone as string,
      Campus: campus as string,
      Message: message as string,
      SendingFormName: 'CFDP App Contact Us',
      LaunchSource: 'app',
    };

    await launchRockWorkflow({
      workflowTypeId: '878',
      workflowName: 'CFDP App Contact Us',
      body: contactFormSubmission,
    });

    return successResponse();
  } catch (error) {
    if (error instanceof Error) {
      return data({ error: error.message }, { status: 400 });
    }
    return data({ error: 'Network error please try again' }, { status: 400 });
  }
};
