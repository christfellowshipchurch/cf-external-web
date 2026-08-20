import Icon from '~/primitives/icon';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MobileMenuContent from './mobile-menu-content';
import { Button } from '~/primitives/button/button.primitive';
import { MobileSearch } from './search/mobile-search.component';
import { useResponsive } from '~/hooks/use-responsive';
const mobileMenuButtonStyle =
  'cursor-pointer transition-colors duration-300 active:scale-95 active:opacity-80';

export default function MobileMenu({
  mode,
  setMode,
  showSiteBanner,
  latestMessageTo,
  isOnlineServiceLive,
}: {
  mode: 'light' | 'dark';
  setMode: (mode: 'light' | 'dark') => void;
  showSiteBanner?: boolean;
  latestMessageTo?: string;
  isOnlineServiceLive?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [orginalMode] = useState(mode);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isMedium } = useResponsive();
  const location = useLocation();
  const navigate = useNavigate();
  /** Whether the history entry pushed for the open drawer is still live. */
  const hasHistoryEntry = useRef(false);

  /**
   * The open drawer owns a history entry so the Android back button and the iOS
   * left-edge back-swipe — which lands right on the close chevron — dismiss it
   * instead of leaving the page. Users were being carried off the page and
   * immediately returning, which Clarity counted as a Quick Back (CFDP-4232).
   *
   * The entry keeps the current URL: same-URL entries aren't navigations, so
   * they stay out of Clarity's page-view sequence. It goes through `navigate`
   * rather than `history.pushState` so React Router's own history index stays
   * consistent (raw pushState breaks its scroll restoration bookkeeping).
   */
  const openMenu = () => {
    setIsOpen(true);
    hasHistoryEntry.current = true;
    navigate(`${location.pathname}${location.search}`, {
      state: { menuOpen: true },
      preventScrollReset: true,
    });
  };

  /** Dismissing consumes the drawer's entry so entries don't stack up. */
  const dismissMenu = () => {
    if (!isOpen) return;
    setIsOpen(false);
    if (hasHistoryEntry.current) {
      hasHistoryEntry.current = false;
      navigate(-1);
    }
  };

  // A back gesture pops the drawer's entry, so close on `popstate` rather than
  // on the committed location: React Router revalidates loaders before it
  // commits a pop, which left the drawer sitting open for that whole request.
  useEffect(() => {
    if (!isOpen) return;
    const closeOnPop = () => {
      hasHistoryEntry.current = false;
      setIsOpen(false);
    };
    window.addEventListener('popstate', closeOnPop);
    return () => window.removeEventListener('popstate', closeOnPop);
  }, [isOpen]);

  // Prevent background scroll when menu is open
  useEffect(() => {
    if (isOpen || isSearchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isSearchOpen]);

  return (
    <div
      className={`lg:hidden ${
        mode === 'light' ? 'text-[#727272]' : 'text-white'
      }`}
    >
      {/* Back Button */}
      <button
        onClick={dismissMenu}
        className='text-white fixed left-4 top-1/2 -translate-y-1/2 z-1020 pointer-events-auto'
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        aria-label='Close menu'
      >
        <Icon name='chevronRight' size={50} />
      </button>

      {/* Backdrop */}
      {/* Sits above the site banner's z-999 so the drawer reads as a full-height
          overlay: the banner is ocean-filled like the Watch Live indicator, and
          stacking the two made them merge into one block (CFDP-4225). */}
      <div
        className={`fixed inset-0 bg-black/50 z-1000 transition-opacity duration-300 lg:hidden
          ${
            isOpen
              ? 'opacity-100 visible'
              : 'opacity-0 invisible pointer-events-none'
          }`}
        onClick={dismissMenu}
        aria-hidden='true'
      />

      {/* Search & Menu Buttons */}
      <div className='flex items-center gap-4'>
        <div className='hidden md:block'>
          <Button className='font-semibold text-base w-fit min-w-[180px]'>
            <Icon name='mapFilled' size={20} className='mr-2' />
            Find a Service
          </Button>
        </div>
        <button
          aria-label='Search'
          className={mobileMenuButtonStyle}
          onClick={() => {
            setIsSearchOpen(!isSearchOpen);
            setTimeout(() => {
              setMode(
                orginalMode === 'dark' && isMedium
                  ? !isSearchOpen
                    ? 'light'
                    : 'dark'
                  : orginalMode,
              );
            }, 0);
            dismissMenu();
          }}
        >
          <Icon name='search' size={20} className='mb-[2px]' />
        </button>
        <button
          onClick={() => {
            if (isOpen) {
              dismissMenu();
            } else {
              openMenu();
            }
            setMode(
              orginalMode === 'dark' && isMedium
                ? !isOpen
                  ? 'light'
                  : 'dark'
                : orginalMode,
            );
            setIsSearchOpen(false);
          }}
          aria-label='Menu'
          className={mobileMenuButtonStyle}
        >
          <Icon
            name={isOpen ? 'x' : 'menu'}
            size={isOpen ? 30 : 24}
            className={`${!isOpen && 'mr-[6px]'}`}
          />
        </button>
      </div>

      {/* Menu Content */}
      {/* top-0 rather than offset below the site banner: h-full is 100% of the
          viewport, so an offset pushed the foot of the menu off-screen. */}
      <div
        className={`fixed top-0 right-0 w-4/5 max-w-[400px] h-full bg-white z-1010 transform transition-all duration-300 overflow-y-auto
          ${
            !isOpen
              ? 'translate-x-full invisible opacity-0'
              : 'translate-x-0 visible opacity-100'
          }`}
      >
        <div
          className={`h-full flex flex-col transition-opacity duration-500
            ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        >
          <MobileMenuContent
            /* Links close by navigating, so the drawer's entry is left behind
               under the destination rather than consumed — no `navigate(-1)`
               here, which would race the link's own navigation. */
            closeMenu={() => {
              hasHistoryEntry.current = false;
              setIsOpen(false);
            }}
            latestMessageTo={latestMessageTo}
            isOnlineServiceLive={isOnlineServiceLive}
          />
        </div>
      </div>

      {/* Search Open */}
      <div
        className={`fixed ${
          showSiteBanner ? 'top-[48px]' : 'top-[0px]'
        } right-0 w-full h-full bg-white z-50 transform transition-all duration-300 overflow-y-auto
          ${
            !isSearchOpen
              ? 'translate-x-full invisible opacity-0'
              : 'translate-x-0 visible opacity-100'
          }`}
      >
        <div
          className={`h-full flex flex-col transition-opacity duration-500
            ${isSearchOpen ? 'opacity-100' : 'opacity-0'}`}
        >
          {isSearchOpen && <MobileSearch setIsSearchOpen={setIsSearchOpen} />}
        </div>
      </div>
    </div>
  );
}
