import camelCase from 'lodash/camelCase';
import { addHours, format, isValid, parse } from 'date-fns';

import { fetchRockData, TTL } from '~/lib/.server/fetch-rock-data';
import { escapeOData } from '~/lib/.server/rock-utils';
import { createImageUrlFromGuid } from '~/lib/utils';

import type { VolunteerMissionDetail } from './types';

type AttrEntry = {
  value?: string;
  valueFormatted?: string;
};

type AttrBag = Record<string, AttrEntry | undefined>;

/** Rock `Groups` row (after `normalize`) plus `Campus` / `GroupType` expands. */
type RockMissionGroup = {
  id?: number;
  name?: string;
  description?: string;
  campus?: { name?: string; shortCode?: string };
  groupType?: { name?: string };
  attributeValues?: AttrBag;
};

function attrKeysRock(keys: string[]): string[] {
  const out: string[] = [];
  for (const key of keys) {
    out.push(key, camelCase(key), key.charAt(0).toLowerCase() + key.slice(1));
  }
  return [...new Set(out)];
}

function readAttrEntry(
  attrs: AttrBag | undefined,
  keys: string[],
): AttrEntry | undefined {
  if (!attrs) return undefined;
  for (const k of attrKeysRock(keys)) {
    const e = attrs[k];
    if (!e) continue;
    const hasValue = e.value != null && String(e.value).trim() !== '';
    const hasFormatted =
      e.valueFormatted != null && String(e.valueFormatted).trim() !== '';
    if (hasValue || hasFormatted) return e;
  }
  return undefined;
}

function readAttr(
  attrs: AttrBag | undefined,
  keys: string[],
): string | undefined {
  const e = readAttrEntry(attrs, keys);
  const v = e?.value;
  if (v != null && String(v).trim() !== '') return String(v).trim();
  return undefined;
}

/** Prefer Rock `ValueFormatted` when present (e.g. times, person name). */
function readAttrFormatted(
  attrs: AttrBag | undefined,
  keys: string[],
): string | undefined {
  const e = readAttrEntry(attrs, keys);
  const f = e?.valueFormatted;
  if (f != null && String(f).trim() !== '') return String(f).trim();
  const v = e?.value;
  if (v != null && String(v).trim() !== '') return String(v).trim();
  return undefined;
}

function parseRockDateTime(value: string): Date | null {
  const t = value.trim();
  if (!t) return null;
  const d = new Date(t);
  return isValid(d) ? d : null;
}

function formatEventDateLabel(value: string): string {
  const trimmed = value.trim();
  for (const dateFormat of ['M/d/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']) {
    const parsed = parse(trimmed, dateFormat, new Date());
    if (isValid(parsed)) {
      return format(parsed, 'EEE d MMM yyyy');
    }
  }
  return trimmed;
}

/** `HH:mm:ss` or `H:mm:ss` on same calendar day as `base`. */
function parseTimeOnDate(base: Date, timeHHmmss: string): Date | null {
  const m = timeHHmmss.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const out = new Date(base.getTime());
  out.setHours(Number(m[1]), Number(m[2]), m[3] != null ? Number(m[3]) : 0, 0);
  return isValid(out) ? out : null;
}

