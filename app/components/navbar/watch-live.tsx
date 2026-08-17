import { Button } from '~/primitives/button/button.primitive';

/**
 * Same destination as the "Live Broadcast" entries in navbar.data.tsx and
 * mobile-menu.data.tsx — the indicator points at the stream, not the campus page.
 */
export const WATCH_LIVE_URL =
  'https://www.youtube.com/@ChristFellowship.Church/streams';

/** Pulsing dot that reads as "on air". Held still for reduced-motion users. */
const LiveDot = () => (
  <span
    aria-hidden='true'
    className='size-2 shrink-0 rounded-full bg-white motion-safe:animate-pulse'
  />
);

/**
 * Desktop navbar indicator, shown in place of Find a Service while the online
 * Sunday broadcast is live (CFDP-4225).
 */
export const WatchLiveButton = () => (
  <Button
    href={WATCH_LIVE_URL}
    className='font-semibold text-sm xl:text-base w-fit gap-2'
    aria-label='Watch the Sunday broadcast live'
  >
    <LiveDot />
    Watch Live
  </Button>
);

/**
 * Mobile indicator, pinned above the "Welcome to Church" section at the top of
 * the expandable nav. Inset with px-8 to line up with the menu sections below.
 */
export const WatchLiveBanner = ({ closeMenu }: { closeMenu: () => void }) => (
  <div className='px-5 pt-6'>
    <a
      href={WATCH_LIVE_URL}
      target='_blank'
      rel='noopener noreferrer'
      onClick={closeMenu}
      className='flex items-center justify-between gap-2 overflow-hidden rounded-lg bg-ocean px-3 py-2.5'
      aria-label='Watch the Sunday broadcast live'
    >
      <span className='flex shrink-0 items-center gap-2 text-sm font-semibold text-white'>
        <LiveDot />
        Watch Live
      </span>
      {/* Truncates rather than wrapping: the drawer is only 80vw, so on the
          narrowest phones this label runs out of room before the label matters. */}
      <span className='truncate text-[10px] font-semibold uppercase tracking-wide text-white/75'>
        Sunday Broadcast
      </span>
    </a>
  </div>
);
