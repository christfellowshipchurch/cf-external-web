import { useLoaderData } from 'react-router-dom';
import kebabCase from 'lodash/kebabCase';
import { PageBuilderLoader, PageBuilderSection } from './types';
import {
  CardCarouselSection,
  SingleEventCollectionSection,
} from '~/components/resource-carousel';
import { CTACollectionSection } from './components/cta-collection';
import { ContentBlock } from './components/content-block';
import { ContentBlockData } from './types';
import { ImageGallerySection } from './components/image-gallery';
import { FAQsComponent } from './components/faq';
import { getCarouselCollectionBackgrounds } from './components/builder-utils';

export function renderSection(
  section: PageBuilderSection,
  options?: { collectionBackground?: 'white' | 'gray' },
) {
  const sectionName =
    section.titleOverride !== '' ? section.titleOverride : section.name;

  const anchorId = kebabCase(sectionName?.toLowerCase() || '');

  switch (section.type) {
    case 'EVENT_COLLECTION': {
      const events = section.collection || [];

      if (events.length === 1) {
        return (
          <div key={section.id} id={anchorId} className='scroll-mt-18'>
            <SingleEventCollectionSection
              title={section.titleOverride || section.name}
              description={section.content}
              resource={events[0]}
              viewMoreLink={section.viewMoreLink || undefined}
              className={
                options?.collectionBackground === 'gray'
                  ? 'bg-gray'
                  : 'bg-white'
              }
            />
          </div>
        );
      }

      return (
        <div key={section.id} id={anchorId} className='scroll-mt-18'>
          <CardCarouselSection
            title={section.titleOverride || section.name}
            description={section.content}
            resources={events}
            viewMoreLink={section.viewMoreLink || undefined}
            className={
              options?.collectionBackground === 'gray' ? 'bg-gray' : 'bg-white'
            }
          />
        </div>
      );
    }
    case 'RESOURCE_COLLECTION':
      return (
        <div key={section.id} id={anchorId} className='scroll-mt-18'>
          <CardCarouselSection
            title={section.titleOverride || section.name}
            description={section.content}
            resources={section.collection || []}
            viewMoreLink={section.viewMoreLink || undefined}
            className={
              options?.collectionBackground === 'gray' ? 'bg-gray' : 'bg-white'
            }
          />
        </div>
      );
    case 'CTA_COLLECTION':
      return (
        <div key={section.id} id={anchorId} className='scroll-mt-18'>
          <CTACollectionSection
            title={section.titleOverride || section.name}
            description={section.content}
            resources={section.collection || []}
            viewMoreLink={section.viewMoreLink || undefined}
          />
        </div>
      );
    case 'FAQs':
      if (section.faqs) {
        return (
          <div key={section.id} id={anchorId} className='scroll-mt-18'>
            <FAQsComponent data={section} />
          </div>
        );
      }

      console.error(
        'FAQs section is missing the required faq data:',
        section.id,
      );
      return null;
    case 'IMAGE_GALLERY':
      if (section.imageGallery?.length) {
        return (
          <div key={section.id} id={anchorId} className='scroll-mt-18'>
            <ImageGallerySection data={section} />
          </div>
        );
      }

      console.error(
        'Image Gallery section is missing the required imageGallery data:',
        section.id,
      );
      return null;
    case 'CONTENT_BLOCK':
      return (
        <div key={section.id} id={anchorId} className='scroll-mt-18'>
          <ContentBlock data={section as unknown as ContentBlockData} />
        </div>
      );
    default:
      return (
        <div key={section.id} id={anchorId} className='scroll-mt-18'>
          <h2>{section.titleOverride || section.name}</h2>
          <p>{section.type}</p>
        </div>
      );
  }
}

export function PageBuilderRoute() {
  const { sections } = useLoaderData<PageBuilderLoader>();
  const backgrounds = getCarouselCollectionBackgrounds(sections);

  return (
    <div className='w-full flex flex-col'>
      {sections.map((section) =>
        renderSection(section, {
          collectionBackground: backgrounds.get(section.id),
        }),
      )}
    </div>
  );
}

export default PageBuilderRoute;
