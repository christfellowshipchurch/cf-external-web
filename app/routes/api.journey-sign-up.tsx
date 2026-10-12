import { type ActionFunction, data } from 'react-router';
import { getJourneySessionOptions } from '~/lib/.server/journey-sessions';
import { postRockWorkflowLaunchWithApiInitiator } from '~/lib/.server/rock-workflow';
import { JOURNEY_SESSION_NUMBERS } from '~/lib/journey-sessions';
import { isSpanishCampusLabel } from './events/event-single/registration.data';

/**
 * Journey "Plan Your Journey" sign-up. Each selected session is sent as
 * `SessionNGroup` + `SessionNDateTime`; the Rock workflow adds the person to
 * each group with the matching `SessionN` member flag. Unselected sessions are
 * omitted so the workflow can skip them.
 */
export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData();
    const field = (name: string) => formData.get(name)?.toString().trim() ?? '';

    const firstName = field('firstName');
    const lastName = field('lastName');
    const phone = field('phone');
    const email = field('email');
    const atCF = field('atCF');
    const reason = field('reason');
    const hopeToGet = field('hopeToGet');
    const preferredCampusId = Number(field('preferredCampusId'));

    if (!firstName || !lastName || !phone || !email || !atCF || !reason) {
      return data({ error: 'Missing required fields' }, { status: 400 });
    }

    const selectedGroups = JOURNEY_SESSION_NUMBERS.map((sessionNumber) => ({
      sessionNumber,
      groupGuid: field(`session${sessionNumber}Group`),
    })).filter(({ groupGuid }) => groupGuid);

    if (selectedGroups.length === 0) {
      return data(
        { error: 'Please select at least one session.' },
        { status: 400 },
      );
    }

    // Re-check against live Rock data: the page may have sat open past a
    // session's start, or the last seat may have been taken since it loaded.
    const { campuses, options } = await getJourneySessionOptions({
      fresh: true,
    });

    const sessionFields: Record<string, string> = {};
    for (const { sessionNumber, groupGuid } of selectedGroups) {
      const option = options.find(
        (candidate) =>
          candidate.sessionNumber === sessionNumber &&
          candidate.groupGuid === groupGuid,
      );
      if (!option) {
        return data(
          {
            error: `Session ${sessionNumber} is no longer available. Please choose another time.`,
          },
          { status: 400 },
        );
      }
      if (option.isFull) {
        return data(
          {
            error: `Session ${sessionNumber} is full. Please choose another time.`,
          },
          { status: 400 },
        );
      }
      sessionFields[`Session${sessionNumber}Group`] = option.groupGuid;
      // Eastern wall-clock literal, the same offset-less format Rock stores.
      sessionFields[`Session${sessionNumber}DateTime`] =
        `${option.startsAt}:00`;
    }

    const preferredCampus = campuses.find(
      (campus) => campus.id === preferredCampusId,
    );
    const isSpanish = isSpanishCampusLabel(preferredCampus?.name ?? '');

    await postRockWorkflowLaunchWithApiInitiator({
      workflowTypeId: isSpanish ? '1835' : '1833',
      workflowName: 'Journey Sign Up',
      body: {
        FirstName: firstName,
        LastName: lastName,
        PrimaryPhoneNumber: phone,
        EmailAddress: email,
        AtCF: atCF,
        Reason: reason,
        LaunchSource: 'app',
        ...(hopeToGet ? { hopetoget: hopeToGet } : {}),
        ...sessionFields,
      },
      instanceName: `${firstName} ${lastName}`.trim(),
    });

    return data({ success: true });
  } catch (error) {
    console.error('Journey sign up failed', error);
    return data(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
};
