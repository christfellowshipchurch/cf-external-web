import { ActionFunction, data } from 'react-router';
import { ContactFormType } from './types';
import { postRockData } from '~/lib/.server/fetch-rock-data';
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

    await postRockData({
      endpoint: `Workflows/LaunchWorkflow/0?workflowTypeId=878&workflowName=CFDP%20App%20Contact%20Us`,
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
