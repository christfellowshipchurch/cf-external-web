import { useLoaderData } from 'react-router-dom';
import { LoaderReturnType } from '../loader';
import { SeriesCard } from '../components/this-series-card.component';

export const InThisSeries = () => {
  const { message, seriesMessages } = useLoaderData<LoaderReturnType>();

  if (!message.seriesTitle || seriesMessages.length === 0) {
    return null;
  }

  return (
    <div className='flex w-full flex-col gap-6 py-12 md:pt-0 md:pb-24'>
      <div className='content-padding'>
        <div className='flex flex-col gap-1 md:gap-2 w-full max-w-screen-content mx-auto'>
          <h2 className='font-extrabold text-[28px] lg:text-[32px]'>
            In This Series
          </h2>
          <p className='text-[#AAAAAA]'>{message.seriesTitle}</p>
        </div>
      </div>

      <div className='pl-5 md:pl-12 lg:pl-18 2xl:pr-18'>
        <div className='max-w-screen-content mx-auto'>
          <ul className='flex overflow-y-hidden overflow-x-auto gap-6 xl:gap-8 py-2 max-w-screen-content w-full max-h-[300px]'>
            {seriesMessages.map((seriesMessage) => (
              <li
                key={seriesMessage.id}
                className='w-full min-w-[318px] max-w-[350px]'
              >
                <SeriesCard message={seriesMessage} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
