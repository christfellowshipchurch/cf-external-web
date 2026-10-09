import { Breadcrumbs } from '~/components';
import heroBgImgStyles from '~/styles/hero-bg-image-styles';
import { HeroContent } from '../components/hero-content.component';
import { useLoaderData } from 'react-router';
import { LoaderReturnType } from '../loader';

export const PodcastsHero = () => {
  const { podcast, latestEpisodes } = useLoaderData<LoaderReturnType>();
  const { title, description, coverImage } = podcast;
  const latestEpisode = latestEpisodes[0];

  return (
    <div className='w-full' style={heroBgImgStyles(coverImage)}>
      <div className='bg-black/50 backdrop-blur-lg'>
        <HeroContent
          title={title}
          description={description}
          coverImage={coverImage}
          latestEpisode={latestEpisode}
        />
        <div className='hidden md:block content-padding'>
          <div className='max-w-screen-content mx-auto'>
            <div className='h-[2px] w-full bg-[#D9D9D9] opacity-50' />
            <div className='flex flex-col md:flex-row justify-between items-center py-10'>
              <Breadcrumbs mode='light' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
