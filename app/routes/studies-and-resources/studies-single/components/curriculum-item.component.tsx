import { useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { cn } from '~/lib/utils';
import { Link } from 'react-router';
import Modal from '~/primitives/Modal';
import { Video } from '~/primitives/video/video.primitive';
import { Icon } from '~/primitives/icon/icon';
import type { CurriculumSession } from '../../types';

export interface CurriculumListItem {
  link?: string;
  type: string;
  description: string;
  wistiaId?: string;
}

export function CurriculumSessions({
  sessions,
}: {
  sessions: CurriculumSession[];
}) {
  return (
    <div className='flex flex-col gap-4'>
      {sessions.map((session, index) => (
        <CurriculumItem
          key={index}
          title={session.title}
          subtitle={`${session.resources.length} ${
            session.resources.length === 1 ? 'resource' : 'resources'
          }`}
          items={session.resources.map((resource) => ({
            type: resource.type,
            description: resource.title,
            wistiaId: resource.wistiaId,
            link: resource.url,
          }))}
        />
      ))}
    </div>
  );
}

export function CurriculumItem({
  title = 'Curriculum',
  subtitle = 'Introduction to the study',
  items = [],
}: {
  title?: string;
  subtitle?: string;
  items?: CurriculumListItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Accordion.Root
      type='single'
      collapsible
      value={open ? 'curriculum' : undefined}
      onValueChange={(value) => setOpen(value === 'curriculum')}
      className='w-full rounded-2xl border border-[#ECEBEF] bg-white overflow-hidden'
    >
      <Accordion.Item value='curriculum' className='w-full'>
        <Accordion.Header className='flex w-full'>
          <Accordion.Trigger
            className={cn(
              'group flex w-full items-center gap-4 py-4 px-4 text-left cursor-pointer',
              'hover:bg-black/5 transition-colors',
            )}
          >
            <Icon
              name='caretRightRounded'
              size={24}
              className='shrink-0 text-text-primary transition-transform duration-300 group-data-[state=open]:rotate-90'
              aria-hidden
            />
            <div className='flex flex-col gap-0.5'>
              <h3 className='text-xl font-semibold text-[#000D25] leading-none'>
                {title}
              </h3>
              <p className='text-sm text-[#8F8F95]'>{subtitle}</p>
            </div>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
          )}
        >
          <ul className='list-none px-4 pb-6 pt-0 flex flex-col gap-2 mt-4'>
            {items.map((item, index) => (
              <CurriculumItemContent key={index} item={item} />
            ))}
          </ul>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}

const CurriculumItemContent = ({ item }: { item: CurriculumListItem }) => {
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  const content = () => (
    <div className='flex flex-col gap-1.5'>
      <h4 className='text-xs font-semibold text-[#0091BD] leading-none'>
        {item.type}
      </h4>
      <p className='text-lg text-black font-semibold leading-none'>
        {item.description}
      </p>
    </div>
  );

  const wrapperStyles =
    'flex flex-col gap-0.5 border border-[#D8D8DB] bg-white pl-3 py-5 pr-8 rounded-2xl group-hover:border-ocean transition-colors cursor-pointer';

  if (item.wistiaId) {
    return (
      <li className='w-full group'>
        <Modal open={videoModalOpen} onOpenChange={setVideoModalOpen}>
          <Modal.Button asChild>
            <div
              role='button'
              tabIndex={0}
              className={wrapperStyles}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setVideoModalOpen(true);
                }
              }}
            >
              {content()}
            </div>
          </Modal.Button>
          <Modal.Content>
            <div className='text-center text-text_primary p-8 md:p-12 w-[90vw] max-w-sm md:max-w-screen lg:max-w-3xl overflow-y-scroll aspect-video max-h-[75vh] md:max-h-[90vh]'>
              <Video wistiaId={item.wistiaId} className='size-full' />
            </div>
          </Modal.Content>
        </Modal>
      </li>
    );
  }

  return (
    <li className='w-full group'>
      {item.link ? (
        <Link
          to={item.link}
          target='_blank'
          prefetch='intent'
          className={wrapperStyles}
        >
          {content()}
        </Link>
      ) : (
        <div className={wrapperStyles}>{content()}</div>
      )}
    </li>
  );
};
