import { useLoaderData } from 'react-router';
import { Button } from '~/primitives/button/button.primitive';
import HTMLRenderer from '~/primitives/html-renderer';
import { LoaderReturnType } from '../loader';

export const ArticleContent = ({ htmlContent }: { htmlContent: string }) => {
  const {
    callToActionSectionTitle,
    callToActionSectionSubtitle,
    callsToAction,
  } = useLoaderData<LoaderReturnType>();
  return (
    <div className='flex flex-col content-padding py-10 lg:pt-16'>
      <div className='flex w-full mx-auto max-w-5xl flex-col lg:max-w-screen-content'>
        <HTMLRenderer
          html={htmlContent || ''}
          className='xl:text-lg font-regular article-content'
        />

        {/* Call to action */}
        {callToActionSectionTitle && callsToAction?.length > 0 && (
          <div className='flex flex-col gap-6 md:flex-row w-full items-start md:items-center justify-between border-solid border-2 border-neutral-lighter bg-gray py-10 px-8 mt-10 rounded-[8px]'>
            <div className='flex flex-col gap-2'>
              <h3 className='text-lg font-extrabold md:text-[28px] md:font-bold leading-snug my-0!'>
                {callToActionSectionTitle}
              </h3>
              {callToActionSectionSubtitle && (
                <p className='text-lg md:text-[21px] my-0!'>
                  {callToActionSectionSubtitle}
                </p>
              )}
            </div>
            <div className='flex flex-col md:flex-row gap-2'>
              {callsToAction?.length > 0 &&
                callsToAction?.slice(0, 2).map((cta, idx) => (
                  <Button
                    key={cta.url || idx}
                    intent={idx === 1 ? 'primary' : 'secondary'}
                    href={cta.url}
                  >
                    {cta.title}
                  </Button>
                ))}
            </div>
          </div>
        )}

        {/* Bottom Divider */}
        <div
          className={`h-2 w-full bg-navy ${callsToAction ? 'mt-10' : 'mt-24'}`}
        />
      </div>
    </div>
  );
};