function buildEventSchedule(attrs: AttrBag | undefined): {
  eventDateStr: string;
  eventTimeStr: string;
  eventEndTimeStr: string | undefined;
  calendarStartDateTime: string | undefined;
  calendarEndDateTime: string | undefined;
} {
  const startRaw = readAttr(attrs, ['EventStartDateTime']);
  const startFormatted = readAttrFormatted(attrs, ['EventStartDateTime']);

  let eventDateStr = '—';
  let eventTimeStr = '—';
  let eventEndTimeStr: string | undefined;
  let calendarStartDateTime: string | undefined;
  let calendarEndDateTime: string | undefined;

  const startDate = startRaw ? parseRockDateTime(startRaw) : null;

  if (startDate) {
    eventDateStr = format(startDate, 'EEE d MMM yyyy');
    eventTimeStr = format(startDate, 'h:mm a');
    calendarStartDateTime = startDate.toISOString();
  } else if (startFormatted) {
    const m = startFormatted.match(/^(.+?)\s+(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
    if (m) {
      eventDateStr = formatEventDateLabel(m[1]);
      eventTimeStr = m[2].trim();
    } else {
      eventDateStr = formatEventDateLabel(startFormatted);
    }
  }

  const endTimeFormatted = readAttrFormatted(attrs, ['EventEndTime']);
  const endTimeRaw = readAttr(attrs, ['EventEndTime']);

  if (endTimeFormatted && !/^\d{1,2}:\d{2}:\d{2}/.test(endTimeFormatted)) {
    eventEndTimeStr = endTimeFormatted;
    if (startDate) {
      const endOnStartDay = parse(endTimeFormatted, 'h:mm a', startDate);
      if (isValid(endOnStartDay)) {
        calendarEndDateTime = endOnStartDay.toISOString();
      }
    }
  } else if (endTimeRaw && /^\d{1,2}:\d{2}/.test(endTimeRaw) && startDate) {
    const endOnStartDay = parseTimeOnDate(startDate, endTimeRaw);
    if (endOnStartDay) {
      eventEndTimeStr = format(endOnStartDay, 'h:mm a');
      calendarEndDateTime = endOnStartDay.toISOString();
    }
  } else if (endTimeFormatted) {
    eventEndTimeStr = endTimeFormatted;
  }

  if (startDate && !calendarEndDateTime) {
    calendarEndDateTime = addHours(startDate, 1).toISOString();
  }

  return {
    eventDateStr,
    eventTimeStr,
    eventEndTimeStr,
    calendarStartDateTime,
    calendarEndDateTime,
  };
}

function resolveImageUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return createImageUrlFromGuid(t);
}

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the cover-image fallback from the group's **Event Type** Defined
 * Value. The group attribute holds the Defined Value guid; the image lives as
 * an attribute on that Defined Value, so it needs a second Rock fetch.
 */
async function fetchEventTypeImageUrl(
  attrs: AttrBag | undefined,
): Promise<string | undefined> {
  const eventTypeGuid = readAttr(attrs, ['EventType']);
  if (!eventTypeGuid || !GUID_RE.test(eventTypeGuid)) return undefined;

  let raw: unknown;
  try {
    raw = await fetchRockData({
      endpoint: 'DefinedValues',
      queryParams: {
        $filter: `Guid eq guid'${escapeOData(eventTypeGuid)}'`,
        $top: '1',
        loadAttributes: 'expanded',
      },
      ttl: TTL.SHORT,
    });
  } catch {
    return undefined;
  }

  const row = Array.isArray(raw) ? raw[0] : raw;
  const dvAttrs = (row as { attributeValues?: AttrBag } | undefined)
    ?.attributeValues;
  const imageRaw = readAttr(dvAttrs, [
    'Image',
    'EventTypeImage',
    'CoverImage',
    'Photo',
  ]);
  return resolveImageUrl(imageRaw);
}

async function getPersonIdFromPersonAliasGuid(
  aliasGuid: string,
): Promise<string | null> {
  const res = await fetchRockData({
    endpoint: 'PersonAlias',
    queryParams: {
      $filter: `Guid eq guid'${escapeOData(aliasGuid)}'`,
      $top: '1',
    },
    ttl: TTL.NONE,
  });
  const row = Array.isArray(res) ? res[0] : res;
  const pid = row?.personId ?? row?.PersonId;
  return pid != null ? String(pid) : null;
}

async function fetchPersonNameEmail(
  personId: string,
): Promise<{ name?: string; email?: string }> {
  try {
    // Collection form, not People/{id}: Rock ignores $select on by-id routes and
    // returns the whole entity. A single match arrives unwrapped as an object, a
    // miss as an empty array.
    const res = await fetchRockData({
      endpoint: 'People',
      queryParams: {
        $filter: `Id eq ${personId}`,
        $select: 'FirstName,LastName,NickName,Email',
      },
      ttl: TTL.NONE,
    });
    const p = Array.isArray(res) ? res[0] : res;
    if (!p || typeof p !== 'object') return {};
    const nick = typeof p.nickName === 'string' ? p.nickName.trim() : '';
    const first = typeof p.firstName === 'string' ? p.firstName.trim() : '';
    const last = typeof p.lastName === 'string' ? p.lastName.trim() : '';
    const email = typeof p.email === 'string' ? p.email.trim() : undefined;
    const name = [nick || first, last].filter(Boolean).join(' ').trim();
    return { name: name || undefined, email };
  } catch {
    return {};
  }
}

async function resolveContact(attrs: AttrBag | undefined): Promise<{
  contactName?: string;
  contactEmail?: string;
}> {
  if (!attrs) return {};

  const formattedName = readAttrFormatted(attrs, ['ContactPerson']);
  const personIdRaw = readAttr(attrs, ['ContactPersonId']) ?? '';
  const aliasGuid = readAttr(attrs, ['ContactPerson']) ?? '';

  let personId = /^\d+$/.test(personIdRaw) ? personIdRaw : '';
  const guidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!personId && aliasGuid && guidRe.test(aliasGuid)) {
    const fromAlias = await getPersonIdFromPersonAliasGuid(aliasGuid);
    if (fromAlias) personId = fromAlias;
  }

  if (!personId) {
    return formattedName
      ? { contactName: formattedName, contactEmail: undefined }
      : {};
  }

  const { name, email } = await fetchPersonNameEmail(personId);
  return {
    contactName: name || formattedName || undefined,
    contactEmail: email,
  };
}

