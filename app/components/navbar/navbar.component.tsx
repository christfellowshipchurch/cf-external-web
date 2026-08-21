import { Link, useLocation } from 'react-router-dom';
import { useRouteLoaderData } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useResponsive } from '~/hooks/use-responsive';
import lowerCase from 'lodash/lowerCase';

import { Button } from '~/primitives/button/button.primitive';
import Icon from '~/primitives/icon';
import { MenuContent } from './desktop/menu-content.component';
import MobileMenu from './mobile/mobile-menu.component';
import { SearchBar } from './desktop/search/search.component';

import { cn } from '~/lib/utils';
import { shouldUseDarkMode, shouldHideNavbar } from './navbar-routes';
// Data
import {
  mainNavLinks,
  ministriesData,
  watchReadListenData,
} from './navbar.data';
import { MenuLink } from './types';
import { getLatestMessageFeaturedUrl } from './get-latest-message-featured-url';
import { SiteBanner } from '../site-banner';
import { RootLoaderData } from '~/routes/navbar/loader';
import { WatchLiveButton } from './watch-live';
// import { AuthModal } from "../modals";
import { useNavbarVisibility } from '~/providers/navbar-visibility-context';

export function Navbar() {
  // Hooks and state
  const { pathname } = useLocation();
  const rootData = useRouteLoaderData('root') as RootLoaderData;
  const { siteBanner, ministries, watchReadListen, isOnlineServiceLive } =
    rootData || {};
  const { isSmall } = useResponsive();
  const navbarRef = useRef<HTMLDivElement>(null);

  // State management
  const [isVisible, setIsVisible] = useState(true);
  /** Last window.scrollY for direction math — ref avoids stale giant deltas when isSmall toggles. */
  const lastScrollYRef = useRef(0);
  const prevPathnameRef = useRef<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Theme mode state
  let initialMode: 'light' | 'dark';
  if (pathname === '/') {
    initialMode = isSmall ? 'dark' : 'light';
  } else {
    initialMode = shouldUseDarkMode(pathname) ? 'dark' : 'light';
  }
  const [defaultMode, setDefaultMode] = useState<'light' | 'dark'>(initialMode);
  const [mode, setMode] = useState<'light' | 'dark'>(defaultMode);

  const [showSiteBanner, setShowSiteBanner] = useState<boolean>(false);

  const { setIsNavbarVisible, setIsSiteBannerVisible, isFinderFilterOpenRef } =
    useNavbarVisibility();

  // Check if navbar should be hidden for current route
  const isNavbarHidden = shouldHideNavbar(pathname);

  // Click outside detection to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        openDropdown &&
        navbarRef.current &&
        !navbarRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  useEffect(() => {
    if (siteBanner && siteBanner?.content?.length > 0) {
      setShowSiteBanner(true);
    }
  }, [siteBanner]);

  // Prevent background scrolling when search is open
  useEffect(() => {
    if (isSearchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSearchOpen]);

  // Scroll handling effect
  useEffect(() => {
    // Skip all scroll logic if navbar is hidden
    if (isNavbarHidden) {
      return;
    }

    const handleScroll = () => {
      // Don't hide/translate the navbar while search, a mega-menu, or a finder
      // filter is open (desktop popover or compact bottom sheet). Use the ref so
      // the freeze is synchronous with open (React state alone can race).
      if (isSearchOpen || openDropdown || isFinderFilterOpenRef.current) {
        return;
      }

      // Clamp to the real scroll range — iOS rubber-band overscroll reports
      // out-of-range values whose deltas flip visibility at the page edges.
      const maxScrollY =
        document.documentElement.scrollHeight - window.innerHeight;
      const currentScrollY = Math.min(
        Math.max(window.scrollY, 0),
        Math.max(maxScrollY, 0),
      );
      const scrollThreshold = 10;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      // Reset at top of page
      if (currentScrollY < scrollThreshold) {
        setIsVisible(true);
        setMode(defaultMode);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      // Handle scroll direction
      if (Math.abs(scrollDelta) > scrollThreshold) {
        const nextVisible = scrollDelta < 0;
        setIsVisible(nextVisible);
        if (currentScrollY > scrollThreshold) {
          setMode(scrollDelta < 0 ? 'light' : 'dark');
        }
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [
    defaultMode,
    isNavbarHidden,
    isSearchOpen,
    openDropdown,
    isFinderFilterOpenRef,
  ]);

  // Initial mode setup
  useEffect(() => {
    if (pathname === '/') {
      setDefaultMode(isSmall ? 'dark' : 'light');
    } else {
      setDefaultMode(shouldUseDarkMode(pathname) ? 'dark' : 'light');
    }
  }, [pathname, isSmall]);

  // Route change handling (mode follows pathname + breakpoint; scroll baseline only on real navigation)
  useEffect(() => {
    let newMode: 'light' | 'dark';
    // If on home page, set mode based on screen size
    if (pathname === '/') {
      newMode = isSmall ? 'dark' : 'light';
    } else {
      newMode = shouldUseDarkMode(pathname) ? 'dark' : 'light';
    }
    setDefaultMode(newMode);
    setMode(newMode);
    setOpenDropdown(null); // Close menu when navigating to a new page

    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      lastScrollYRef.current =
        typeof window !== 'undefined' ? window.scrollY : 0;
      setIsVisible(true);
    }
  }, [pathname, isSmall]);

  // Mode sync effect
  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    setIsNavbarVisible(isVisible && !isNavbarHidden);
  }, [isVisible, isNavbarHidden, setIsNavbarVisible]);

  useEffect(() => {
    setIsSiteBannerVisible(showSiteBanner);
  }, [showSiteBanner, setIsSiteBannerVisible]);

  // Menu data
  const menuLinks: MenuLink[] = [
    {
      title: 'Get Involved',
      content: {
        mainContent: ministriesData.content?.mainContent ?? [],
        featureCards: ministries?.featureCards ?? [],
      },
    },
    {
      title: 'Media',
      content: {
        mainContent: watchReadListenData.content?.mainContent ?? [],
        featureCards: watchReadListen?.featureCards ?? [],
      },
    },
  ];

  const latestMessageFeaturedUrl = getLatestMessageFeaturedUrl(
    watchReadListen?.featureCards,
  );
  const isTransparentMode = mode === 'dark' && !openDropdown && !isSearchOpen;
  const useOceanLogo =
    mode === 'light' || openDropdown !== null || isSearchOpen;

  // Search handling
  const handleSearchClick = () => {
    setIsSearchOpen(true);
    setOpenDropdown(null); // Close any open dropdown
  };

  // Dropdown handling
  const handleDropdownToggle = (dropdownTitle: string) => {
    if (openDropdown === dropdownTitle) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(dropdownTitle);
      setIsSearchOpen(false); // Close search when opening dropdown
    }
  };

  const activeDropdown = menuLinks.find(
    (menuLink) => menuLink.title === openDropdown,
  );

  return (
    <>
      {!isNavbarHidden && (
        <nav
          className={cn(
            'group w-full top-0 z-400 transition-transform duration-300',
            // Position must not change with scroll state: moving the nav in and
            // out of document flow changes the page height, which snaps the
            // scroll position on mobile (CFDP-4123). Overlay (dark-hero) routes
            // never take flow space; other routes always keep it via sticky.
            // While a mega-menu is open, force fixed so the menu stays pinned
            // instead of scrolling away with an absolute overlay nav.
            defaultMode === 'dark'
              ? mode === 'dark' && isVisible && !openDropdown
                ? 'absolute'
                : 'fixed'
              : 'sticky',
            !isVisible && !openDropdown && '-translate-y-full',
          )}
          ref={navbarRef}
        >
          <div className={cn(showSiteBanner ? 'block' : 'hidden')}>
            <SiteBanner
              content={siteBanner?.content ?? ''}
              link={siteBanner?.link ?? ''}
              onClose={() => setShowSiteBanner(false)}
            />
          </div>
          <div
            className={cn(
              'w-full content-padding transition-colors duration-200',
              mode === 'light' || isSearchOpen
                ? 'bg-white shadow-sm'
                : openDropdown
                  ? 'bg-white shadow-sm'
                  : 'bg-transparent group-hover:bg-white',
            )}
          >
            <div
              className={cn(
                'max-w-screen-content mx-auto flex justify-between items-center font-bold py-5 min-h-[82px]',
              )}
              style={{ gap: isSearchOpen ? '32px' : '0px' }}
            >
              {/* Logo and Desktop Navigation */}
              <div className='flex items-center gap-8'>
                <a
                  href='/'
                  className='relative flex items-center justify-center gap-2.5 overflow-hidden'
                  aria-label='Christ Fellowship Church'
                >
                  <div className='relative w-32 h-16'>
                    <img
                      src='/cf-logo-ocean.svg'
                      alt='Christ Fellowship Church'
                      className={cn(
                        'absolute inset-0 w-full h-full transition-opacity duration-200',
                        useOceanLogo
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100',
                      )}
                    />
                    <img
                      src='/cf-logo-white.svg'
                      alt=''
                      aria-hidden='true'
                      className={cn(
                        'absolute inset-0 w-full h-full transition-opacity duration-200',
                        useOceanLogo
                          ? 'opacity-0'
                          : 'opacity-100 group-hover:opacity-0',
                      )}
                    />
                  </div>
                </a>

                {/* Desktop Navigation Menu */}
                <div
                  className={cn('hidden lg:inline', isSearchOpen && 'hidden!')}
                >
                  <nav className='flex items-center space-x-6 xl:space-x-10'>
                    {mainNavLinks.map((link) => (
                      <a
                        key={link.title}
                        href={link.url}
                        className={cn(
                          'transition-colors xl:text-lg',
                          mode === 'light'
                            ? 'text-neutral-dark'
                            : openDropdown
                              ? 'text-neutral-dark'
                              : 'text-white group-hover:text-text',
                        )}
                      >
                        <span className='hover:text-ocean'>{link.title}</span>
                      </a>
                    ))}

                    {menuLinks.map((menuLink) =>
                      menuLink.content ? (
                        <button
                          key={menuLink.title}
                          onClick={() => handleDropdownToggle(menuLink.title)}
                          className={cn(
                            'transition-colors xl:text-lg cursor-pointer',
                            openDropdown === menuLink.title &&
                              'border-b-3 border-ocean',
                            mode === 'light'
                              ? 'text-neutral-dark'
                              : openDropdown
                                ? 'text-neutral-dark'
                                : 'text-white group-hover:text-text',
                          )}
                        >
                          <span className='hover:text-ocean flex items-center gap-1'>
                            {menuLink.title}
                            <Icon
                              name='chevronDown'
                              className={cn(
                                'relative top-px size-4 lg:size-6 transition duration-200',
                                openDropdown === menuLink.title && 'rotate-180',
                              )}
                              aria-hidden='true'
                            />
                          </span>
                        </button>
                      ) : null,
                    )}
                  </nav>
                </div>
              </div>

              {/* Desktop Actions */}
              <div
                className='hidden lg:flex items-center gap-1 ml-2 xl:ml-0'
                style={{
                  width: isSearchOpen ? '100%' : 'auto',
                  alignItems: isSearchOpen ? 'end' : 'center',
                  justifyContent: isSearchOpen ? 'space-between' : 'start',
                  height: isSearchOpen ? '52px' : 'auto',
                }}
              >
                {isSearchOpen && (
                  <div style={{ width: '100%' }}>
                    <SearchBar
                      mode={mode}
                      isSearchOpen={isSearchOpen}
                      setIsSearchOpen={setIsSearchOpen}
                    />
                  </div>
                )}

                {!isSearchOpen && (
                  <button
                    onClick={handleSearchClick}
                    className='flex items-center'
                    aria-label='Search'
                  >
                    <Icon
                      name='search'
                      className={cn(
                        'hover:text-ocean transition-colors cursor-pointer size-4 xl:size-5 mb-1',
                        mode === 'light'
                          ? 'text-neutral-dark'
                          : openDropdown
                            ? 'text-neutral-dark'
                            : 'text-white group-hover:text-text',
                      )}
                    />
                  </button>
                )}

                <div
                  className={cn(
                    'flex gap-2 ml-2 xl:ml-6',
                    isSearchOpen && 'hidden xl:flex',
                  )}
                >
                  <Link
                    to='/give'
                    prefetch='intent'
                    aria-label='Give'
                    className={cn(
                      'rounded-lg px-4 font-semibold text-sm xl:text-base',
                      'border cursor-pointer transition-colors duration-200',
                      'flex items-center justify-center',
                      isTransparentMode
                        ? 'border-white text-white hover:bg-white/20 group-hover:border-ocean group-hover:text-ocean group-hover:hover:bg-ocean/20'
                        : 'border-ocean text-ocean hover:bg-ocean/20',
                    )}
                  >
                    Give
                  </Link>
                  {isOnlineServiceLive ? (
                    <WatchLiveButton />
                  ) : (
                    <Button
                      href='/locations'
                      className='font-semibold text-sm xl:text-base w-fit min-w-[180px]'
                      aria-label='Find a Service'
                    >
                      <Icon
                        name='mapFilled'
                        className='mr-1 xl:mr-2 size-4 xl:size-5'
                      />
                      Find a Service
                    </Button>
                  )}
                </div>
              </div>

              {/* Mobile Menu */}

              <MobileMenu
                mode={mode}
                setMode={setMode}
                showSiteBanner={showSiteBanner}
                latestMessageTo={latestMessageFeaturedUrl}
                isOnlineServiceLive={isOnlineServiceLive}
              />
            </div>
          </div>

          {/* Mega-menu panel: absolute under the nav so it stays attached when
              the nav uses CSS `translate` (scroll hide) and so banner height
              is included via top-full instead of hardcoded offsets. */}
          {activeDropdown?.content && (
            <div
              className={cn(
                'absolute left-0 w-full top-full bg-white shadow-sm border-t border-gray-100 z-50',
                'animate-in slide-in-from-top-2 duration-200',
              )}
            >
              <MenuContent
                menuType={lowerCase(activeDropdown.title)}
                isLoading={false}
                mainContent={activeDropdown.content.mainContent}
                featureCards={activeDropdown.content.featureCards}
              />
            </div>
          )}
        </nav>
      )}
    </>
  );
}
