import { ActionFunction, data } from 'react-router';
import { JourneyFinderSignUpFormType } from './types';
import { postRockWorkflowLaunchWithApiInitiator } from '~/lib/.server/rock-workflow';

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = Object.fromEntries(await request.formData());

    const firstName = formData.firstName?.toString() ?? '';
    const lastName = formData.lastName?.toString() ?? '';
    const phone = formData.phone?.toString() ?? '';
    const email = formData.email?.toString() ?? '';
    const atCF = formData.atCF?.toString() ?? '';
    const reason = formData.reason?.toString() ?? '';
    const hopeToGet = formData.hopeToGet?.toString() ?? '';

    const url = new URL(request.url);
    const group = url.searchParams.get('Group') ?? '';
    const language =
      url.searchParams.get('Language') === 'Spanish' ? 'Spanish' : 'English';
    const workflowTypeId = language === 'Spanish' ? '1835' : '1833';

    if (
      !firstName ||
      !lastName ||
      !phone ||
      !email ||
      !atCF ||
      !reason ||
      !group
    ) {
      return data({ error: 'Missing required fields' }, { status: 400 });
    }

    const submission: JourneyFinderSignUpFormType = {
      FirstName: firstName,
      LastName: lastName,
      PrimaryPhoneNumber: phone,
      EmailAddress: email,
      AtCF: atCF,
      Reason: reason,
      LaunchSource: 'app',
      Group: group,
    };

    if (hopeToGet) {
      submission.hopetoget = hopeToGet;
    }

    await postRockWorkflowLaunchWithApiInitiator({
      workflowTypeId,
      workflowName: 'Journey Finder Sign Up',
      body: submission,
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
