import { MenuItem, SubMenuItem } from './types';

export const welcomeMenuItems: MenuItem[] = [
  {
    id: 'locations',
    title: 'Times & Locations',
    description: 'Find and plan a visit',
    icon: 'map',
    to: '/locations',
  },
  {
    id: 'about',
    title: 'About Us',
    description: 'Our beliefs and history',
    icon: 'church',
    to: '/about',
  },
  {
    id: 'latest-message',
    title: 'Latest Message',
    description: 'See what a service is like',
    icon: 'circlePlayFilled',
    to: '/messages',
  },
  {
    id: 'give',
    title: 'Giving',
    description: 'Impact your world',
    icon: 'heartHand',
    to: '/give',
  },
  {
    id: 'live',
    title: 'Live Broadcast',
    description: 'Join us from anywhere',
    icon: 'youtube',
    to: 'https://www.youtube.com/@ChristFellowship.Church/streams',
  },
];

export const getInvolvedItems: MenuItem[] = [
  {
    id: 'journey',
    title: 'The Journey',
    description: "Life's better together",
    icon: 'arrowTopRight',
    to: '/events/journey',
  },
  {
    id: 'volunteer',
    title: 'Volunteer',
    description: 'Local & Global Opportunities',
    icon: 'handHeart',
    to: '/volunteer',
  },
  {
    id: 'events',
    title: 'Events',
    description: 'Meaningful experiences',
    icon: 'calendarAlt',
    to: '/events',
  },
  {
    id: 'giving',
    title: 'Giving',
    description: 'Impact your world',
    icon: 'heartHand',
    to: '/give',
  },
];

export const nextStepsItems: SubMenuItem[] = [
  {
    id: 'new-believer',
    title: 'New Believer',
    icon: 'heart',
    to: '/yes',
  },
  {
    id: 'baptism',
    title: 'Baptism',
    icon: 'waves',
    to: '/events/interested-in-getting-baptized',
  },
  {
    id: 'take-a-class',
    title: 'Take a Class',
    icon: 'bookOpen',
    to: '/class-finder',
  },
  {
    id: 'join-a-group',
    title: 'Join a Group',
    icon: 'group',
    to: '/group-finder',
  },
];

export const mediaItems: SubMenuItem[] = [
  {
    id: 'messages',
    title: 'Messages',
    icon: 'video',
    to: '/messages',
  },
  {
    id: 'articles',
    title: 'Articles',
    icon: 'bookContent',
    to: '/articles',
  },
  {
    id: 'podcasts',
    title: 'Podcasts',
    icon: 'microphone',
    to: '/podcasts',
  },
  {
    id: 'worship',
    title: 'Worship',
    icon: 'music',
    to: 'link-tree/worship',
  },
  {
    id: 'devotional',
    title: 'Daily Devotional',
    icon: 'bible',
    to: '/daily-devo',
  },
];

export const ministriesItems: SubMenuItem[] = [
  {
    id: 'kids',
    title: 'Kids',
    description: 'Birth - Grade 5',
    to: '/ministries/kids',
  },
  {
    id: 'students',
    title: 'Students',
    description: 'Grades 6 - 12',
    to: '/ministries/students',
  },
  {
    id: 'young-adults',
    title: 'Young Adults',
    description: 'College - 30s',
    to: '/ministries/young-adults',
  },
  {
    id: 'special-needs',
    title: 'Special Needs',
    description: 'Children & Adults',
    to: '/ministries/special-needs',
  },
  {
    id: 'men',
    title: 'Men',
    description: 'Men of all ages',
    to: '/ministries/men',
  },
  {
    id: 'women',
    title: 'Women',
    description: 'Girls of all ages',
    to: '/ministries/women',
  },
  {
    id: 'missions',
    title: 'Missions',
    description: 'Local & Global Outreach',
    to: '/ministries/missions',
  },
  {
    id: 'marriage',
    title: 'Marriage',
    description: 'Support & Resources',
    to: '/ministries/marriage',
  },
  {
    id: 'care',
    title: 'Freedom & Care',
    description: 'Freedom & Recovery',
    to: '/ministries/freedom-and-care',
  },
];

export const moreMenuItems: SubMenuItem[] = [
  {
    id: 'about-us',
    title: 'About Us',
    to: '/about',
  },
  {
    id: 'request-prayer',
    title: 'Request Prayer',
    to: '/request-prayer',
  },
  {
    id: 'contact-us',
    title: 'Contact Us',
    to: 'mailto:hello@christfellowship.church',
  },
  {
    id: 'our-beliefs-and-values',
    title: 'Our Beliefs and Values',
    to: '/about#our-beliefs-and-values',
  },
  {
    id: 'church-leadership',
    title: 'Church Leadership',
    to: '/about#church-leadership',
  },
  {
    id: 'southeastern',
    title: 'Southeastern',
    to: 'https://www.cfseu.com',
  },
];
