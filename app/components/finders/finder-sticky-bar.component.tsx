import type { ReactNode } from 'react';

import { useStickyTopBelowNavbarClass } from '~/hooks/use-sticky-top-below-navbar';
import { cn } from '~/lib/utils';

type FinderStickyBarProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Sticky filter strip below the main navbar (matches group / class finder finder UIs).
 * z-40 sits above the site footer (z-30) so desktop filter popovers are not covered
 * when open near the bottom of the page; still below navbar (z-400) and cookie banner (z-50).
 */
export function FinderStickyBar({ children, className }: FinderStickyBarProps) {
  const stickyTopClass = useStickyTopBelowNavbarClass();
  return (
    <div
      className={cn(
        'sticky z-40 w-full min-w-0 max-w-full overflow-x-clip border-b border-black/5 bg-white shadow-sm content-padding select-none transition-all duration-300',
        stickyTopClass,
        className,
      )}
    >
      {children}
    </div>
  );
}
