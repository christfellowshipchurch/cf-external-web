import { trimRemovingInvisibleUnicode } from '~/lib/text-content';
import { clsx, type ClassValue } from 'clsx';
import camelCase from 'lodash/camelCase';
import mapKeys from 'lodash/mapKeys';
import mapValues from 'lodash/mapValues';
import { twMerge } from 'tailwind-merge';
import { ShareMessages } from './types/messaging';
import {
  addMinutes,
  setMinutes,
  setHours,
  setSeconds,
  parseISO,
  format,
  nextSunday,
} from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Server Utils */
export function normalize(data: object): object {
  if (Array.isArray(data)) return data.map((n) => normalize(n));
  if (typeof data !== 'object' || data === null) return data;
  const normalizedValues = mapValues(data, (n) => normalize(n));
  return mapKeys(normalizedValues, (value, key: string) => camelCase(key));
}

export const enforceProtocol = (uri: string) =>
  uri?.startsWith('//') ? `https:${uri}` : uri;

export const createImageUrlFromGuid = (uri: string) =>
  uri?.split('-')?.length === 5
    ? `${process.env.CLOUDFRONT}/GetImage.ashx?guid=${uri}`
    : enforceProtocol(uri);

/**
 * Appends Rock `GetImage.ashx` resize params. Other URLs (e.g. `GetAvatar.ashx`) are returned unchanged.
 */
export function withRockGetImageSizing(
  raw: string,
  sizing: { maxwidth: number; maxheight: number; quality?: number },
): string {
  const trimmed = raw.trim();
  if (!trimmed || !/GetImage\.ashx/i.test(trimmed)) return raw;
  try {
    const url = new URL(trimmed);
    url.searchParams.set('maxwidth', String(sizing.maxwidth));
    url.searchParams.set('maxheight', String(sizing.maxheight));
    if (sizing.quality !== undefined) {
      url.searchParams.set('quality', String(sizing.quality));
    }
    return url.toString();
  } catch {
    const joiner = trimmed.includes('?') ? '&' : '?';
    const q = sizing.quality !== undefined ? `&quality=${sizing.quality}` : '';
    return `${trimmed}${joiner}maxwidth=${sizing.maxwidth}&maxheight=${sizing.maxheight}${q}`;
  }
}

export const getIdentifierType = (identifier: string | number) => {
  const guidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const intRegex = /\D/g;
  const stringId = identifier?.toString();

  if (stringId?.match(guidRegex)) {
    return {
      type: 'guid',
      value: identifier,
      query: `Guid eq (guid'${identifier}')`,
    };
  }
  if (!stringId?.match(intRegex)) {
    return { type: 'int', value: identifier, query: `Id eq ${identifier}` };
  }

  return { type: 'custom', value: identifier, query: null };
};

export const shareMessaging = ({
  title,
  shareMessages,
  url,
}: ShareMessages) => {
  const defaultShareMessages = {
    title: `${title}`,
    faceBook: `Check out this article from Christ Fellowship Church!`,
    twitter: `${title} at Christ Fellowship Church`,
    email: {
      subject: `${title} - Christ Fellowship Church`,
      body: `I thought you might be interested in this article from Christ Fellowship: ${url} \n\n`,
    },
    sms: `I thought you might be interested in this article from Christ Fellowship: ${url}`,
  };
  const messages = {
    ...defaultShareMessages,
    ...shareMessages,
  };
  return messages;
};
let _uniqueIdCounter = 0;
const uniqueId = () => String(++_uniqueIdCounter);

interface EventDetails {
  title: string;
  description: string;
  address: string;
  startTime: string | Date;
  endTime: string | Date;
  url?: string;
}

