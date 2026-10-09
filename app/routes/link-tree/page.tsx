import { useLoaderData } from 'react-router';
import { LinkTreeLoaderData } from './loader';
import { HTMLRenderer } from '~/primitives/html-renderer/html-renderer.component';
import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import { CollectionItem } from '../page-builder/types';
import { ResourceGrid } from './components/resource-grid.component';
import { ResourceList } from './components/resource-list.component';

const linkTreeButtonClass = cn(
  'w-full',
  'hover:enabled:bg-white',
  'hover:enabled:text-navy',
);

export function LinkTreePage() {
  const {
    title,
    content,
    subtitle,
    callsToActions,
    primaryCta,
    resourceCollections,
  } = useLoaderData<LinkTreeLoaderData>();

  return (
    <div className=' bg-navy py-30 content-padding text-white text-center'>
      <h1 className='text-[48px] md:text-[52px] font-extrabold my-16 leading-tight'>
        {title}
      </h1>

      <div
        className={cn(
          'flex',
          'flex-col',
          'gap-6',
          'justify-center',
          'items-center',
          'max-w-[560px]',
          'w-full',
          'mx-auto',
          'font-light',
        )}
      >
        {subtitle && <h2 className='heading-h5 font-bold'>{subtitle}</h2>}
        {content && <HTMLRenderer html={content} />}
        {primaryCta && (
          <Button
            href={primaryCta.url}
            linkClassName='mt-10 w-full'
            className={linkTreeButtonClass}
          >
            {primaryCta.title}
          </Button>
        )}
        {callsToActions && callsToActions.length > 0 && (
          <>
            <h2 className='heading-h5 font-bold mt-4'>Helpful Links</h2>
            <div className='flex flex-col gap-4 w-full'>
              {callsToActions.map((resource, index) => (
                <Button
                  key={index}
                  href={resource.url}
                  linkClassName='w-full'
                  className={linkTreeButtonClass}
                >
                  {resource.title}
                </Button>
              ))}
            </div>
          </>
        )}
        {resourceCollections.map((item) => {
          const layout = item.linkTreeLayout || 'GRID';
          const Component = layout === 'GRID' ? ResourceGrid : ResourceList;
          return (
            <Component
              key={item.id}
              title={item.name}
              resources={item.collection as CollectionItem[]}
            />
          );
        })}
      </div>
    </div>
  );
}
