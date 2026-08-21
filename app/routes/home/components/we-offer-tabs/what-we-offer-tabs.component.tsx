import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '~/lib/utils';
import { whatWeOfferData } from './what-we-offer.data';
import { WhatWeOfferCard } from './what-we-offer-card.component';
import { WhatWeOfferMobileCarousel } from './what-we-offer-mobile-carousel.component';

const tabListClassName =
  'flex w-full gap-1 rounded-full bg-white border border-[#E5E7EB] shadow-sm p-1 max-w-[420px] mx-auto';

// Avoid the button primitive here — its default lg size adds min-w-24 and px-6
// which overflow the three-label pill on narrow viewports.
const tabTriggerClassName = cn(
  'flex flex-1 min-w-0 items-center justify-center',
  'rounded-full py-3 px-3',
  'border border-transparent',
  'text-[#4B5563] font-bold text-sm whitespace-nowrap cursor-pointer',
  'transition-colors duration-150',
  'hover:border-ocean',
  'data-[state=active]:text-white data-[state=active]:bg-ocean',
);

export const WhatWeOfferTabs = () => {
  const [activeTab, setActiveTab] = useState(
    () => whatWeOfferData[0]?.value ?? 'family',
  );

  const activeTabData = whatWeOfferData.find((tab) => tab.value === activeTab);

  return (
    <div className='flex w-full min-w-0 flex-col gap-8'>
      <div className='flex flex-col gap-2 md:gap-4 content-padding'>
        <div className='flex items-center justify-center gap-3'>
          <div className='w-6 h-1 bg-[#56CAEB]' />
          <p className='text-base font-extrabold leading-none text-[#56CAEB]'>
            what we offer.
          </p>
          <div className='w-6 h-1 bg-[#56CAEB]' />
        </div>
        <h2 className='text-text-primary font-extrabold text-[32px] text-center md:text-[52px] leading-tight'>
          Something For Everyone
        </h2>
      </div>

      {/*
        Mobile layout: header + tab pill use content-padding; carousel track uses pl-5
        with basis-[82%] peek slides and mr-5 on the last slide (volunteer-how-it-works pattern).
      */}
      <div className='w-full'>
        <Tabs.Root
          value={activeTab}
          className='w-full flex flex-col gap-4'
          onValueChange={setActiveTab}
        >
          <div className='content-padding lg:mb-6'>
            <Tabs.List className={tabListClassName}>
              {whatWeOfferData.map((tab) => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  className={tabTriggerClassName}
                  data-tab={tab.value}
                >
                  {tab.mobileLabel}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </div>

          {whatWeOfferData.map((tab) => (
            <Tabs.Content
              key={tab.value}
              value={tab.value}
              className={cn(
                'flex flex-col w-full',
                'data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:zoom-in-95 data-[state=active]:duration-300',
              )}
            >
              {/* Mobile: Embla peek carousel — conditional mount resets to slide 0 on tab switch */}
              {activeTab === tab.value && (
                <div className='w-full min-w-0 lg:hidden'>
                  <WhatWeOfferMobileCarousel
                    items={tab.content}
                    tabValue={tab.value}
                  />
                </div>
              )}

              {/* Desktop: rotated card row */}
              <div
                className={cn(
                  'hidden lg:flex mx-auto',
                  'flex-nowrap items-center',
                  'gap-6 xl:gap-2 pb-2',
                  'min-h-[500px]',
                )}
              >
                {tab.content.map((content, index) => (
                  <div
                    key={index}
                    className={cn(
                      'min-w-[230px] lg:min-w-[300px] xl:min-w-[340px]',
                      tab.content.length === 2 && {
                        'lg:-rotate-1': index === 0,
                        'lg:rotate-1': index === 1,
                      },
                      tab.content.length === 3 && {
                        'lg:-rotate-3': index === 0,
                        'lg:rotate-3': index === 2,
                        'lg:rotate-0 lg:mb-4': index === 1,
                      },
                    )}
                    data-card-title={content.name}
                    data-tab-context={tab.value}
                  >
                    <WhatWeOfferCard content={content} />
                  </div>
                ))}
              </div>
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </div>

      <div className='hidden md:block'>
        <p className='text-text-secondary text-center max-w-[630px] mx-auto'>
          {activeTabData?.footerSummary}
        </p>
      </div>
    </div>
  );
};
