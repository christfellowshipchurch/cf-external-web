import { Link } from 'react-router';
import Icon from '~/primitives/icon';
import { SubMenuItem } from './types';
import { useRef, useState, useEffect } from 'react';

interface AccordionSectionProps {
  id: string;
  title: string;
  description: string;
  items: SubMenuItem[];
  isOpen: boolean;
  onToggle: (id: string) => void;
  layout?: 'list' | 'grid';
  showViewMore?: boolean;
  viewMoreLink?: string;
  closeMenu: () => void;
}

export function AccordionSection({
  id,
  title,
  description,
  items,
  isOpen,
  onToggle,
  layout = 'list',
  showViewMore = false,
  viewMoreLink = '',
  closeMenu,
}: AccordionSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      const contentHeight = contentRef.current?.scrollHeight;
      setHeight(contentHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen, items]);

  return (
    <>
      <button
        onClick={() => onToggle(id)}
        className='w-full flex items-center justify-between py-4 px-8 mb-0 border-t border-gray-200'
      >
        <div className='flex flex-col items-start gap-2'>
          <h3 className='text-lg font-bold text-navy'>{title}</h3>
          <p className='text-gray-600 text-sm'>{description}</p>
        </div>
        <Icon
          name='chevronDown'
          className={`size-6 text-text-primary transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        className='overflow-hidden transition-[height] duration-300 ease-in-out'
        style={{ height: height !== undefined ? `${height}px` : undefined }}
      >
        <div ref={contentRef}>
          <div className='py-4 px-8'>
            {layout === 'list' ? (
              <div className='space-y-6'>
                {items.map((item) => (
                  <Link
                    key={item.id}
                    to={item.to}
                    onClick={closeMenu}
                    className='flex justify-start items-center gap-6'
                  >
                    <div className='mt-1'>
                      {item.icon && (
                        <Icon
                          name={item.icon}
                          className='size-6 text-text-primary mb-1'
                        />
                      )}
                    </div>
                    <div>
                      <h3 className='font-semibold text-text-primary'>
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className='text-text-secondary text-sm'>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className='grid grid-cols-2 gap-6'>
                {items.map((item) => (
                  <Link
                    key={item.id}
                    to={item.to}
                    onClick={closeMenu}
                    className='flex flex-col'
                  >
                    <h3 className='font-semibold text-text-primary'>
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className='text-text-secondary text-sm'>
                        {item.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {showViewMore && (
              <Link
                to={viewMoreLink || ''}
                onClick={closeMenu}
                className='mt-6 flex items-center text-navy font-semibold'
              >
                View More
                <Icon name='arrowRight' className='ml-2 size-5' />
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
