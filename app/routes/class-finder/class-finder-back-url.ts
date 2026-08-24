const CLASS_FINDER_PATH = '/class-finder';

/** Restore finder filters passed by a class card, with safe fallback for direct visits. */
export function getClassFinderBackUrl(state: unknown): string {
  if (!state || typeof state !== 'object') return CLASS_FINDER_PATH;

  const fromClassFinder = (state as { fromClassFinder?: unknown })
    .fromClassFinder;

  if (
    typeof fromClassFinder === 'string' &&
    (fromClassFinder === CLASS_FINDER_PATH ||
      fromClassFinder.startsWith(`${CLASS_FINDER_PATH}?`))
  ) {
    return fromClassFinder;
  }

  return CLASS_FINDER_PATH;
}
