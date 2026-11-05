import { ActionFunction, data } from 'react-router';
import { SetAReminderType } from './types';
import { postRockData } from '~/lib/.server/fetch-rock-data';
import { fetchCampuses } from '~/lib/.server/rock-campuses';

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = Object.fromEntries(await request.formData());

    const { email, firstName, lastName, phone, campus, serviceTime, beenToCF } =
      formData;

    const beenToCFB =
      typeof beenToCF === 'string' && beenToCF.toLowerCase() === 'true';

    const [getCampusGuid] = await fetchCampuses<{ guid: string }>(
      { name: String(campus ?? '') },
      ['Guid'],
    );

    const formSubmission: SetAReminderType = {
      FirstName: firstName as string,
      LastName: lastName as string,
      CampusLocation: getCampusGuid?.guid,
      Email: email as string,
      PhoneNumber: phone as string,
      ServiceTime: serviceTime as string,
      BeenToCF: beenToCFB,
    };

    // Trigger the workflow for setting a reminder
    await postRockData({
      endpoint: `Workflows/LaunchWorkflow/0?workflowTypeId=936&workflowName=Set%20a%20Reminder`,
      body: formSubmission,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return data({ error: error.message }, { status: 400 });
    }
    return data({ error: 'Network error please try again' }, { status: 400 });
  }
};
