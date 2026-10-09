import { ActionFunction, data } from 'react-router';
import { ContactFormType } from './types';
import { postRockData } from '~/lib/.server/fetch-rock-data';

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = Object.fromEntries(await request.formData());

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
