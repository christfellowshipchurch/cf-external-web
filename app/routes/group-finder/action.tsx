import type { ActionFunctionArgs } from 'react-router';
import {
  findOrCreateRockPersonForSignup,
  launchClassSignupWorkflow,
  launchGroupSignupWorkflow,
  resolveGroupClassSignupTarget,
  updateRockPersonCampusForSignup,
} from '~/lib/.server/rock-signup';

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = Object.fromEntries(await request.formData());

    const firstName = formData.firstName?.toString() ?? '';
    const lastName = formData.lastName?.toString() ?? '';
    const phoneNumber = formData.phoneNumber?.toString() ?? '';
    const email = formData.email?.toString() ?? '';
    const groupId = formData.groupId?.toString() ?? '';
    const campus = formData.campus?.toString() ?? '';

    if (
      !firstName ||
      !lastName ||
      !phoneNumber ||
      !email ||
      !groupId ||
      !campus
    ) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const signupTarget = await resolveGroupClassSignupTarget(groupId);
    const personId = await findOrCreateRockPersonForSignup({
      firstName,
      lastName,
      email,
      phoneNumber,
    });

    await updateRockPersonCampusForSignup(personId, campus);
    if (signupTarget === 'group') {
      await launchGroupSignupWorkflow(groupId, personId);
    } else {
      await launchClassSignupWorkflow(groupId, personId);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Network error please try again',
      },
      { status: 400 },
    );
  }
};
