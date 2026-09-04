import { LoaderFunctionArgs } from 'react-router-dom';
import { AuthenticationError } from '~/lib/.server/error-types';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import { GroupType } from '../group-finder/types';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';
import {
  fetchGroupDetailFromRock,
  isRockGroupGuid,
  normalizeGroupGuid,
} from './group-detail-rock.server';

export type LoaderReturnType = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
  groupGuid: string;
  group: GroupType | null;
  /**
   * Rock `IsPublic`. False for Private groups loaded via a shared direct link.
   * Related-groups search still uses Algolia, which never indexes Private groups.
   */
  isPublic: boolean;
};

export { normalizeGroupGuid };

export async function loader({ params }: LoaderFunctionArgs) {
  const groupGuid = params.path || '';

  if (!groupGuid) {
    throw new Error('Group not found');
  }

  const appId = process.env.ALGOLIA_APP_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;
  const algoliaIndexes = getServerAlgoliaIndexes();

  if (!appId || !searchApiKey) {
    throw new AuthenticationError('Algolia credentials not found');
  }

  const normalizedGuid = isRockGroupGuid(groupGuid)
    ? normalizeGroupGuid(groupGuid)
    : groupGuid;
  const detail = isRockGroupGuid(groupGuid)
    ? await fetchGroupDetailFromRock(normalizedGuid)
    : null;

  return Response.json({
    ALGOLIA_APP_ID: appId,
    ALGOLIA_SEARCH_API_KEY: searchApiKey,
    algoliaIndexes,
    groupGuid: normalizedGuid,
    group: detail?.group ?? null,
    isPublic: detail?.isPublic ?? true,
  } satisfies LoaderReturnType);
}
