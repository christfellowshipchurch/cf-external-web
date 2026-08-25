import { CollectionItem } from '~/routes/page-builder/types';

export const englishGetInvolvedResources: CollectionItem[] = [
  {
    name: 'Kids',
    summary:
      'For Newborns Through Elementary School - Christ Fellowship Kids is designed to partner with parents as together, we lead our kids to love Jesus, love others, and love life.',
    image: '/assets/images/locations/get-involved/kids.webp',
    pathname: '/ministries/kids',
    contentType: 'REDIRECT_CARD',
    contentChannelId: '1234',
    id: '1',
  },
  {
    name: 'Students',
    summary:
      'For Middle School & High School Students - A place where your student can grow in their relationship with Jesus and their relationships with others.',
    image: '/assets/images/locations/get-involved/students.webp',
    pathname: '/ministries/students',
    contentType: 'REDIRECT_CARD',
    contentChannelId: '1234',
    id: '3',
  },
  {
    name: 'Young Adults',
    summary:
      'For College Students & Young Adults - The perfect place for those who are looking to grow their relationship with Jesus as well as connect with other young adults throughout South Florida.',
    image: '/assets/images/locations/get-involved/ya.webp',
    pathname: '/ministries/young-adults',
    contentType: 'REDIRECT_CARD',
    contentChannelId: '1234',
    id: '2',
  },
  {
    name: 'Groups & Classes',
    summary:
      'For Everyone - Everything you need to get connected and grow in your faith.',
    image: '/assets/images/groups-bg.webp',
    pathname: '/group-finder',
    contentType: 'REDIRECT_CARD',
    contentChannelId: '1234',
    id: '4',
  },
];

export const onlineGetInvolvedResources: CollectionItem[] = [
  {
    name: 'Journey',
    summary: 'Your first step to getting connected!',
    image:
      'https://cloudfront.christfellowship.church/GetImage.ashx/GetImage.ashx?guid=5cbd4b27-2ff1-4e5c-ae77-45b51399be94&quality=20',
    pathname: '/events/journey',
    contentType: 'REDIRECT_CARD',
    contentChannelId: '1234',
    id: '1',
  },
  {
    name: 'Volunteer',
    summary:
      'Volunteer with others to help make a difference in the lives of others.',

    image: '/assets/images/volunteer/hero.webp',
    pathname: '/volunteer',
    contentType: 'REDIRECT_CARD',
    contentChannelId: '1234',
    id: '2',
  },
  {
    name: 'Classes',
    summary: 'Take a class to grow in your faith and connect with others.',
    image: '/assets/images/volunteer/interested-in.webp', // TODO: This image needs to be updated
    pathname: '/class-finder',
    contentType: 'REDIRECT_CARD',
    contentChannelId: '1234',
    id: '3',
  },
  {
    name: 'Groups',
    summary: 'Join a group to grow in your faith and connect with others.',
    image: '/assets/images/groups-bg.webp',
    pathname: '/group-finder',
    contentType: 'REDIRECT_CARD',
    contentChannelId: '1234',
    id: '4',
  },
];

export const spanishGetInvolvedResources: CollectionItem[] = [
  {
    name: 'Niños',
    summary:
      'Para recién nacidos hasta primaria - Christ Fellowship Kids está diseñado para asociarse con los padres para que, juntos, guiemos a nuestros niños a amar a Jesús, amar a los demás y amar la vida.',
    image: '/assets/images/locations/get-involved/kids.webp',
    pathname: '/ministries/kids',
    contentType: 'REDIRECT_CARD',
    contentChannelId: '1234',
    id: '1',
  },
  {
    name: 'Estudiantes',
    summary:
      'Para estudiantes de Middle School  y High School - Un lugar donde tu estudiante puede crecer en su relación con Jesús y en sus relaciones con los demás.',
    image: '/assets/images/locations/get-involved/students.webp',
    pathname: '/ministries/students',
    contentType: 'REDIRECT_CARD',
    contentChannelId: '1234',
    id: '3',
  },
  {
    name: 'Jóvenes Adultos',
    summary:
      'Para estudiantes universitarios y jóvenes adultos - El lugar perfecto para quienes desean crecer en su relación con Jesús y conectarse con otros jóvenes adultos en todo el sur de Florida.',
    image: '/assets/images/locations/get-involved/ya.webp',
    pathname: '/ministries/young-adults',
    contentType: 'REDIRECT_CARD',
    contentChannelId: '1234',
    id: '2',
  },
  {
    name: 'Grupos y Clases',
    summary:
      'Para todos - Todo lo que necesitas para conectarte y crecer en tu fe.',
    image: '/assets/images/groups-bg.webp',
    pathname: '/group-finder',
    contentType: 'REDIRECT_CARD',
    contentChannelId: '1234',
    id: '4',
  },
];

type TabData = {
  label: string;
  mobileLabel: string;
  value: string;
};

