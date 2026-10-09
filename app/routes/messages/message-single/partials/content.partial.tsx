import { useLoaderData } from 'react-router';
import { formatDate } from 'date-fns';
import { LoaderReturnType } from '../loader';
import HTMLRenderer from '~/primitives/html-renderer';

export const MessageContent = () => {
  const { message } = useLoaderData<LoaderReturnType>();

  const formattedDate = formatDate(
    new Date(message.startDateTime),
    'MMMM d, yyyy',
  );

  return (
    <div className='flex w-full flex-col lg:pt-10 lg:pb-2 content-padding'>
      {/* Content */}
      <div className='flex flex-col gap-6 max-w-screen-content w-full mx-auto'>
        {/* Speaker/Date Section */}
        <div className='flex flex-col'>
          <h2 className='font-extrabold text-[32px] leading-tight'>
            {message?.title}
          </h2>
          <div className='flex gap-1 text-[#AAAAAA]'>
            {message?.speaker?.fullName && (
              <p>
                {message?.speaker?.fullName} <span>-</span>
              </p>
            )}

            {formattedDate && <p>{formattedDate}</p>}
          </div>
        </div>
        {/* TODO: Content - Update HTML Renderer? */}
        <HTMLRenderer html={message?.content} />
      </div>
    </div>
  );
};
