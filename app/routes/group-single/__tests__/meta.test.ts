import { describe, expect, it } from 'vitest';

import { meta } from '../meta';
import type { LoaderReturnType } from '../loader';

function metaFor(data: Partial<LoaderReturnType> | undefined) {
  return meta({ data } as never);
}

describe('group-single metadata', () => {
  it('noindexes Private groups so a shared leader link is not crawled', () => {
    const robots = metaFor({
      group: { title: 'Private Group', summary: 'A private group.' },
      isPublic: false,
    } as LoaderReturnType)?.find(
      (entry) => 'name' in entry && entry.name === 'robots',
    );

    expect(robots).toMatchObject({ content: 'noindex, nofollow' });
  });

  it('keeps Public groups indexable', () => {
    const robots = metaFor({
      group: { title: 'Public Group', summary: 'A public group.' },
      isPublic: true,
    } as LoaderReturnType)?.find(
      (entry) => 'name' in entry && entry.name === 'robots',
    );

    expect(robots).toMatchObject({ content: 'index, follow' });
  });
});