export const englishTabData: TabData[] = [
  {
    label: 'Sunday Details',
    mobileLabel: 'Sunday',
    value: 'sunday-details',
  },
  {
    label: 'About Us',
    mobileLabel: 'About',
    value: 'about-us',
  },
  {
    label: 'For Families',
    mobileLabel: 'Families',
    value: 'for-families',
  },
  // {
  //   label: 'Upcoming Events',
  //   mobileLabel: 'Events',
  //   value: 'upcoming-events',
  // },
];

export const spanishTabData: TabData[] = [
  {
    label: 'Detalles del Domingo',
    mobileLabel: 'Domingos',
    value: 'sunday-details',
  },
  {
    label: 'Quienes Somos',
    mobileLabel: 'Conócenos',
    value: 'about-us',
  },
  {
    label: 'Para las Familias',
    mobileLabel: 'Familias',
    value: 'for-families',
  },
  // {
  //   label: 'Próximos Eventos',
  //   mobileLabel: 'Eventos',
  //   value: 'upcoming-events',
  // },
];

export const onlineTabsData: TabData[] = [
  {
    label: 'Sunday Details',
    mobileLabel: 'Sunday',
    value: 'sunday-details',
  },
  {
    label: 'About Us',
    mobileLabel: 'About',
    value: 'about-us',
  },
  // {
  //   label: "Upcoming Events",
  //   mobileLabel: "Events",
  //   value: "upcoming-events",
  // },
];

export const expectSpanishItems = [
  {
    title: 'Ven Como Eres (en serio)',
    description:
      'La ropa cómoda es lo normal.  No necesitas arreglarte de más para visitar un servicio.',
  },
  {
    title: 'Mensajes Relevantes Que Hablan a la Vida Real (aprox. 1 hora)',
    description:
      'Mensajes bíblicos, dinámicos e inspiradores que se relacionan con los desafíos y las preguntas del día a día.',
  },
  {
    title: 'Rostros Amigables y Personas Dispuestas a Ayudar',
    description:
      'Estamos aquí para ayudarte a sentirte cómodo desde el momento en que llegas.',
  },
  {
    title: 'Los Niños También Se Divierten!',
    description:
      'Programas seguros y atractivos están disponibles cada domingo para niños desde recién nacidos hasta 6to grado durante el servicio.',
  },
];

// CF Kids programming runs newborn–6th grade at these campuses; all other
// English campuses run newborn–5th grade.
const sixthGradeCampusUrls = [
  'palm-beach-gardens',
  'port-st-lucie',
  'royal-palm-beach',
  'boynton-beach',
  'stuart',
  'westlake',
  'cf-everywhere',
  'iglesia-palm-beach-gardens',
  'iglesia-royal-palm-beach',
];

export const getKidsGrade = (campusUrl?: string): '5th' | '6th' =>
  campusUrl && sixthGradeCampusUrls.includes(campusUrl) ? '6th' : '5th';

export const expectEnglishItems = (kidsGrade: '5th' | '6th') => [
  {
    title: 'Friendly Faces and Helpful People',
    description:
      'When you walk through the doors at any location, someone will be there to welcome you, and help you find your way.',
  },
  {
    title: 'An Hour Designed to Help You Grow',
    description:
      'Uplifting worship and practical, bible-based messages to help you grow in your faith and thrive in every area of life.',
  },
  {
    title: 'Fun for the Whole Family!',
    description: `Safe and engaging programs are available every Sunday for newborns through ${kidsGrade} grade during service.`,
  },
  {
    title: 'Wondering What to Wear?',
    description:
      'Wear whatever you’re most comfortable in! Whether you want to keep it casual or dress up in your favorite outfit—you’ll fit right in.',
  },
];

// CF Everywhere is online-only, so the in-person list above doesn't apply.
export const expectOnlineItems = [
  {
    title: 'Live Stream',
    description:
      'Sunday mornings are way better together! Tune in live through the YouTube app on your TV and experience church from wherever you are. Want to make it even more fun? Grab your phone and jump into the YouTube live chat to connect, share, and be part of the conversation!',
  },
  {
    title: 'Pre-Service',
    description:
      'Don’t wait for service to start, join us 6 minutes early! Our interactive pre-service is full of energy, lots of surprises, and a little bit of the unexpected. You never know what’s coming, but one thing’s for sure: you’re going to have fun!',
  },
  {
    title: 'Stay Engaged',
    description:
      'Want to know what’s happening and stay in the loop? Check out the Service Guide on the <a href="https://apollos.com/christ-fellowship/f/f32e491b-a88b-412a-bf3b-9de0109557ae" target="_blank">Christ Fellowship mobile app</a>. It’s your go-to spot for everything you need to follow along, participate, and get the most out of your Sunday experience.',
  },
  {
    title: 'Next Steps',
    description:
      'Ready to go beyond Sunday? Take your next step with <a href="/events/journey">the Journey class</a>! Discover new ways to connect, grow, and be part of the Christ Fellowship Everywhere family. Wherever you live, there’s a place for you here!',
  },
];
