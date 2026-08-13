/**
 * Written on finder card click; read on mission “back” (React Router often drops `location.state`).
 */
export type VolunteerFinderBackPayload = {
  missionGroupGuid: string;
  /** `location.search` on the originating finder (`""` or `?category=…`). */
  volunteerListSearch: string;
  /** Omitted by existing volunteer cards; they continue to use the volunteer finder. */
  origin?: 'missions-private-events' | 'community-opportunities';
};

export const VOLUNTEER_FINDER_BACK_STORAGE_KEY =
  'volunteerFinderMissionBack_v1';

function parseFinderBackPayload(
  v: unknown,
  missionGroupGuid: string,
): VolunteerFinderBackPayload | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.missionGroupGuid !== 'string') return null;
  if (o.missionGroupGuid.toUpperCase() !== missionGroupGuid.toUpperCase()) {
    return null;
  }
  if (typeof o.volunteerListSearch !== 'string') return null;
  if (
    o.origin !== undefined &&
    o.origin !== 'missions-private-events' &&
    o.origin !== 'community-opportunities'
  ) {
    return null;
  }
  return {
    missionGroupGuid: o.missionGroupGuid,
    volunteerListSearch: o.volunteerListSearch,
    origin: o.origin,
  };
}

export function readVolunteerFinderBackPayload(
  missionGroupGuid: string,
): VolunteerFinderBackPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(
      VOLUNTEER_FINDER_BACK_STORAGE_KEY,
    );
    if (!raw) return null;
    return parseFinderBackPayload(JSON.parse(raw), missionGroupGuid);
  } catch {
    return null;
  }
}

export function persistVolunteerFinderBackFromCard(
  payload: VolunteerFinderBackPayload,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      VOLUNTEER_FINDER_BACK_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearVolunteerFinderBackPayload(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(VOLUNTEER_FINDER_BACK_STORAGE_KEY);
}
