import { useState } from 'react';
import { LocationSearch } from '../location-search/location-search.component';
import { DesktopFeaturedItems } from './desktop-features.component';
import { Video } from '~/primitives/video/video.primitive';
import { cn } from '~/lib/utils';

export function DesktopHeroSection() {
  const [isSearching, setIsSearching] = useState(false);

  return (
    <section className='h-[110vh] max-h-[1200px] w-full bg-white mt-[-26px] hidden lg:block relative z-30'>
      {/* background image and video */}
      <div className='grid grid-cols-2 size-full relative'>
        {/* Left Column */}
        <img
          className='absolute inset-0 w-1/2 h-full object-cover object-left z-0'
          src='/assets/images/home/home-hero-bg.webp'
          alt=''
          width={1280}
          height={839}
          loading='eager'
          decoding='async'
          fetchPriority='high'
        />
        <div className='absolute inset-0 w-1/2 h-full bg-ocean opacity-90 z-1' />
        <div className='relative h-full' />

        {/* Right Column - Background Video */}
        <div className='relative h-full'>
          <div className='absolute inset-0 w-full h-full pointer-events-none'>
            <img
              src='/assets/images/home/bg-vid.webp'
              alt=''
              width={845}
              height={479}
              className='w-full h-full object-cover absolute inset-0 z-0'
              loading='eager'
              decoding='async'
              fetchPriority='high'
            />
            <Video
              wistiaId='ieybr1sv38'
              autoPlay
              muted
              loop
              className='w-full h-full absolute inset-0 z-2 pointer-events-none'
            />
          </div>
        </div>
      </div>

      {/* Content Overlay */}
      <div className='absolute inset-0 w-full h-full z-10 flex flex-col pointer-events-none'>
        <div className='flex-1 min-h-0 content-padding'>
          <div className='max-w-screen-content h-full mx-auto w-full pointer-events-auto'>
            <div className='flex h-full w-full flex-col'>
              <div className='flex flex-1 flex-col gap-8 justify-center items-start w-full'>
                <h1 className='text-[64px] xl:text-[86px] text-white font-extrabold leading-none max-w-[600px] z-2'>
                  Find Your <br />
                  People.{' '}
                  <span className='text-dark-navy'>
                    Find <br />
                    Your Purpose.
                  </span>
                </h1>
                <p className='text-white max-w-[470px] xl:max-w-[529px] text-xl z-2'>
                  From inspiring messages to genuine community, Christ
                  Fellowship is a place where you and your family can grow in
                  your faith and make lifelong friendships.
                </p>
                <div
                  className={cn(
                    'relative flex w-fit pb-10',
                    isSearching ? 'z-20' : 'z-3',
                  )}
                >
                  {/* Location Search */}
                  <LocationSearch
                    isSearching={isSearching}
                    setIsSearching={setIsSearching}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured CTAs: white strip under the left column; in flow so long CMS copy
            pushes the headline up instead of covering it. Left padding matches the
            lg content-padding (4.5rem) and the 1432px max-w-screen-content column. */}
        <div className='z-11 w-1/2 min-h-[104px] bg-white pr-6 pl-[max(4.5rem,calc(50%-716px))] pointer-events-auto'>
          <div className='max-w-[600px]'>
            <DesktopFeaturedItems />
          </div>
        </div>
      </div>
      <div className='h-16 w-full bg-white' />
      <hr className='border-neutral-lighter opacity-50 w-[70vw] mx-auto' />
    </section>
  );
}
