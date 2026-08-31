export function isExternalHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://');
}

export function hasValidHref(href?: string): boolean {
  return Boolean(href?.trim());
}

/** Normalizes Rock podcast show URL values to in-app routes. */
export function getPodcastShowHref(url: string): string {
  if (!url?.trim()) {
    return '';
  }

  const trimmed = url.trim();

  if (isExternalHref(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/podcasts/')) {
    return trimmed;
  }

  const slug = trimmed.replace(/^\/+/, '').replace(/^podcasts\/?/, '');
  return slug ? `/podcasts/${slug}` : '/podcasts';
}

/**
 * Resolves the in-app URL for a podcast item that appears inside a collection
 * (Resource Collection cards, series resources, …).
 *
 * Podcast episodes live on per-show content channels in Rock, and the episode
 * item itself only knows its own slug. The parent show slug has to come from
 * the podcast routing index, otherwise the generated URL would be
 * `/podcasts/:episode` — which does not resolve to any route.
 *
 * Returns `null` when the item is a podcast item whose show cannot be
 * resolved, so callers can skip it instead of rendering a broken link.
 */
export function getPodcastCollectionHref({
  channelId,
  showPath,
  episodePath,
  showChannelId,
  episodeShowPath,
}: {
  channelId: string;
  /** `url`/`pathname` attribute of a podcast SHOW item */
  showPath: string;
  /** `pathname`/`url` attribute of a podcast EPISODE item */
  episodePath: string;
  /** The Rock content channel that holds podcast show items */
  showChannelId: string;
  /** Show slug resolved from the routing index for this episode channel */
  episodeShowPath?: string;
}): string | null {
  const cleanSlug = (value: string) => value.trim().replace(/^\/+/, '');

  if (channelId === showChannelId) {
    const slug = cleanSlug(showPath);
    return slug ? `/podcasts/${slug}` : null;
  }

  if (episodeShowPath) {
    const slug = cleanSlug(episodePath);
    return slug ? `/podcasts/${cleanSlug(episodeShowPath)}/${slug}` : null;
  }

  return null;
}
