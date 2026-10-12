import { type LoaderFunction, data } from 'react-router';
import { getJourneySessionOptions } from '~/lib/.server/journey-sessions';

export const loader: LoaderFunction = async () => {
  try {
    return data(await getJourneySessionOptions());
  } catch (error) {
    console.error('Failed to load Journey sessions', error);
    return data(
      { error: 'Unable to load Journey sessions. Please try again.' },
      { status: 500 },
    );
  }
};