/**
 * Loads one volunteer / mission opportunity from Rock by GUID (default: `Groups.Guid`).
 */
export async function fetchVolunteerMissionDetailFromRock(
  groupGuid: string,
): Promise<VolunteerMissionDetail | null> {
  const guid = groupGuid.trim();
  if (!guid) return null;

  const filter = `Guid eq guid'${escapeOData(guid)}'`;

  let raw: unknown;
  try {
    raw = await fetchRockData({
      endpoint: 'Groups',
      queryParams: {
        $filter: filter,
        $top: '1',
        $expand: 'Campus,GroupType',
        loadAttributes: 'expanded',
      },
      ttl: TTL.SHORT,
    });
  } catch {
    return null;
  }

  const row: RockMissionGroup | undefined = Array.isArray(raw)
    ? raw[0]
    : (raw as RockMissionGroup | undefined);

  if (!row || typeof row !== 'object') return null;

  const attrs = row.attributeValues;
  const title =
    readAttr(attrs, ['Title']) ||
    (typeof row.name === 'string' ? row.name.trim() : '') ||
    'Volunteer opportunity';

  const category =
    readAttr(attrs, ['Category']) ||
    (typeof row.groupType?.name === 'string'
      ? row.groupType.name.trim()
      : '') ||
    'Volunteer opportunity';

  const campusName =
    (typeof row.campus?.name === 'string' && row.campus.name.trim()) ||
    (typeof row.campus?.shortCode === 'string' &&
      row.campus.shortCode.trim()) ||
    readAttrFormatted(attrs, ['CampusLocation']) ||
    readAttr(attrs, ['CampusName']) ||
    undefined;

  // Cover image: group photo first, Event Type Defined Value image as fallback.
  const coverRaw = readAttr(attrs, ['Photo']) ?? '';
  const coverImageUrl =
    resolveImageUrl(coverRaw) ?? (await fetchEventTypeImageUrl(attrs));

  const summary =
    readAttr(attrs, ['PublicDescription']) ||
    (typeof row.description === 'string' ? row.description.trim() : '') ||
    '';

  // Not EmailInfo: that copy is for the sign-up confirmation email only.
  const whatToKnow = readAttr(attrs, ['WhatToKnow']) || '';

  const questionsHtml =
    readAttr(attrs, ['QuestionsHtml', 'ContactIntro', 'Questions']) || '';

  const spotsRaw = readAttr(attrs, ['SpotsLeft']);
  let spotsLeftDisplay: string | number | undefined;
  if (spotsRaw !== undefined) {
    const n = Number(spotsRaw);
    spotsLeftDisplay =
      Number.isFinite(n) && String(n) === spotsRaw ? n : spotsRaw;
  }

  const checkInLocation =
    readAttr(attrs, ['CheckInLocation']) || campusName || '—';

  const {
    eventDateStr,
    eventTimeStr,
    eventEndTimeStr,
    calendarStartDateTime,
    calendarEndDateTime,
  } = buildEventSchedule(attrs);

  const missionsUrl = `https://rock.gocf.org/page/1038?Group=${encodeURIComponent(guid)}`;

  const contact = await resolveContact(attrs);

  return {
    title,
    category,
    coverImageUrl,
    summary,
    whatToKnow,
    questionsHtml: questionsHtml || undefined,
    spotsLeftDisplay,
    campusName,
    checkInLocation,
    eventDateStr,
    eventTimeStr,
    eventEndTimeStr,
    calendarStartDateTime,
    calendarEndDateTime,
    missionsUrl,
    contactName: contact.contactName,
    contactEmail: contact.contactEmail,
  };
}
