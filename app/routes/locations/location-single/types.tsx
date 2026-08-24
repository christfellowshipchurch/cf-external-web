import type { WeeklyMinistryService } from './components/during-the-week.component';

export type LocationViewModel = {
  _geoloc?: {
    latitude: number;
    longitude: number;
  };
  additionalInfo: string[];
  backgroundVideoDesktop: string;
  backgroundVideoMobile: string;
  campusId: number;
  campusImage: string;
  campusInstagram: string;
  campusUrl?: string;
  campusLocation?: {
    city: string;
    postalCode: string;
    state: string;
    street1: string;
    street2: string;
  };
  campusName: string;
  campusPastor: {
    email: string;
    firstName: string;
    lastName: string;
    photo: string;
  };
  digitalTourVideo: string;
  mapLink?: string;
  mapUrl?: string;
  objectID: string;
  phoneNumber: string;
  serviceTimes: string;
  setReminderVideo?: string;
  weeklyMinistryServices?: WeeklyMinistryService[];
};
