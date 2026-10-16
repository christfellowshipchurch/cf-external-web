/**
 * Volunteer mission detail page — sourced from Rock REST (not Algolia).
 * Attribute keys are mapped in `volunteer-mission-rock.server.ts` with fallbacks;
 * align Rock attributes with those defaults or set env overrides there.
 */
export interface VolunteerMissionDetail {
  /** Rock Group name (or title attribute). */
  title: string;
  /** Group type name or category attribute. */
  category: string;
  /** Resolved image URL (CloudFront or absolute). */
  coverImageUrl?: string;
  /** Main HTML / text body (“About”). */
  summary: string;
  /** “What to know” copy — Rock group attribute `WhatToKnow`. */
  whatToKnow: string;
  /** Optional HTML shown in Questions before contact line. */
  questionsHtml?: string;
  /** Raw value from Rock for “N spots left” (number or string). */
  spotsLeftDisplay?: string | number;
  /** Primary campus label from expanded Campus. */
  campusName?: string;
  checkInLocation: string;
  eventDateStr: string;
  eventTimeStr: string;
  eventEndTimeStr?: string;
  calendarStartDateTime?: string;
  calendarEndDateTime?: string;
  /** External or internal sign-up URL. */
  missionsUrl?: string;
  contactName?: string;
  contactEmail?: string;
}
