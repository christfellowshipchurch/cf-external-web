import { useRouteLoaderData } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { getLatestMessageFeaturedUrl } from '~/components/navbar/get-latest-message-featured-url';
import type { RootLoaderData } from '~/routes/navbar/loader';
import HTMLRenderer from '~/primitives/html-renderer';
import { chanceContent } from './a-chance.data';
import { IconButton } from '~/primitives/button/icon-button.primitive';
import { cn } from '~/lib/utils';

export function ImageScrollLayout() {
  const rootData = useRouteLoaderData('root') as RootLoaderData | undefined;
  const latestMessageUrl = getLatestMessageFeaturedUrl(
    rootData?.watchReadListen?.featureCards,
  );

  const [activeSection, setActiveSection] = useState<number>(0);
  const [visibleSections, setVisibleSections] = useState<Set<number>>(
    new Set(),
  );
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const intersectionRatios = useRef<Map<number, number>>(new Map());
  const activeSectionRef = useRef<number>(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(
            entry.target.getAttribute('data-card-index') || '0',
          );
          const intersectionRatio = entry.intersectionRatio;

          // Store intersection ratios for all sections
          intersectionRatios.current.set(index, intersectionRatio);

          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, index]));
          }
        });

        // Find the section with the highest intersection ratio
        // Only update if it's significantly higher (hysteresis to prevent flickering)
        let maxIntersection = 0;
        let mostVisibleIndex = activeSectionRef.current;

        intersectionRatios.current.forEach((ratio, index) => {
          if (ratio > maxIntersection) {
            maxIntersection = ratio;
            mostVisibleIndex = index;
          }
        });

        // Only update if:
        // 1. The new section has at least 30% visibility
        // 2. It's at least 10% more visible than the current active section
        const currentRatio =
          intersectionRatios.current.get(activeSectionRef.current) || 0;
        const shouldSwitch =
          maxIntersection >= 0.3 &&
          mostVisibleIndex !== activeSectionRef.current &&
          maxIntersection >= currentRatio + 0.1;

        if (shouldSwitch) {
          activeSectionRef.current = mostVisibleIndex;
          setActiveSection(mostVisibleIndex);
        }
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '0px',
      },
    );

    const currentRefs = sectionRefs.current;
    currentRefs.forEach((section) => {
      if (section) {
        observer.observe(section);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className='relative'>
      <div className='fixed top-0 left-0 w-screen h-48 md:h-64 short-desktop:h-48 bg-linear-to-b from-white via-white to-transparent z-5 pointer-events-none' />

      <div
        className={cn(
          'flex flex-col md:flex-row',
          'max-w-[1500px] short-desktop:max-w-[1200px] mx-auto short-desktop:px-8',
        )}
      >
        {/* Sticky image (md+): stays in view while sections pass, then scrolls with the page after the last section */}
        <div className='hidden md:block w-1/2 shrink-0 relative z-0 pointer-events-none'>
          <div className='sticky top-0 h-screen pl-5 md:pl-12 lg:pl-18 short-desktop:pl-8 short-desktop:lg:pl-12'>
            <div className='flex h-full w-full max-w-[716px] items-center ml-auto'>
              <div className='relative w-full max-w-md xl:max-w-lg short-desktop:max-w-sm short-desktop:xl:max-w-md aspect-square'>
                {chanceContent.map((section, index) => (
                  <img
                    key={section.image}
                    src={section.image}
                    alt=''
                    width={section.imageWidth}
                    height={section.imageHeight}
                    className={`absolute inset-0 w-full h-full object-contain transition-all duration-700 ${
                      index === activeSection
                        ? 'opacity-100 translate-x-0 z-10'
                        : 'opacity-0 -translate-x-8 z-0'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Sections */}
        <div className='relative z-10 w-full md:flex md:w-1/2 md:min-w-0 md:shrink-0 md:justify-end'>
          <div className='mx-auto w-full max-w-[716px] md:mx-0'>
            {chanceContent.map((section, index) => (
              <section
                key={section.title}
                ref={(el) => {
                  sectionRefs.current[index] = el;
                }}
                className={cn(
                  'relative flex items-center p-12 min-h-screen w-full short-desktop:p-8',
                  index === 2 && 'pb-24 md:pb-0', // Add padding to the last section on mobile to prevent content from grayed out from gradient
                )}
                data-card-index={index}
              >
                <div className='flex flex-col justify-center items-center gap-12 short-desktop:gap-8 max-w-2xl mx-auto w-full'>
                  {/* Mobile Image */}
                  <img
                    src={section.image}
                    alt=''
                    width={section.imageWidth}
                    height={section.imageHeight}
                    className='md:hidden w-full max-w-sm'
                  />
                  <div
                    className={`w-full flex flex-col gap-9 short-desktop:gap-6 transition-all duration-1000 ease-out delay-300 ${
                      visibleSections.has(index)
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-8'
                    }`}
                  >
                    <div className='flex flex-col'>
                      <h2 className='text-3xl font-normal text-pretty'>
                        <HTMLRenderer html={section.title} />
                      </h2>
                      <p className='text-gray-600 leading-relaxed text-pretty'>
                        {section.description}
                      </p>
                    </div>
                    <IconButton
                      to={
                        section.buttonLinkFromLatestMessage
                          ? (latestMessageUrl ?? section.buttonLink)
                          : section.buttonLink
                      }
                      className='rounded-[400px] hover:text-ocean!'
                      withRotatingArrow
                      iconClasses='!bg-navy'
                    >
                      {section.buttonTitle}
                    </IconButton>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
