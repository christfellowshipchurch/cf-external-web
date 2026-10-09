import { Link } from 'react-router';
import Icon from '~/primitives/icon';
import { MenuItem } from './types';

interface MenuSectionProps {
  title?: string;
  items: MenuItem[];
  closeMenu: () => void;
}

function isHttpUrl(to: string): boolean {
  return to.startsWith('http://') || to.startsWith('https://');
}

export function MenuSection({ title, items, closeMenu }: MenuSectionProps) {
  return (
    <section className='px-8 border-t border-gray-200 py-8'>
      {title && <h2 className='heading-h6 text-navy mb-4'>{title}</h2>}
      <div className='space-y-6'>
        {items.map((item) => {
          const className = 'flex items-start gap-6';
          const inner = (
            <>
              <div className='mt-1'>
                <Icon name={item.icon} className='size-6 text-text-primary' />
              </div>
              <div>
                <h3 className='font-semibold text-text-primary'>
                  {item.title}
                </h3>
                <p className='text-text-secondary text-sm font-normal'>
                  {item.description}
                </p>
              </div>
            </>
          );

          if (isHttpUrl(item.to)) {
            return (
              <a
                key={item.id}
                href={item.to}
                target='_blank'
                rel='noopener noreferrer'
                onClick={closeMenu}
                className={className}
              >
                {inner}
              </a>
            );
          }

          return (
            <Link
              key={item.id}
              to={item.to}
              onClick={closeMenu}
              className={className}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