export const icsLink = (event: EventDetails): string => {
  const { title, description, address, url } = event;
  let { startTime, endTime } = event;

  if (typeof startTime === 'string' || typeof endTime === 'string') {
    startTime = parseISO(startTime as string);
    endTime = parseISO(endTime as string);
  }

  // Ensure dates are in the correct timezone
  const formatDateInTimezone = (date: Date) => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const icsString = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//www.cf.church//Christ Fellowship Church',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
    `UID:${uniqueId()}-@christfellowship.church`,
    `DTSTART;TZID=America/New_York:${formatDateInTimezone(startTime)}`,
    `DTEND;TZID=America/New_York:${formatDateInTimezone(endTime)}`,
    `SUMMARY:${title}`,
    `URL:${url ?? document?.URL ?? 'https://www.christfellowship.church'}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${address}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  // We use blob method and removed `charset=utf8` in order to be compatible with Safari IOS
  const blob = new Blob([icsString], { type: 'text/calendar' });
  const calendarLink = window.URL.createObjectURL(blob);

  return calendarLink;
};

export const googleCalendarLink = (event: EventDetails): string => {
  const { title, description, address, url } = event;
  let { startTime, endTime } = event;

  if (typeof startTime === 'string' || typeof endTime === 'string') {
    startTime = parseISO(startTime as string);
    endTime = parseISO(endTime as string);
  }

  const formatDate = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDate(startTime as Date)}/${formatDate(endTime as Date)}`,
    details: `${description}\n\n${url ?? ''}`,
    location: address,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

function parseTimeAsInt(_time: string) {
  const time = _time?.toString().trim().toUpperCase();
  const a = time.match(/(AM)|(PM)/g)?.join();
  const [hour, minute] = time
    .replace(/(AM)|(PM)/g, '')
    .trim()
    .split(':')
    .map((n) => parseInt(n));
  const hour24 = a === 'PM' ? hour + 12 : hour;

  return [hour24, minute];
}

interface ServiceTime {
  day: string;
  time: string;
}

export function icsLinkEvents({
  title,
  description = 'Join us this Sunday!',
  serviceTimes,
  address,
  campusName,
  url,
}: {
  title?: string;
  description?: string;
  serviceTimes: ServiceTime[];
  address: string;
  campusName: string;
  url?: string;
}) {
  return serviceTimes.map(({ day: _day, time }) => {
    const now = new Date();
    const [hour, minute] = parseTimeAsInt(time);
    let sunday = nextSunday(now);
    sunday = setMinutes(sunday, minute ?? 0);
    sunday = setHours(sunday, hour ?? 0);
    sunday = setSeconds(sunday, 0);

    return {
      label: `${time}`,
      event: {
        title: title
          ? title
          : campusName !== 'Trinity'
            ? `Sunday service at Christ Fellowship Church in ${campusName}`
            : 'Sunday service at Trinity Church by Christ Fellowship',
        description,
        address,
        startTime: sunday,
        endTime: addMinutes(sunday, 90),
        url: url ? url : 'https://www.christfellowship.church',
      },
    };
  });
}

export const googleLink =
  'https://play.google.com/store/apps/details?id=com.subsplash.thechurchapp.s_BSVMPR&pcampaignid=web_share';
export const appleLink =
  'https://apps.apple.com/us/app/christ-fellowship-app/id785979426';

// Utility function to detect Apple devices
export const isAppleDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod|macintosh/.test(userAgent);
};

export const isValidZip = (zip: string) => /^[0-9]{5}(?:-[0-9]{4})?$/.test(zip);

export const latLonDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }
  const radlat1 = (Math.PI * lat1) / 180;
  const radlat2 = (Math.PI * lat2) / 180;
  const theta = lon1 - lon2;
  const radtheta = (Math.PI * theta) / 180;
  let dist =
    Math.sin(radlat1) * Math.sin(radlat2) +
    Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  if (dist > 1) {
    dist = 1;
  }
  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515;
  return dist;
};

/**
 * Get the first paragraph of a given HTML string
 * @param html - The HTML string to parse
 * @returns The first paragraph of the HTML string
 */
export const getFirstParagraph = (html: string): string => {
  if (typeof window === 'undefined') {
    // Server-side: Use a simple regex to extract text between <p> tags
    const match = html.match(/<p[^>]*>(.*?)<\/p>/i);
    return match ? match[1].replace(/<[^>]+>/g, '') : '';
  }

  // Client-side: Use DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const firstParagraph = doc.querySelector('p');
  return firstParagraph?.textContent || '';
};

