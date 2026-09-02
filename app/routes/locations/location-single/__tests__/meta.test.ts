import { describe, it, expect } from 'vitest';
import { meta } from '../meta';
import type { LoaderReturnType } from '../loader';

/**
 * SEO copy is approved marketing content (CFDP-4199) — the exact strings matter,
 * and the city must follow whichever campus is being rendered.
 */
function metaFor(campusUrl: string, campusName: string) {
  const data = { campusUrl, campusName } as LoaderReturnType;
  const descriptors = (
    meta as unknown as (args: {
      data: LoaderReturnType;
    }) => Array<{ title?: string } | { name?: string; content?: string }>
  )({ data });

  const title = descriptors.find((d) => 'title' in d) as
    | { title: string }
    | undefined;
  const description = descriptors.find(
    (d) => 'name' in d && d.name === 'description',
  ) as { content: string } | undefined;

  return { title: title?.title, description: description?.content };
}

describe('location single meta', () => {
  it('uses the campus city in the approved title and description', () => {
    const { title, description } = metaFor(
      'palm-beach-gardens',
      'Palm Beach Gardens',
    );

    expect(title).toBe('Christ Fellowship Church | Palm Beach Gardens, FL');
    expect(description).toBe(
      'Looking for a church in Palm Beach Gardens, FL? Visit Christ Fellowship this Sunday! Enjoy live worship music, biblical teachings, and programs for all ages.',
    );
  });

  it('swaps the city per campus so each location page is distinct', () => {
    const { title, description } = metaFor('boynton-beach', 'Boynton Beach');

    expect(title).toBe('Christ Fellowship Church | Boynton Beach, FL');
    expect(description).toContain('Looking for a church in Boynton Beach, FL?');
  });

  it('keeps bespoke copy for the online campus, which has no city', () => {
    const { title } = metaFor('cf-everywhere', 'Cf Everywhere');

    expect(title).toBe(
      'Christ Fellowship Church Online | Get the Most Out of Life',
    );
  });

  it('keeps Spanish copy for Iglesia campuses', () => {
    const { title, description } = metaFor(
      'iglesia-royal-palm-beach',
      'Iglesia Royal Palm Beach',
    );

    expect(title).toContain('Christ Fellowship Español en Royal Palm Beach');
    expect(description).toContain('Únete');
  });

  it('keeps Spanish copy for Rock campus names', () => {
    const { title } = metaFor(
      'iglesia-palm-beach-gardens',
      'Christ Fellowship Español Palm Beach Gardens',
    );

    expect(title).toContain(
      'Christ Fellowship Español en Palm Beach Gardens, FL',
    );
  });
});
