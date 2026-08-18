/**
 * todo : Add link navigation to the menu items
 */
import { useState } from 'react';
import { MenuSection } from './menu-section';
import { AccordionSection } from './accordion-section';
import {
  welcomeMenuItems,
  getInvolvedItems,
  nextStepsItems,
  mediaItems,
  ministriesItems,
  moreMenuItems,
} from './mobile-menu.data';
import Icon from '~/primitives/icon';
import { Link } from 'react-router-dom';
import { WatchLiveBanner } from '../watch-live';

interface MobileMenuContentProps {
  closeMenu: () => void;
  /** Same URL as the Media dropdown “Latest Message” feature card (from root loader). */
  latestMessageTo?: string;
  /** True during the Sunday online-broadcast window (from root loader). */
  isOnlineServiceLive?: boolean;
}

export default function MobileMenuContent({
  closeMenu,
  latestMessageTo,
  isOnlineServiceLive,
}: MobileMenuContentProps) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const welcomeItems = welcomeMenuItems.map((item) =>
    item.id === 'latest-message'
      ? { ...item, to: latestMessageTo ?? item.to }
      : item,
  );

  const toggleSection = (sectionId: string) => {
    setOpenSection(openSection === sectionId ? null : sectionId);
  };

  return (
    <div className='h-full overflow-y-auto bg-white'>
      <div className='pb-24'>
        {isOnlineServiceLive && <WatchLiveBanner closeMenu={closeMenu} />}
        <MenuSection
          title='Welcome to Church'
          items={welcomeItems}
          closeMenu={closeMenu}
        />
        <MenuSection
          title='Get Involved'
          items={getInvolvedItems}
          closeMenu={closeMenu}
        />

        <section>
          <AccordionSection
            id='next-steps'
            title='Next Steps'
            description='Find your next step'
            items={nextStepsItems}
            isOpen={openSection === 'next-steps'}
            onToggle={toggleSection}
            closeMenu={closeMenu}
          />

          <AccordionSection
            id='media'
            title='Media'
            description='Messages, articles and more'
            items={mediaItems}
            isOpen={openSection === 'media'}
            onToggle={toggleSection}
            closeMenu={closeMenu}
          />

          <AccordionSection
            id='ministries'
            title='Ministries'
            description='View all ministries'
            items={ministriesItems}
            isOpen={openSection === 'ministries'}
            onToggle={toggleSection}
            layout='grid'
            showViewMore={true}
            viewMoreLink='/ministries'
            closeMenu={closeMenu}
          />
        </section>

        <section className='p-8 border-t border-gray-200 flex flex-col gap-2'>
          <h3 className='text-lg font-bold text-navy'>My Groups & Classes</h3>
          <p className='text-text-primary text-sm font-normal mb-2'>
            Stay up to date with your groups, classes, and more.
          </p>
          <a
            href='https://groups.christfellowship.church/'
            target='_blank'
            rel='noreferrer'
            onClick={closeMenu}
            className='bg-ocean text-white p-2 rounded-lg w-full font-medium text-center'
            aria-label='Login'
          >
            Sign In
          </a>
        </section>

        {/* website feedback */}
        <a
          href='https://cftestingteam.base44.app/feedback'
          target='_blank'
          rel='noreferrer'
          onClick={closeMenu}
          className='flex items-center gap-4 border-y-1 border-gray-200 py-4 px-8'
        >
          <Icon name='messageBubble' className='size-6 text-black' />
          <div className='flex flex-col'>
            <h3 className='heading-h6 text-navy'>Website Feedback</h3>
            <p className='text-text-secondary text-sm font-normal'>
              Help us improve the website
            </p>
          </div>
        </a>

        {/* More Menu Items */}
        <div className='flex flex-col gap-4 p-8'>
          {moreMenuItems.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              onClick={closeMenu}
              className='flex items-start font-normal text-sm text-text-primary'
            >
              {item.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
