import { useLoaderData } from 'react-router';
import { LoaderReturnType } from '../loader';
import { MoreEpisodesSearch } from '../components/more-episodes-search';

export function MoreEpisodes() {
  const { moreEpisodesHits } = useLoaderData<LoaderReturnType>();

  return <MoreEpisodesSearch hits={moreEpisodesHits} />;
}
