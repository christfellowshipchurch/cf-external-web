import { getImageUrl } from '~/lib/utils';

export type WhatWeOfferCardItem = {
  image: string;
  tag: string;
  name: string;
  description: string;
  url: string;
};

export type WhatWeOfferTab = {
  value: string;
  label: string;
  mobileLabel: string;
  /** Shown below the tab cards; updates with the active tab */
  footerSummary: string;
  content: WhatWeOfferCardItem[];
};

export const whatWeOfferData: WhatWeOfferTab[] = [
  {
    value: 'family',
    label: 'For My Family',
    mobileLabel: 'Families',
    footerSummary:
      'Programs and environments designed to help kids and students grow, build friendships, and enjoy learning about faith.',
    content: [
      {
        image: getImageUrl('3176684'),
        tag: 'Every Sunday',
        name: 'Sunday Kids',
        description:
          'Fun, age-based classes for kids during Sunday services with games, music, Bible stories, and small group activities.',
        url: '/ministries/kids',
      },
      {
        image: getImageUrl('7bcd69be-8395-45a6-9221-a547461bdcad', {
          useGuid: true,
        }),
        tag: 'Mid Week',
        name: 'Kids University',
        description:
          'A weekday program where kids learn about faith, build friendships, and take part in hands-on activities and lessons.',
        url: '/christ-fellowship-kids-university',
      },
      {
        image: getImageUrl('c9c1aeed-43d0-4e20-9a28-9a96787c02a0', {
          useGuid: true,
        }),
        tag: 'Wednesdays',
        name: 'Students',
        description:
          'A weekly gathering for middle and high school students with worship, teaching, games.',
        url: '/ministries/students',
      },
    ],
  },
  {
    value: 'young-adults',
    label: 'For Young Adults',
    mobileLabel: 'Young Adults',
    footerSummary:
      'Vibrant community and resources designed for young adults and working professionals.',
    content: [
      {
        image: getImageUrl('3176687'),
        tag: 'Every Tuesday',
        name: 'Young Adults',
        description:
          'Young adults and working professionals to meet people, have conversations, and build community.',
        url: '/ministries/young-adults',
      },
      {
        image: getImageUrl('492a58fc-8af1-42b1-9774-3c8804c9fb25', {
          useGuid: true,
        }),
        tag: 'Every Thursday',
        name: 'College Nights',
        description:
          'Weekly discussions, worship, and opportunities to meet other students.',
        url: '/college-nights',
      },
    ],
  },
  {
    value: 'everyone',
    label: 'For Everyone',
    mobileLabel: 'Everyone',
    footerSummary:
      'Cultivate deep connections and meaningful growth with community support.',
    content: [
      {
        image: getImageUrl('3176685'),
        tag: 'Groups',
        name: 'Find Your Group',
        description:
          'Small groups that meet throughout the week around shared interests, Bible studies, life stages, or community.',
        url: '/group-finder',
      },
      {
        image: getImageUrl('3176686'),
        tag: 'Classes',
        name: 'Grow Through Classes',
        description:
          'Short-term classes focused on topics like faith, relationships, parenting, finances, and personal growth.',
        url: '/class-finder',
      },
      {
        image: getImageUrl('3176688'),
        tag: 'Freedom & Care',
        name: 'Freedom & Care',
        description:
          'Support and recovery programs for people walking through difficult seasons.',
        url: '/ministries/freedom-and-care',
      },
    ],
  },
];
