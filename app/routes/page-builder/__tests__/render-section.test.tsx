import { describe, expect, it } from 'vitest';
import { renderSection } from '../page-builder-page';
import type { PageBuilderSection } from '../types';

const collection = (items: number) =>
  ({
    id: 'c1',
    type: 'RESOURCE_COLLECTION',
    name: 'Upcoming Event',
    titleOverride: '',
    content: '',
    collection: Array.from({ length: items }, (_, i) => ({ id: `i${i}` })),
  }) as unknown as PageBuilderSection;

describe('renderSection', () => {
  it('renders nothing for a collection with no items left', () => {
    expect(renderSection(collection(0))).toBeNull();
  });

  it('renders a collection that has items', () => {
    expect(renderSection(collection(1))).not.toBeNull();
  });
});
