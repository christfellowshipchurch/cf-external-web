import { Link } from 'react-router';
import { CollectionItem } from '~/routes/page-builder/types';

export const ListCard = ({ resource }: { resource: CollectionItem }) => (
  <li className='bg-white rounded-lg shadow-sm flex overflow-hidden border border-neutral-lighter hover:scale-[1.02] transition-all duration-300'>
    <Link
      to={resource.pathname}
      prefetch='intent'
      target={resource.pathname?.includes('http') ? '_blank' : undefined}
      rel={
        resource.pathname?.includes('http') ? 'noopener noreferrer' : undefined
      }
      className='flex w-full'
      aria-label={resource.name}
    >
      <img
        src={resource.image}
        alt={resource.name}
        className='aspect-video object-cover max-w-32'
        loading='lazy'
      />
      <div className='flex flex-col px-4 py-3 md:px-6 md:py-4 text-left'>
        <h3 className='font-bold text-lg text-text-primary line-clamp-2 sm:line-clamp-1'>
          {resource.name}
        </h3>
        <p className='text-sm text-text-secondary mt-1 line-clamp-1'>
          {resource.summary}
        </p>
      </div>
    </Link>
  </li>
);

export const ResourceList = ({
  resources,
  title,
}: {
  resources: CollectionItem[];
  title: string;
}) => (
  <div className='flex flex-col gap-4 w-full mt-4'>
    <h2 className='heading-h5 font-bold'>{title}</h2>
    <ul className='flex flex-col gap-4 w-full'>
      {resources.map((resource) => (
        <ListCard key={resource.id} resource={resource} />
      ))}
    </ul>
  </div>
);
