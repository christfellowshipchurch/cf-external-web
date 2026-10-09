import { CardCarouselSection } from '~/components/resource-carousel';
import { useLoaderData } from 'react-router';
import { LoaderReturnType } from '../../loader';

export const UpcomingEvents = () => {
  const { upcomingEvents } = useLoaderData<LoaderReturnType>();

  if (!upcomingEvents.collection?.length) {
    return <div className='pt-8' />;
  }

  return (
    <div className='flex flex-col w-full'>
      <div className='w-full rounded-t-[24px] md:rounded-none bg-gray pt-20 md:pt-8'>
        <CardCarouselSection
          key={upcomingEvents.id}
          title={upcomingEvents?.titleOverride || upcomingEvents.name}
          description={upcomingEvents.content}
          resources={upcomingEvents.collection || []}
          viewMoreLink={upcomingEvents.viewMoreLink || undefined}
        />
      </div>

      {/* FOR NOW WE ARE NOT SHOWING THE GET INVOLVED SECTION */}
      {/* <GetInvolved /> */}
    </div>
  );
};
