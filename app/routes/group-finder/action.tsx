import type { ActionFunctionArgs } from 'react-router';
import {
  findOrCreateRockPersonForSignup,
  launchGroupClassSignupWorkflow,
} from '~/lib/.server/rock-signup';

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = Object.fromEntries(await request.formData());

    const firstName = formData.firstName?.toString() ?? '';
    const lastName = formData.lastName?.toString() ?? '';
    const phoneNumber = formData.phoneNumber?.toString() ?? '';
    const email = formData.email?.toString() ?? '';
    const groupId = formData.groupId?.toString() ?? '';
    // TODO: write campus to Rock person (PrimaryCampusId) once campus ID lookup is available
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

    const personId = await findOrCreateRockPersonForSignup({
      firstName,
      lastName,
      email,
      phoneNumber,
    });

    await launchGroupClassSignupWorkflow(groupId, personId);

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
