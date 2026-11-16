import { TTL } from '~/lib/.server/fetch-rock-data';
import {
  fetchViaV2Search,
  type V2SearchEntity,
} from '~/lib/.server/rock-v2-search';

import type { ChurchRole } from './types';

type RawConnectionOpportunity = {
  guid?: string;
  name?: string;
  description?: string;
};

function mapOpportunityToRole(
  item: RawConnectionOpportunity,
): ChurchRole | null {
  const id = item.guid?.trim();
  if (!id) return null;

  const title = item.name?.trim();
  if (!title) return null;

  const description = item.description?.trim() ?? '';

  return { id, title, description };
}

const CONNECTION_OPPORTUNITIES_V2: V2SearchEntity = {
  v1Endpoint: 'ConnectionOpportunities',
  model: 'connectionopportunities',
  searchKey: 'connectionOpportunities',
  entityName: 'ConnectionOpportunity',
  fields: ['Id', 'Guid', 'Name', 'Description', 'Order'],
};

export async function fetchChurchRolesByPreferenceAreaGuid(
  bucketGuid: string,
): Promise<ChurchRole[]> {
  try {
    const raw = await fetchViaV2Search(
      {
        endpoint: 'ConnectionOpportunities/GetByAttributeValue',
        queryParams: {
          $orderby: 'Order',
          attributeKey: 'preferenceArea',
          value: bucketGuid,
        },
        ttl: TTL.SHORT,
      },
      CONNECTION_OPPORTUNITIES_V2,
    );

    const items: RawConnectionOpportunity[] = Array.isArray(raw)
      ? raw
      : raw
        ? [raw]
        : [];

    return items.reduce<ChurchRole[]>((acc, item) => {
      const mapped = mapOpportunityToRole(item);
      if (mapped) acc.push(mapped);
      return acc;
    }, []);
  } catch (error) {
    console.error(
      'Error fetching church roles by preference area guid:',
      error,
    );
    return [];
  }
}
