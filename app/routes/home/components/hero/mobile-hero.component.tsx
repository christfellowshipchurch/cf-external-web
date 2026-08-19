import { useEffect, useState } from 'react';
import { useRouteLoaderData } from 'react-router-dom';
import { LocationSearch } from '../location-search/location-search.component';
import { MobileFeaturedItems } from './mobile-features.component';
import { RootLoaderData } from '~/routes/navbar/loader';
import { Video } from '~/primitives/video/video.primitive';

export const MobileHeroSection = () => {
  const rootData = useRouteLoaderData('root') as RootLoaderData | undefined;
  const siteBanner = rootData?.siteBanner;
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setShowVideo(true);
    }, 2000);
    return () => clearTimeout(id);
  }, []);

  return (
    <section className='h-dvh w-full bg-white pb-8 relative max-h-[700px] block lg:hidden z-30'>
      {/*  Background Video — poster image paints first; iframe loads after idle */}
      <div className='absolute inset-0 w-full h-full z-1'>
        {showVideo ? (
          <Video
            wistiaId='ieybr1sv38'
            autoPlay
            muted
            loop
            className='w-full h-full absolute inset-0 z-1'
          />
        ) : (
          <img
            src='/assets/images/home/bg-vid.webp'
            alt=''
            width={845}
            height={479}
            className='w-full h-full object-cover absolute inset-0 z-1'
            loading='eager'
            decoding='async'
            fetchPriority='high'
          />
        )}
      </div>
      {/*  Background Gradient Overlay */}
      <div className='absolute inset-0 w-full h-full z-2 bg-linear-to-b from-black/20 to-black/80' />
      {/*  Content */}
      <div className='relative z-3 flex flex-col justify-end gap-8 h-full px-4'>
        {/*  Top Divider - hide if site banner is shown so it doesn't overlap */}
        {!siteBanner && (
          <div className='md:hidden absolute top-[82px] left-1/2 -translate-x-1/2 -translate-y-1/2 h-px w-full bg-[#D9D9D9] opacity-50 max-w-[340px] sm:max-w-[500px]' />
        )}

        {/*  Main content */}
        <div className='flex flex-col gap-8 justify-end'>
          {/*  Title */}
          <h1 className='text-5xl text-white font-extrabold leading-none md:px-4'>
            Find Your <br className='hidden md:block ' />
            People.
            <span className='text-ocean'>
              {' '}
              Find <br />
              Your Purpose.
            </span>
          </h1>

          {/*  Description */}
          <p className='text-white max-w-[430px] pr-6 md:px-4'>
            From inspiring messages to genuine community, Christ Fellowship is a
            place where you and your family can grow in your faith and make
            lifelong friendships.
          </p>

          {/* Location Search */}
          <div className='md:px-4'>
            <LocationSearch />
          </div>
        </div>

        {/*  Bottom Divider */}
        {/*  Top spacer */}
        <div className='flex items-center justify-center'>
          <div className='h-px w-full bg-[#D9D9D9] opacity-50' />
        </div>
        <MobileFeaturedItems />
      </div>
    </section>
  );
};
