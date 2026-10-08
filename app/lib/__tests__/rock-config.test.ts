import { describe, expect, it } from 'vitest';
import { toPublicRockUrl } from '../rock-config';

describe('toPublicRockUrl', () => {
  it('moves internal Rock links to the public host, keeping path and query', () => {
    expect(
      toPublicRockUrl('http://Rock.gocf.org/page/414?EventOccurrenceId=1529#x'),
    ).toBe(
      'https://rock.christfellowship.church/page/414?EventOccurrenceId=1529#x',
    );
  });

  it.each([
    'https://rock.christfellowship.church/page/414',
    'https://www.christfellowship.church/class-finder',
    'https://notrock.gocf.org.evil.com/page/414',
    '/relative/path',
    '',
  ])('leaves %j unchanged', (url) => {
    expect(toPublicRockUrl(url)).toBe(url);
  });
});
