import { icons } from '~/lib/icons';
import Icon from '~/primitives/icon';
import HtmlRenderer from '~/primitives/html-renderer';

export const AboutPartial = ({
  aboutTitle,
  aboutContent,
  infoCards,
  whatToExpect,
  moreInfoTitle,
  moreInfoText,
  optionalBlurb,
}: {
  aboutTitle?: string;
  aboutContent?: string;
  infoCards?: EventInfoCardType[];
  whatToExpect?: { title: string; description: string }[];
  moreInfoTitle?: string;
  moreInfoText?: string;
  optionalBlurb?: { title: string; description: string }[];
}) => {
  const cardsToDisplay = (infoCards ?? []).slice(0, 4);

  return (
    <section
      className='flex flex-col items-center py-8 md:py-16 content-padding bg-gray w-full'
      id='about'
    >
      <div className='max-w-screen-content mx-auto w-full flex flex-col items-center gap-8 md:gap-14'>
        <div className='flex flex-col items-center gap-6 w-full'>
          <h2 className='font-extrabold text-center text-[32px]'>
            {aboutTitle ?? 'About This Event'}
          </h2>
          {/* About Section Summary: Rock HTML attribute */}
          {aboutContent && (
            <HtmlRenderer
              html={aboutContent}
              // Lists sit centered as a block but stay left-aligned so bullets hug their text
              className='text-center text-[#717182] text-lg font-medium md:mx-4 max-w-[700px] [&_p:not(:last-child)]:mb-3 [&_ol]:inline-block [&_ol]:text-left [&_ul]:inline-block [&_ul]:text-left'
            />
          )}

          {/* Info Cards */}
          {cardsToDisplay.length > 0 && (
            <div className='flex flex-col md:flex-row md:flex-wrap gap-4 md:gap-6 items-center justify-center w-full'>
              {cardsToDisplay.map((card, index) => (
                <InfoCardComponent
                  key={index}
                  title={card.title}
                  description={card.description}
                  icon={card.icon}
                />
              ))}
            </div>
          )}
        </div>

        {/* Schedule / What to Expect & More Info */}
        <div className='flex flex-col md:flex-row gap-8 md:gap-12 lg:gap-8 lg:justify-between w-full pb-6'>
          {/* Left / Top (Mobile) Side */}
          <div className='w-full max-w-[590px] flex flex-col gap-4'>
            {whatToExpect && whatToExpect.length > 0 && (
              <h3 className='text-xl text-black font-semibold'>
                Schedule / What to Expect
              </h3>
            )}
            <div className='flex flex-col gap-2 items-start'>
              {(whatToExpect ?? []).map((item, index) => (
                <ScheduleItem
                  key={index}
                  number={index + 1}
                  title={item.title}
                  description={item.description}
                />
              ))}
            </div>
          </div>

          {/* Right / Bottom (Mobile) Side */}
          <div className='flex flex-col gap-5 max-w-[640px] w-full'>
            {moreInfoTitle && moreInfoText && (
              <div className='flex flex-col gap-3'>
                <h3 className='text-black text-xl font-semibold'>
                  {moreInfoTitle}
                </h3>
                <HtmlRenderer
                  html={moreInfoText}
                  className='text-[#717182] text-sm font-medium'
                />
              </div>
            )}

            {(optionalBlurb ?? []).map((blurb, index) => (
              <div
                key={`${blurb.title}-${index}`}
                className='bg-white border border-[#BEBDC3] rounded-[12px] flex items-center p-4'
              >
                <div className='text-black'>
                  <b>{blurb.title}</b>
                  <br />
                  <br />
                  <HtmlRenderer
                    html={blurb.description}
                    className='inline [&>p:first-child]:inline'
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ScheduleItem = ({
  title,
  description,
  number,
}: {
  title: string;
  description: string;
  number: number;
}) => {
  return (
    <div className='flex items-start gap-3'>
      <span className='bg-navy text-white rounded-full flex items-center justify-center text-center px-3 size-[30px]'>
        {number}
      </span>
      <div className='flex flex-col gap-1'>
        <h4 className='font-semibold text-lg text-black'>{title}</h4>
        <p className='text-[#717182] text-sm font-medium'>
          {decodeURIComponent(description)}
        </p>
      </div>
    </div>
  );
};

export type EventInfoCardType = {
  title: string;
  description: string;
  icon: keyof typeof icons | string;
};

const InfoCardComponent = ({ title, description, icon }: EventInfoCardType) => {
  return (
    <div className='bg-white pb-10 px-4 pt-6 rounded-lg flex flex-col items-center text-center gap-8 border border-[#E5E5E5] w-full max-w-[312px]'>
      <div className='bg-ocean flex items-center justify-center text-center rounded-full p-2'>
        <Icon
          name={(icon as keyof typeof icons) ?? 'star'}
          className='text-white'
        />
      </div>

      <div className='flex flex-col gap-6'>
        <h3 className='font-medium text-lg text-black'>{title}</h3>

        <p className='font-medium text-sm md:text-base text-black '>
          {description}
        </p>
      </div>
    </div>
  );
};
