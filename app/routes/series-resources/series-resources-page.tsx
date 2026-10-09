import { useLoaderData } from 'react-router';
import type { LoaderReturnType } from './types';
import { SeriesResourceCarousel } from './partials/series-carousel.partial';
import { Button } from '~/primitives/button/button.primitive';

export function SeriesResourcesPage() {
  const { series, messages, resources, events } =
    useLoaderData<LoaderReturnType>();

  return (
    <div className='flex flex-col'>
      <img
        src={series.attributeValues.coverImage}
        alt='Series Resources'
        className='w-full h-[45vh] md:h-[60vh] object-cover'
      />
      <div className='max-w-screen-content mx-auto'>
        <div className='content-padding flex flex-col'>
          {/* Info Section */}
          <div className='flex flex-col items-center py-16 gap-8 md:gap-6 text-center'>
            <h1 className='text-2xl lg:text-[52px] font-extrabold leading-none'>
              {series.value}
            </h1>
            <p className='lg:max-w-[720px] lg:text-lg'>{series.description}</p>

            {/* CTAs */}
            <div className='flex flex-col md:flex-row gap-4 w-full  md:w-auto'>
              <Button
                intent='primary'
                className='w-full'
                size='lg'
                href='/locations'
              >
                Times and Locations
              </Button>

              <Button
                intent='secondary'
                className='w-full'
                size='lg'
                href='/daily-devo'
              >
                Daily Devotional
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='w-full flex flex-col'>
        {/* Events Resources Section */}
        {events && events.length > 0 && (
          <SeriesResourceCarousel
            type='resources'
            title='Events'
            items={events.map((event) => ({
              title: event.title,
              summary: event.summary,
              coverImage: event.coverImage,
              url: event.url,
            }))}
            bg='gray'
          />
        )}

        {/* Series Messages */}
        {messages && messages.length > 0 && (
          <SeriesResourceCarousel
            type='messages'
            title='Series Messages'
            items={messages}
            bg='gray'
          />
        )}

        {/* Resources Section */}
        {resources && resources.length > 0 && (
          <SeriesResourceCarousel
            title='Related Resources'
            summary='Explore other resources that may be of interest to you'
            items={resources.map((resource) => ({
              title: resource.title,
              summary: resource.summary,
              coverImage: resource.coverImage,
              url: resource.url,
            }))}
            bg='white'
          />
        )}
      </div>
    </div>
  );
}