const htmlToPlainText = (html: string): string => {
  if (!html) return '';

  if (typeof window === 'undefined') {
    return trimRemovingInvisibleUnicode(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/\s*(?:p|div|h[1-6]|li|tr|td|th|blockquote)\s*>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&#(?:160|x0*A0);/gi, ' ')
        .replace(/\s+/g, ' '),
    );
  }

  // Normalize line breaks and block boundaries to spaces before extracting
  // text — `textContent` alone would mash adjacent lines together (e.g.
  // "Line one<br>Line two" -> "Line oneLine two").
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/\s*(?:p|div|h[1-6]|li|tr|td|th|blockquote)\s*>/gi, ' '),
    'text/html',
  );
  return trimRemovingInvisibleUnicode(
    (doc.body.textContent || '').replace(/\s+/g, ' '),
  );
};

/**
 * Get the first sentence of plain text extracted from HTML
 * @param html - The HTML string to parse
 * @returns The first sentence, or the full plain text if no sentence end is found
 */
export const getFirstSentence = (html: string): string => {
  const text = htmlToPlainText(html);
  if (!text) return '';

  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text;
};

/**
 * Get the first one or two sentences of plain text extracted from HTML.
 * Returns two sentences when their combined length fits within `maxChars`
 * (roughly two lines on a card), otherwise just the first sentence.
 * @param html - The HTML string to parse
 * @param maxChars - Length threshold before falling back to a single sentence
 * @returns The trimmed plain-text snippet
 */
export const getSummarySnippet = (html: string, maxChars = 110): string => {
  const text = htmlToPlainText(html);
  if (!text) return '';

  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!sentences) return text;

  const first = sentences[0].trim();
  if (sentences.length < 2) return first;

  const firstTwo = `${first} ${sentences[1].trim()}`;
  return firstTwo.length <= maxChars ? firstTwo : first;
};

export const parseRockKeyValueList = (
  input: string,
): {
  key: string;
  value: string;
}[] => {
  if (!input || input === '') return [];

  return input
    .split('|')
    .map((item) => {
      const [key, value] = item.split('^');
      // Malformed/empty segments (e.g. a stray trailing `|`, or a Rock
      // matrix row with no `^` pair) have no value to destructure — skip them
      // instead of crashing or rendering a blank entry.
      if (value === undefined) return null;
      return {
        key: decodeURIComponent(key.trim()), // decode the key to handle special characters like %20 for CTAs
        value: value.trim(),
      };
    })
    .filter((item): item is { key: string; value: string } => item !== null);
};

export const parseRockValueList = (input: string): string[] => {
  if (!input?.trim()) return [];
  // Remove a trailing pipe and filter out any empty results
  return input
    .split('|')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export type dayTimes = {
  day: string;
  hour: string[];
};

export const formattedServiceTimes = (serviceTimes: string) =>
  serviceTimes.split('|').reduce((acc: dayTimes[], time: string) => {
    const trimmed = time.trim();
    if (!trimmed) return acc;

    const [day, hour] = trimmed.split('^');
    const dayTrimmed = day?.trim() ?? '';
    if (dayTrimmed.toLowerCase() === 'ondemand') return acc;

    const existingDay = acc.find((item) => item.day === dayTrimmed);

    if (existingDay) {
      existingDay.hour.push(hour);
    } else {
      acc.push({ day: dayTrimmed, hour: [hour] });
    }

    return acc;
  }, []);

export const ensureArray = <T>(data: T | T[]): T[] => {
  return Array.isArray(data) ? data : [data];
};

export const getImageUrl = (
  idOrGuid: string,
  options?: { useGuid?: boolean },
) => {
  const param = options?.useGuid ? 'guid' : 'id';
  return `https://cloudfront.christfellowship.church/GetImage.ashx?${param}=${idOrGuid}`;
};

export const calculateReadTime = (content: string): number => {
  const words = content?.split(' ')?.length ?? 0;
  const readTime = Math.round(words / 200);
  return readTime === 0 ? 1 : readTime;
};
