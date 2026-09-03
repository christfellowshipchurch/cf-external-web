import { sanitizeCmsHtml } from '~/lib/sanitize';
import { campusPastorRoleLabel } from '../../../util';

export const CampusPastorsQuote = ({
  campusPastor,
  campusUrl,
  isSpanish = false,
  quote,
  title,
}: {
  campusPastor: {
    email: string;
    firstName: string;
    lastName: string;
    photo: string;
  };
  campusUrl?: string;
  isSpanish?: boolean;
  quote: string;
  title: string;
}) => {
  return (
    <div className='w-full rounded-t-[24px] md:rounded-none bg-gray pt-34 md:pt-40 pb-28 content-padding flex justify-center'>
      <div className='w-full flex flex-col gap-20 max-w-screen-content mx-auto'>
        <div className='flex flex-col items-center text-center gap-4'>
          <h2 className='font-extrabold text-[40px] lg:text-[52px] max-w-[780px] leading-tight'>
            {title}
          </h2>
          <p className='lg:text-xl max-w-[520px] text-pretty lg:max-w-[620px]'>
            <span
              dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(quote) }}
            />
          </p>
        </div>

        {/* Pastor */}
        <div className='flex flex-col md:flex-row gap-5 items-center justify-center'>
          <img
            src={campusPastor.photo}
            alt={campusPastor.firstName}
            className='size-[90px] object-cover aspect-square rounded-full'
          />
          <div className='flex flex-col justify-center items-center md:items-start'>
            <h4 className='text-lg text-text-secondary'>
              {campusPastorRoleLabel(campusUrl, isSpanish)}
            </h4>
            <h3 className='font-semibold text-[22px]'>
              {campusPastor.firstName} {campusPastor.lastName}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
};
