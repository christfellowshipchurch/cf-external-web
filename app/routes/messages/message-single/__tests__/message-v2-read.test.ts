import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestRockV2 } from '~/lib/.server/fetch-rock-v2';
import { getImages } from '~/lib/.server/rock-utils';
import type {
  attributeProps,
  attributeValuesProps,
} from '~/lib/types/rock-types';
import { messageV2Read } from '../loader';

vi.mock('~/lib/.server/redis-config', () => ({ default: null }));
vi.mock('~/lib/.server/fetch-rock-v2', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requestRockV2: vi.fn(),
}));

const PAST = '2020-01-01T00:00:00';
const FUTURE = '2999-01-01T00:00:00';

describe('messageV2Read', () => {
  beforeEach(() => {
    vi.mocked(requestRockV2).mockResolvedValue({
      Url: { value: 'my-message', textValue: 'my-message' },
      CoverImage: { value: 'image-guid', textValue: '' },
    });
  });

  // v1's GetByAttributeValue drops scheduled and expired items, so v2 must too.
  it('skips items outside their date range', async () => {
    const message = await messageV2Read('my-message').map({
      items: [
        { Guid: 'scheduled', Title: 'Scheduled', StartDateTime: FUTURE },
        { Guid: 'live', Title: 'Live', StartDateTime: PAST },
      ],
    });

    expect(message.title).toBe('Live');
    expect(requestRockV2).toHaveBeenCalledWith({
      path: 'contentchannelitems/live/attributevalues',
    });
  });

  // v2 sends no attribute definitions; without keys getImages finds no cover image.
  it('gives getImages the attribute keys it needs for the cover image', async () => {
    const message = await messageV2Read('my-message').map({
      items: [{ Guid: 'live', Title: 'Live', StartDateTime: PAST }],
    });

    expect(
      getImages({
        attributeValues: message.attributeValues as attributeValuesProps,
        attributes: message.attributes as attributeProps,
      }),
    ).toHaveLength(1);
  });

  it('throws on a miss so fetchRockV2 falls back to v1', async () => {
    await expect(
      messageV2Read('my-message').map({ items: [] }),
    ).rejects.toThrow(/not found in Rock v2/);
  });
});
