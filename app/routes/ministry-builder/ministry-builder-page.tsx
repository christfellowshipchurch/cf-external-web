import { useLoaderData, useLocation } from 'react-router-dom';
import { DynamicHero } from '~/components';
import { PageBuilderLoader } from '../page-builder/types';
import { renderSection } from '../page-builder/page-builder-page';
import { getCarouselCollectionBackgrounds } from '../page-builder/components/builder-utils';
import { MinistryServiceTimes } from './components/ministry-service-times.component';
import { displayServiceTimes } from './utils';

export function MinistryBuilderRoute() {
  const { title, heroImage, callsToAction, sections, services } =
    useLoaderData<PageBuilderLoader>();
  const { pathname } = useLocation();

  const cleanPathname = pathname.split('/')[2].toLowerCase();

  const shouldDisplayServiceTimes = displayServiceTimes(
    services || [],
    cleanPathname,
  );

  const backgrounds = getCarouselCollectionBackgrounds(sections);

  return (
    <div className='bg-white'>
      <DynamicHero
        customTitle={title}
        imagePath={heroImage}
        ctas={callsToAction.map((cta) => ({
          href: cta.url,
          title: cta.title,
        }))}
      />

      {sections.map((section) =>
        renderSection(section, {
          collectionBackground: backgrounds.get(section.id),
        }),
      )}

      {shouldDisplayServiceTimes && (
        <MinistryServiceTimes services={services} />
      )}
    </div>
  );
}

export default MinistryBuilderRoute;
