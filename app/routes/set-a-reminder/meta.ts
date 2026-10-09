import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Set a Reminder',
    description:
      'Set a reminder for upcoming events and services at Christ Fellowship Church.',
    path: '/set-a-reminder',
  });
};
