import { Link } from 'react-router';
import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import Icon from '~/primitives/icon';
import HTMLRenderer from '~/primitives/html-renderer';

import type { VolunteerMissionDetail } from '../types';
import {
  AddToCalendarButton,
  MissionDetailRows,
  normalizeWhatToKnowContent,
  WhatToKnowBody,
} from '../components/outreach-details.component';
import { OutreachSidebarShell } from '../components/outreach-sidebar-shell.component';

export function About({ aboutBody }: { aboutBody: string }) {
  const trimmed = aboutBody.trim();
  if (!trimmed) return null;

  return (
    <section className='space-y-3'>
      <h2 className='text-xl font-extrabold text-text-primary'>
        About this opportunity
      </h2>
      <div className='prose prose-neutral max-w-none text-base leading-relaxed text-text-secondary'>
        <HTMLRenderer html={trimmed} />
      </div>
    </section>
  );
}

export function WhatToKnow({ data }: { data: string }) {
  const content = normalizeWhatToKnowContent(data);
  if (!content) return null;

  return (
    <section className='space-y-3'>
      <h2 className='text-xl font-extrabold text-text-primary'>What to know</h2>
      <WhatToKnowBody content={content} />
    </section>
  );
}

export function Questions({
  contactName,
  contactEmail,
}: {
  contactName: string | undefined;
  contactEmail: string | undefined;
}) {
  const name = contactName?.trim();
  const email = contactEmail?.trim();
  const hasContact = Boolean(name || email);

  return (
    <section className='space-y-3'>
      <h2 className='text-xl font-extrabold text-text-primary'>Questions?</h2>
      {hasContact ? (
        <p className='text-base leading-relaxed text-text-secondary'>
          Reach out to{' '}
          {name ? (
            <span className='font-semibold text-text-primary'>{name}</span>
          ) : (
            <span className='text-text-primary'>us</span>
          )}
          {email ? (
            <>
              {' '}
              at{' '}
              <a
                href={`mailto:${email}`}
                className='font-semibold text-ocean underline-offset-2 hover:underline'
              >
                {email}
              </a>
            </>
          ) : null}
          .
        </p>
      ) : (
        <p className='text-base text-text-secondary'>
          For questions, visit{' '}
          <Link
            to='/volunteer#community'
            className='font-semibold text-ocean hover:underline'
          >
            Volunteer
          </Link>{' '}
          or contact your campus.
        </p>
      )}
    </section>
  );
}

export function Sidebar({
  mission,
  onSignUpClick,
  copied,
  onCopyPath,
}: {
  mission: VolunteerMissionDetail;
  onSignUpClick: () => void;
  copied: boolean;
  onCopyPath: () => void;
}) {
  return (
    <OutreachSidebarShell>
      <MissionDetailRows mission={mission} />
      <div className='h-px w-full bg-[#E5E7EB]' />
      <div className='flex flex-col gap-3'>
        <Button
          intent='primary'
          type='button'
          onClick={onSignUpClick}
          className='w-full rounded-full'
        >
          Sign Up
        </Button>
        <Button
          intent='secondary'
          className='w-full rounded-full border-black/12 hover:border-ocean! text-neutral-darker hover:text-white!'
          type='button'
          onClick={() => void onCopyPath()}
        >
          <span className='inline-flex items-center justify-center gap-2'>
            <Icon name='shareAlt' size={18} />
            {copied ? 'Link copied' : 'Share Link'}
          </span>
        </Button>
        <AddToCalendarButton
          mission={mission}
          className='w-full rounded-full border-black/12 hover:border-ocean! text-neutral-darker hover:text-white!'
        />
      </div>
    </OutreachSidebarShell>
  );
}

export function MobileBottomBar({
  copied,
  mission,
  onCopyPath,
  onSignUpClick,
}: {
  copied: boolean;
  mission: VolunteerMissionDetail;
  onCopyPath: () => void;
  onSignUpClick: () => void;
}) {
  const [mountToBody, setMountToBody] = useState(false);

  useLayoutEffect(() => {
    setMountToBody(true);
  }, []);

  const bar = (
    <div
      className={cn(
        'w-full fixed inset-x-0 bottom-0 z-30 flex items-stretch gap-3 border-t border-neutral-lighter bg-white p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]',
        'md:hidden',
        'pb-[max(1rem,env(safe-area-inset-bottom,0px))]',
      )}
    >
      {copied ? (
        <p
          className='pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-text-primary px-4 py-2 text-sm font-semibold text-white shadow-md'
          role='status'
          aria-live='polite'
        >
          Link copied
        </p>
      ) : null}
      <button
        type='button'
        onClick={() => void onCopyPath()}
        className='flex size-12 shrink-0 items-center justify-center rounded-full border-[0.5px] border-black/12 text-neutral-darker'
        aria-label={copied ? 'Link copied' : 'Share Button'}
      >
        <Icon name='shareAlt' size={22} />
      </button>
      <AddToCalendarButton
        mission={mission}
        showLabel={false}
        className='flex size-12 min-w-0 shrink-0 rounded-full border-[0.5px] border-black/12 p-0 text-neutral-darker hover:border-ocean!'
      />
      <Button
        intent='primary'
        type='button'
        onClick={onSignUpClick}
        className='flex-1 min-w-0 min-h-12 rounded-full text-base font-bold'
      >
        Sign Up
      </Button>
    </div>
  );

  if (typeof document === 'undefined') {
    return bar;
  }

  return mountToBody ? createPortal(bar, document.body) : bar;
}
