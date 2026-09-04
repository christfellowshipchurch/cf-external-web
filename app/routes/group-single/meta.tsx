import type { MetaFunction } from 'react-router-dom';
import { loader } from './loader';
import type { LoaderReturnType } from './loader';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction<typeof loader> = ({
  data,
}: {
  data?: LoaderReturnType;
}) => {
  if (!data || !data.group) {
    return createMeta({
      title: 'Group Not Found',
      description: 'The group you are looking for does not exist.',
    });
  }
  const groupName = data.group.title;
  const summary = data.group.summary ?? '';
  const description =
    summary.length > 157
      ? `${summary.substring(0, 157)}...`
      : summary || 'Join this group at Christ Fellowship Church';
  return createMeta({
    title: groupName,
    description,
    // Private groups are unlisted: loadable by shared GUID, not by search/crawlers.
    noIndex: data.isPublic === false,
  });
};
