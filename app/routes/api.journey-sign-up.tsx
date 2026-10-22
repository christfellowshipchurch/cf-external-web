import { type ActionFunction, data } from 'react-router';
import { getJourneySessionOptions } from '~/lib/.server/journey-sessions';
import { postRockWorkflowLaunchWithApiInitiator } from '~/lib/.server/rock-workflow';
import {
  childcareFieldName,
  JOURNEY_CHILDCARE_AGE_RANGES,
  JOURNEY_CHILDCARE_MAX_COUNT,
  JOURNEY_SESSION_NUMBERS,
  type JourneySessionOption,
} from '~/lib/journey-sessions';

/** Rock workflow type "Journey Session Sign Up" (copied from 1833). */
const JOURNEY_SESSION_WORKFLOW_TYPE_ID = '1968';

/**
 * The workflow's `Group` drives the email, contact, Spanish and online logic.
 * Registrations are one campus, so the earliest selected session's group is
 * the primary.
 */
const pickPrimaryGroupGuid = (selected: JourneySessionOption[]) =>
  [...selected].sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
    ?.groupGuid;

/**
 * Journey "Plan Your Journey" sign-up. Each selected session is sent as
 * `SessionNGroup`; the Rock workflow adds the person to each group with the
 * matching `SessionN` member flag and reads the session time from the group.
 * Unselected sessions are omitted so the workflow can skip them. One workflow
 * (1968) handles English and Spanish; it picks the language from `Group`.
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
    const { options } = await getJourneySessionOptions({
      fresh: true,
    });

    const sessionFields: Record<string, string> = {};
    const selectedOptions: JourneySessionOption[] = [];
    for (const { sessionNumber, groupGuid } of selectedGroups) {
      const option = options.find(
        (candidate) =>
          candidate.sessionNumber === sessionNumber &&
          candidate.groupGuid === groupGuid,
      );
      if (!option || option.isPast) {
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
      selectedOptions.push(option);
    }

    // The form keeps a registration to one campus; the confirmation email
    // lists one campus and location, so reject a mix.
    if (new Set(selectedOptions.map((option) => option.campusId)).size > 1) {
      return data(
        { error: 'Please choose all sessions at the same campus.' },
        { status: 400 },
      );
    }

    // Childcare need is inferred from which counts are sent: only ranges with
    // 1–8 children, and only when a selected session's group offers childcare.
    const offersChildcare = selectedOptions.some(
      (option) => option.offersChildcare,
    );
    const childcareFields: Record<string, string> = {};
    for (const { key } of JOURNEY_CHILDCARE_AGE_RANGES) {
      const raw = field(childcareFieldName(key));
      if (!raw) continue;
      const count = Number(raw);
      if (
        !Number.isInteger(count) ||
        count < 0 ||
        count > JOURNEY_CHILDCARE_MAX_COUNT
      ) {
        return data(
          { error: 'Please enter a valid number of children.' },
          { status: 400 },
        );
      }
      if (offersChildcare && count > 0) childcareFields[key] = String(count);
    }

    await postRockWorkflowLaunchWithApiInitiator({
      workflowTypeId: JOURNEY_SESSION_WORKFLOW_TYPE_ID,
      workflowName: 'Journey Sign Up',
      body: {
        FirstName: firstName,
        LastName: lastName,
        PrimaryPhoneNumber: phone,
        EmailAddress: email,
        AtCF: atCF,
        Reason: reason,
        LaunchSource: 'app',
        Group: pickPrimaryGroupGuid(selectedOptions) ?? '',
        ...sessionFields,
        ...childcareFields,
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
