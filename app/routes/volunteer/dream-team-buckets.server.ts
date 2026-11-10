import { TTL } from '~/lib/.server/fetch-rock-data';
import { fetchDefinedValues } from '~/lib/.server/rock-defined-values';
import { createImageUrlFromGuid } from '~/lib/utils';
import type { VolunteerAtChurchResource } from './types';

const DREAM_TEAM_BUCKETS_DEFINED_TYPE_ID = 616;

type RawDefinedValue = {
  guid?: string;
  value?: string;
  description?: string;
  attributeValues?: {
    publicDescription?: { value?: string };
    label?: { value?: string };
    image?: { value?: string };
  };
};

function mapDefinedValueToResource(
  item: RawDefinedValue,
): VolunteerAtChurchResource | null {
  const guid = item.guid?.trim();
  if (!guid) return null;

  const name = item.value?.trim() ?? '';
  const description =
    item.attributeValues?.publicDescription?.value?.trim() ||
    item.description?.trim() ||
    '';
  const tag = item.attributeValues?.label?.value?.trim() ?? '';
  const imageGuid = item.attributeValues?.image?.value?.trim() ?? '';
  const image = imageGuid ? createImageUrlFromGuid(imageGuid) : '';

  // Hide buckets that don't have a description, tag, or image(e.g. "Not Sure Yet?" bucket)
  if (!description || !tag || !image) return null;

  const pathname = `/volunteer/church/${guid}`;

  return { name, description, tag, image, pathname };
}

export async function fetchDreamTeamBucketByGuid(
  guid: string,
): Promise<VolunteerAtChurchResource | null> {
  try {
    const [item] = (await fetchDefinedValues({
      guid,
      definedTypeId: DREAM_TEAM_BUCKETS_DEFINED_TYPE_ID,
      activeOnly: true,
      limit: 1,
      attributes: 'simple',
      ttl: TTL.NONE,
    })) as RawDefinedValue[];
    if (!item) return null;
    return mapDefinedValueToResource(item);
  } catch (error) {
    console.error('Error fetching Dream Team Bucket by guid:', error);
    return null;
  }
}

export async function fetchDreamTeamBuckets(): Promise<
  VolunteerAtChurchResource[]
> {
  try {
    const items = (await fetchDefinedValues({
      definedTypeId: DREAM_TEAM_BUCKETS_DEFINED_TYPE_ID,
      activeOnly: true,
      orderBy: 'Order',
      attributes: 'simple',
      ttl: TTL.NONE,
    })) as RawDefinedValue[];

    return items.reduce<VolunteerAtChurchResource[]>((acc, item) => {
      const mapped = mapDefinedValueToResource(item);
      if (mapped) acc.push(mapped);
      return acc;
    }, []);
  } catch (error) {
    console.error('Error fetching Dream Team Buckets:', error);
    return [];
  }
}
