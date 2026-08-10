import type { ClassHitType } from '../../types';

/** One row per distinct `pathName` (URL slug) after aggregating Algolia hits. */
export type GroupedClassTypeRow = {
  pathName: string;
  classType: string;
  coverImage: string;
  title: string;
  summary: string;
  subtitle: string;
  topic: ClassHitType['topic'];
  locations: string;
  format: ClassHitType['format'];
  language: ClassHitType['language'];
};

type Accumulator = {
  pathName: string;
  classType: string;
  coverImage: string;
  title: string;
  summary: string;
  subtitle: string;
  topic: ClassHitType['topic'];
  format: ClassHitType['format'];
  campusLabels: Set<string>;
  languagesSeen: Set<ClassHitType['language']>;
  hitCount: number;
};

function publicPathSlug(hit: ClassHitType): string {
  return (hit.pathName || '').trim();
}

function hitCoverImageUri(hit: ClassHitType): string {
  return hit.coverImage?.sources?.[0]?.uri?.trim() ?? '';
}

/**
 * True when a classes-index hit has the fields the finder needs to render a
 * class-type card. Incomplete session rows (missing `pathName`, `classType`,
 * `title`, or cover art) otherwise surface as broken one-off cards keyed by
 * `objectID`. Cover may come from Algolia or Rock (`rockCoverImagesByPath`).
 */
export function isCompleteClassFinderHit(
  hit: ClassHitType,
  rockCoverImagesByPath: Record<string, string> = {},
): boolean {
  const pathName = publicPathSlug(hit);
  const hasCover = Boolean(
    hitCoverImageUri(hit) || (pathName && rockCoverImagesByPath[pathName]),
  );

  return Boolean(
    pathName &&
    (hit.classType || '').trim() &&
    (hit.title || '').trim() &&
    hasCover,
  );
}

/** Groups hits that share the same public class URL; falls back to `objectID` if no slug. */
function pathNameGroupKey(hit: ClassHitType): string {
  return publicPathSlug(hit) || hit.objectID;
}

function locationLabel(campusLabels: Set<string>, hitCount: number): string {
  const distinct = [...campusLabels].filter((l) => l.length > 0);
  if (distinct.length > 1) return 'Multiple Locations';
  if (distinct.length === 1) return distinct[0];
  if (hitCount > 1) return 'Multiple Locations';
  return '';
}

function languageLabel(
  seen: Set<ClassHitType['language']>,
): ClassHitType['language'] {
  if (seen.size > 1) return 'Multiple Languages';
  return [...seen][0] ?? 'English';
}

export function groupClassTypeHits(
  items: ClassHitType[],
  rockCoverImagesByPath: Record<string, string> = {},
): GroupedClassTypeRow[] {
  const byKey = new Map<string, Accumulator>();

  for (const hit of items) {
    // Skip incomplete Algolia rows (e.g. session records missing required card fields).
    if (!isCompleteClassFinderHit(hit, rockCoverImagesByPath)) continue;

    const key = pathNameGroupKey(hit);
    const campusLabel = hit.campus?.trim() ?? '';
    const existing = byKey.get(key);

    if (existing) {
      existing.hitCount += 1;
      if (campusLabel) existing.campusLabels.add(campusLabel);
      existing.languagesSeen.add(hit.language);
    } else {
      const pathName = publicPathSlug(hit);
      const rockCoverImage = pathName
        ? rockCoverImagesByPath[pathName]
        : undefined;

      byKey.set(key, {
        pathName,
        classType: hit.classType,
        coverImage: rockCoverImage || hit.coverImage?.sources?.[0]?.uri || '',
        title: hit.classType?.trim() || hit.title,
        summary: hit.summary,
        subtitle: hit.subtitle,
        topic: hit.topic,
        format: hit.format,
        campusLabels: new Set(campusLabel ? [campusLabel] : []),
        languagesSeen: new Set([hit.language]),
        hitCount: 1,
      });
    }
  }

  return [...byKey.values()].map((g) => ({
    pathName: g.pathName,
    classType: g.classType,
    coverImage: g.coverImage,
    title: g.title,
    summary: g.summary,
    subtitle: g.subtitle,
    topic: g.topic,
    locations: locationLabel(g.campusLabels, g.hitCount),
    format: g.format,
    language: languageLabel(g.languagesSeen),
  }));
}

export function syntheticHitsFromGrouped(
  groups: GroupedClassTypeRow[],
): ClassHitType[] {
  return groups.map((group, index) => ({
    objectID: `grouped-${index}`,
    pathName: group.pathName,
    title: group.title,
    classType: group.classType,
    subtitle: group.subtitle,
    summary: group.summary?.trim() || group.subtitle,
    coverImage: { sources: [{ uri: group.coverImage }] },
    campus: group.locations,
    groupId: 0,
    _geoloc: { lat: 0, lng: 0 },
    startDate: '',
    endDate: '',
    schedule: '',
    topic: group.topic,
    language: group.language,
    format: group.format,
    _highlightResult: {
      title: { value: group.title, matchLevel: 'none', matchedWords: [] },
      summary: {
        value: group.summary,
        matchLevel: 'none',
        matchedWords: [],
      },
    },
  }));
}
