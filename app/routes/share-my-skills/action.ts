import { ActionFunction, data } from 'react-router';
import { postRockWorkflowLaunchWithApiInitiator } from '~/lib/.server/rock-workflow';
import { ShareMySkillsFormType } from './types';

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = Object.fromEntries(await request.formData());

    const skillsInterestsValues: string = Object.keys(formData)
      .filter((key) => key.startsWith('skillsInterests_'))
      .map((key) => formData[key])
      .join(',');

    const { FirstName, LastName, EmailAddress, Campus1, PhoneNumber, Skills } =
      formData;

    const shareMySkillsSubmission: ShareMySkillsFormType = {
      FirstName: FirstName as string,
      LastName: LastName as string,
      EmailAddress: EmailAddress as string,
      Campus1: Campus1 as string,
      PhoneNumber: PhoneNumber as string,
      SkillsInterests: skillsInterestsValues,
      Skills: (Skills as string) ?? '',
      LaunchSource: 'app',
    };

    const firstName = FirstName as string;
    const lastName = LastName as string;

    await postRockWorkflowLaunchWithApiInitiator({
      workflowTypeId: '1874',
      workflowName: 'CFDP%20App%20Share%20My%20Skills',
      body: shareMySkillsSubmission,
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
