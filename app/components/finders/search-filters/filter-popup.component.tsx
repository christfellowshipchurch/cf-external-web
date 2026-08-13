import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Stats, useHits, useRefinementList } from 'react-instantsearch';

import {
  groupClassTypeHits,
  syntheticHitsFromGrouped,
} from '~/routes/class-finder/finder/components/group-class-type-hits';
import type { ClassHitType } from '~/routes/class-finder/types';
import { finderFilterSectionSubtitleClass } from '~/components/finders/search-filters/filter-section-subtitle';
import {
  FinderLocationSearch,
  finderApplyZipButtonClass,
  finderLocationInputBaseClass,
} from '~/components/finders/location-search';
import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import { Icon } from '~/primitives/icon/icon';

type FilterCoordinates = { lat: number | null; lng: number | null };

export interface FilterPopupSection {
  title?: string;
  attribute: string;
  /** Refinement pills: only one value refined at a time (matches hub-style single category). */
  singleSelectRefinement?: boolean;
  input?: boolean;
  inputPlaceholder?: string;
  checkbox?: boolean;
  checkboxLayout?: 'vertical' | 'horizontal';
  isAgeRange?: boolean;
  isWeekdays?: boolean;
  isDropdown?: boolean;
  isLocation?: boolean;
  /** Zip + Apply only; pair with `isLocation` on a separate row for current GPS. */
  isCurrentLocation?: boolean;
  isMeetingType?: boolean;
  coordinates?: FilterCoordinates | null;
  setCoordinates?: (coordinates: FilterCoordinates | null) => void;
  /** Which control last set `coordinates` (group finder split: zip vs GPS). */
  locationSource?: 'zip' | 'gps' | null;
  onLocationKind?: (kind: 'zip' | 'gps' | null) => void;
}

export interface FilterPopupData {
  content: FilterPopupSection[];
  showFooter?: boolean;
}

type SectionFooterRegistration = {
  hasSelection: boolean;
  reset: () => void;
};

interface FilterPopupProps {
  popupTitle: string;
  className?: string;
  data: FilterPopupData;
  showSection: boolean;
  onHide: () => void;
  ageInput?: string;
  setAgeInput?: (age: string) => void;
  style?: React.CSSProperties;
  /**
   * `popover` — absolute panel under the trigger (default; desktop and tablet compact pills).
   * `bottomSheet` — fixed bottom sheet with backdrop and drag-to-close (narrow mobile).
   * `embedded` — scrollable body only (e.g. group finder overflow panel inside a sheet or card).
   */
  layout?: 'popover' | 'bottomSheet' | 'embedded';
  /** Class finder: footer count = grouped class rows (grid), not raw Algolia nbHits. */
  groupedFooterCount?: boolean;
}

function AlgoliaHitsLabel() {
  return (
    <Stats
      classNames={{
        root: '',
      }}
      translations={{
        rootElementText: ({ nbHits }) =>
          `Show ${nbHits.toLocaleString()} Results`,
      }}
    />
  );
}

function GroupedHitsLabel() {
  const { items } = useHits<ClassHitType>();
  const n = useMemo(
    () => syntheticHitsFromGrouped(groupClassTypeHits(items)).length,
    [items],
  );
  return <>Show {n.toLocaleString()} Results</>;
}

export function MobileFilterBottomSheet({
  title,
  onClose,
  scrollable,
  footer,
}: {
  title: string;
  onClose: () => void;
  scrollable: React.ReactNode;
  footer: React.ReactNode | null;
}) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [openAnimationDone, setOpenAnimationDone] = useState(false);
  const startYRef = useRef(0);
  const dragYRef = useRef(0);
  const draggingRef = useRef(false);
  const dragRegionRef = useRef<HTMLDivElement>(null);

  // Mount visible immediately. A deferred translateY(100%) + double rAF was unreliable
  // (Strict Mode / cancelled frames left the sheet off-screen with only the backdrop).
  useEffect(() => {
    const enableDragTimer = window.setTimeout(() => setDragEnabled(true), 380);
    const openDoneTimer = window.setTimeout(
      () => setOpenAnimationDone(true),
      420,
    );
    return () => {
      window.clearTimeout(enableDragTimer);
      window.clearTimeout(openDoneTimer);
    };
  }, []);

  // Lock scroll with `body { position: fixed }` so the overlay stays viewport-fixed on iOS.
  useEffect(() => {
    const scrollY = window.scrollY;
    const prevBody = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.position = prevBody.position;
      document.body.style.top = prevBody.top;
      document.body.style.left = prevBody.left;
      document.body.style.right = prevBody.right;
      document.body.style.width = prevBody.width;
      document.body.style.overflow = prevBody.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: { key: string }) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const finishDrag = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    const region = dragRegionRef.current;
    if (region?.hasPointerCapture(e.pointerId)) {
      region.releasePointerCapture(e.pointerId);
    }
    const shouldClose = dragYRef.current > 100;
    dragYRef.current = 0;
    setDragY(0);
    if (shouldClose) {
      onClose();
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragEnabled) return;
    draggingRef.current = true;
    startYRef.current = e.clientY;
    dragYRef.current = 0;
    setDragY(0);
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const y = Math.max(0, e.clientY - startYRef.current);
    dragYRef.current = y;
    setDragY(y);
  };

  if (typeof document === 'undefined') return null;

  const sheetTransform = `translateY(${dragY}px)`;
  const sheetTransition = isDragging
    ? 'none'
    : openAnimationDone
      ? 'transform 0.22s ease-out'
      : 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)';

  return createPortal(
    <div
      className='fixed inset-0 z-500 box-border flex flex-col justify-end overflow-x-hidden overscroll-contain pointer-events-none'
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: '100%',
        height: '100%',
        maxHeight: '100dvh',
        overscrollBehavior: 'contain',
      }}
      role='presentation'
      data-search-filters-portal
    >
      <button
        type='button'
        className='absolute inset-0 z-0 cursor-default bg-black/45 pointer-events-auto'
        onClick={onClose}
        aria-label='Close filter'
      />
      {/* Flex justify-end pins the sheet to the viewport bottom; absolute+bottom mis-anchored when layout was wider than the viewport. */}
      <div className='relative z-10 flex w-full min-w-0 max-w-full justify-center pointer-events-none'>
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby='filter-sheet-title'
          className={cn(
            'pointer-events-auto box-border flex w-full min-w-0 max-w-full max-h-[min(85dvh,820px)] min-h-[min(32vh,280px)] flex-col overflow-x-hidden',
            'rounded-t-2xl border-t-2 border-neutral-200 bg-white',
            'pb-[max(1rem,env(safe-area-inset-bottom))]',
            'will-change-transform',
          )}
          style={{
            transform: sheetTransform,
            transition: sheetTransition,
          }}
        >
          <div
            ref={dragRegionRef}
            className='touch-none shrink-0 select-none'
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            <div className='flex justify-center pt-2 pb-1.5'>
              <div
                className='h-1.5 w-11 shrink-0 rounded-full bg-neutral-300'
                aria-hidden
              />
            </div>
            <div className='flex min-w-0 items-center justify-between gap-2 border-b border-neutral-100 px-4 pb-3 pt-2'>
              <h2
                id='filter-sheet-title'
                className='min-w-0 flex-1 truncate text-xl font-bold text-black'
              >
                {title}
              </h2>
              <button
                type='button'
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onClose}
                className='cursor-pointer rounded-lg p-1'
                aria-label='Close'
              >
                <Icon name='x' color='black' />
              </button>
            </div>
          </div>
          <div className='min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pt-2'>
            {scrollable}
          </div>
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface FilterPopupContentProps {
  sectionKey: string;
  showPopupFooter: boolean;
  registerSectionFooter: (
    key: string,
    entry: SectionFooterRegistration | null,
  ) => void;
  data: FilterPopupSection;
  ageInput?: string;
  setAgeInput?: (age: string) => void;
  popupTitle?: string;
  cancelSignalRef?: React.MutableRefObject<number>;
}

export const FilterPopup = ({
  popupTitle,
  className,
  data,
  showSection,
  onHide,
  ageInput,
  setAgeInput,
  style,
  layout = 'popover',
  groupedFooterCount = false,
}: FilterPopupProps) => {
  const ref = useRef<HTMLDivElement>(null);
  // Shared between isLocation and isCurrentLocation sections so that whichever
  // starts a new request last wins and the other's stale result is discarded.
  const locationCancelSignalRef = useRef(0);
  const [sectionFooterRegistry, setSectionFooterRegistry] = useState<
    Record<string, SectionFooterRegistration>
  >({});

  // Clear button in Footer only shows when there is a selection
  const registerSectionFooter = useCallback(
    (key: string, entry: SectionFooterRegistration | null) => {
      setSectionFooterRegistry((prev) => {
        const next = { ...prev };
        if (entry === null) {
          delete next[key];
        } else {
          next[key] = entry;
        }
        return next;
      });
    },
    [],
  );
  const hasAnyPopupSelection = Object.values(sectionFooterRegistry).some(
    (s) => s.hasSelection,
  );

  const clearAllPopupSections = () => {
    Object.values(sectionFooterRegistry).forEach((s) => s.reset());
  };

  const isBottomSheet = layout === 'bottomSheet';
  const isEmbedded = layout === 'embedded';

  const multiSection = data.content.length > 1;

  const bodyScrollable = (
    <div
      className={cn(
        'flex flex-col',
        !multiSection && 'gap-6',
        !isEmbedded && 'px-4 pb-4',
        (isBottomSheet || isEmbedded) &&
          'min-w-0 max-w-full overflow-x-hidden pt-1',
      )}
    >
      {data.content.map((content, index) => (
        <div
          key={`${index}-${content.attribute}-${content.title ?? ''}`}
          className={cn(
            'flex flex-col gap-2',
            (isBottomSheet || isEmbedded) && 'min-w-0 max-w-full',
            multiSection &&
              index > 0 &&
              'mt-6 w-full border-t border-solid border-[#E5E7EB] pt-6',
          )}
        >
          {content.title && (
            <h3 className={finderFilterSectionSubtitleClass}>
              {content.title}
            </h3>
          )}
          <FilterPopupContent
            sectionKey={`${index}-${content.attribute}-${content.title ?? ''}`}
            showPopupFooter={Boolean(data.showFooter)}
            registerSectionFooter={registerSectionFooter}
            data={content}
            ageInput={ageInput}
            setAgeInput={setAgeInput}
            popupTitle={popupTitle}
            cancelSignalRef={
              content.isLocation || content.isCurrentLocation
                ? locationCancelSignalRef
                : undefined
            }
          />
        </div>
      ))}
    </div>
  );

  const footerEl = data.showFooter ? (
    <div
      className={cn(
        'flex items-center gap-4 border-t border-neutral-lighter px-4',
        hasAnyPopupSelection ? 'justify-between' : 'justify-start',
        isBottomSheet
          ? 'mt-8 min-w-0 shrink-0 flex-wrap gap-y-3 bg-white pb-3 pt-8 shadow-[0_-10px_36px_-12px_rgba(15,23,42,0.14)]'
          : 'pb-4 pt-2',
      )}
    >
      <button
        type='button'
        disabled={!hasAnyPopupSelection}
        className={cn(
          'transition-all duration-300 pt-1',
          hasAnyPopupSelection
            ? 'cursor-pointer text-ocean opacity-100'
            : 'cursor-not-allowed text-neutral-default opacity-50',
        )}
        onClick={() => clearAllPopupSections()}
      >
        Clear
      </button>

      {hasAnyPopupSelection ? (
        <Button
          intent='primary'
          className={cn(
            'min-h-0 w-fit shrink-0 rounded-full px-4 py-1 text-base font-semibold',
            isBottomSheet && 'whitespace-normal',
          )}
          onClick={() => onHide()}
        >
          {groupedFooterCount ? <GroupedHitsLabel /> : <AlgoliaHitsLabel />}
        </Button>
      ) : null}
    </div>
  ) : null;

  if (isBottomSheet) {
    if (!showSection) return null;
    return (
      <MobileFilterBottomSheet
        title={popupTitle}
        onClose={onHide}
        scrollable={bodyScrollable}
        footer={footerEl}
      />
    );
  }

  if (isEmbedded) {
    if (!showSection) return null;
    return (
      <div className={cn(className)} style={style}>
        {bodyScrollable}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'cursor-default z-10 flex max-h-[min(70vh,calc(100dvh-10rem))] flex-col bg-white',
        'rounded-2xl border border-neutral-lighter overflow-hidden',
        'absolute top-[65px] right-1/2 w-[280px] translate-x-1/2 xl:w-[320px]',
        showSection
          ? 'opacity-100'
          : '-left-[9999px] -z-1 opacity-0 pointer-events-none',
        className,
      )}
      style={
        showSection
          ? style
          : { ...style, left: '-9999px', pointerEvents: 'none' }
      }
      onClick={(e) => e.stopPropagation()}
    >
      <div className='flex shrink-0 items-center justify-between p-4 pb-1'>
        <h3 className='text-xl font-bold text-black'>{popupTitle}</h3>
        <div className='cursor-pointer!' onClick={() => onHide()}>
          <Icon name='x' color='black' />
        </div>
      </div>

      <div
        data-finder-filter-scroll
        className='min-h-0 flex-1 overflow-y-auto overscroll-contain'
      >
        {bodyScrollable}
      </div>

      {footerEl ? <div className='shrink-0 bg-white'>{footerEl}</div> : null}
    </div>
  );
};

function meetingTypeUsesGlobeIcon(label: string): boolean {
  const t = label.trim().toLowerCase();
  return t === 'virtual' || t === 'online';
}

const FilterPopupContent = ({
  sectionKey,
  showPopupFooter,
  registerSectionFooter,
  data,
  ageInput,
  setAgeInput,
  popupTitle,
  cancelSignalRef,
}: FilterPopupContentProps) => {
  // `useRefinementList` defaults to a limit of 10 facet values (top 10 by
  // count). That silently dropped lower-count topics (e.g. "Prayer",
  // "Watch Party") and could truncate other facets like the campus dropdown.
  // Raise it well above the number of distinct values so every tagged option
  // is available to the section's display logic below.
  const { items, refine } = useRefinementList({
    attribute: data.attribute,
    limit: 50,
  });
  const [localAgeInput, setLocalAgeInput] = useState<string>(ageInput || '');
  const [showAgeInputError, setShowAgeInputError] = useState(false);

  // Topic categories for filtering
  const spiritualGrowthTopics = ['Bible Study', 'Prayer', 'Message Discussion'];
  const lifeSupportTopics = ['Marriage', 'Parenting', 'Finances'];
  const communityFunTopics = [
    'Friendship',
    'Sports',
    'Activity/Hobby',
    'Book Club',
    'Watch Party',
    'Podcast',
  ];

  const MEETING_DAYS_ORDER = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  const getAgeRangeStart = (label: string) => {
    const start = Number.parseInt(label, 10);
    return Number.isFinite(start) ? start : Number.MAX_SAFE_INTEGER;
  };

  // Filter items based on category and popup title
  const getFilteredItems = () => {
    if (data.attribute === 'topics' && data.title === 'Spiritual Growth') {
      return items.filter((item) => spiritualGrowthTopics.includes(item.label));
    }
    if (data.attribute === 'topics' && data.title === 'Life & Support') {
      return items.filter((item) => lifeSupportTopics.includes(item.label));
    }
    if (data.attribute === 'topics' && data.title === 'Community & Fun') {
      return items.filter((item) => communityFunTopics.includes(item.label));
    }
    if (data.isWeekdays === true) {
      return [...items].sort(
        (a, b) =>
          MEETING_DAYS_ORDER.indexOf(a.label) -
          MEETING_DAYS_ORDER.indexOf(b.label),
      );
    }
    if (data.isAgeRange === true) {
      return [...items].sort(
        (a, b) =>
          getAgeRangeStart(a.label) - getAgeRangeStart(b.label) ||
          a.label.localeCompare(b.label),
      );
    }
    return items;
  };

  const filteredItems = getFilteredItems();

  const sortedForDropdown = data.isDropdown
    ? [...filteredItems].sort((a, b) => a.label.localeCompare(b.label))
    : filteredItems;

  const dropdownSelectValue =
    sortedForDropdown.find((item) => item.isRefined)?.value ?? '';
  const ageRangeErrorId = `age-range-error-${sectionKey}`;

  const commitInputValue = () => {
    if (data.isAgeRange === true) {
      const age = Number.parseInt(localAgeInput, 10);
      if (!Number.isFinite(age) || age < 12 || age > 120) {
        setShowAgeInputError(true);
        return;
      }
    }
    setShowAgeInputError(false);
    setAgeInput?.(localAgeInput);
  };

  const dropdownEmptyLabel =
    data.attribute === 'campusName' || data.attribute === 'campus'
      ? 'Select Campus'
      : data.attribute === 'campusList'
        ? 'Select City'
        : 'Select';

  const applyDropdownSelection = (value: string) => {
    sortedForDropdown.forEach((item) => {
      if (item.isRefined) refine(item.value);
    });
    if (value) refine(value);
  };

  // Sync local age input with parent
  useEffect(() => {
    if (ageInput !== undefined) {
      setLocalAgeInput(ageInput);
    }
  }, [ageInput]);

  const coordsMeaningful = (c: FilterCoordinates | null | undefined) =>
    c != null &&
    c.lat != null &&
    c.lng != null &&
    !Number.isNaN(c.lat) &&
    !Number.isNaN(c.lng);

  const hasSectionSelection = useMemo(() => {
    if (data.isLocation) {
      const zipRowUsesSource =
        data.onLocationKind != null || data.isCurrentLocation === true;
      if (zipRowUsesSource) {
        return (
          data.locationSource === 'zip' && coordsMeaningful(data.coordinates)
        );
      }
      return coordsMeaningful(data.coordinates);
    }
    if (data.isCurrentLocation) {
      return (
        data.locationSource === 'gps' && coordsMeaningful(data.coordinates)
      );
    }
    if (data.input) {
      const committed = (ageInput ?? '').trim();
      return committed !== '' || localAgeInput.trim() !== '';
    }
    if (data.isDropdown) {
      return dropdownSelectValue !== '';
    }
    return filteredItems.some((i) => i.isRefined);
  }, [
    data.isLocation,
    data.isCurrentLocation,
    data.locationSource,
    data.coordinates,
    data.input,
    data.isDropdown,
    localAgeInput,
    ageInput,
    dropdownSelectValue,
    filteredItems,
  ]);

  const reset = useCallback(() => {
    items.forEach((item) => {
      if (item.isRefined) {
        refine(item.value);
      }
    });
    setLocalAgeInput('');
    setShowAgeInputError(false);
    // `setAgeInput` is a shared (popup-global) handler, so only the age section
    // itself may clear it. Otherwise clearing an unrelated section (e.g. the
    // Location popup) would wipe an active age filter from another popup.
    if (data.input || data.isAgeRange) {
      setAgeInput?.('');
    }
    if (data.isLocation || data.isCurrentLocation) {
      data.setCoordinates?.(null);
      data.onLocationKind?.(null);
    }
  }, [
    items,
    refine,
    setAgeInput,
    data.input,
    data.isAgeRange,
    data.isLocation,
    data.isCurrentLocation,
    data.setCoordinates,
    data.onLocationKind,
  ]);

  useEffect(() => {
    if (!showPopupFooter) return;
    registerSectionFooter(sectionKey, {
      hasSelection: hasSectionSelection,
      reset,
    });
    return () => registerSectionFooter(sectionKey, null);
  }, [
    showPopupFooter,
    sectionKey,
    hasSectionSelection,
    reset,
    registerSectionFooter,
  ]);

  const styles = {
    checkbox: 'min-w-0 break-words text-text-primary font-regular text-sm',
    button:
      'h-auto min-h-0 min-w-0 w-fit whitespace-normal border-0 bg-gray px-3 py-1.5 text-sm font-semibold leading-tight text-text-primary transition-colors duration-300 hover:bg-neutral-200 rounded-[16777200px]',
    meetingTypeButton: 'flex w-fit flex-wrap items-center gap-1.5',
    buttonRefined: 'bg-ocean !text-white hover:bg-navy',
  };

  return (
    <>
      {!data.isDropdown && (
        <div
          className={cn(
            'flex min-w-0 max-w-full bg-white',
            data.checkbox && data.checkboxLayout === 'vertical'
              ? 'gap-4 flex-col'
              : 'flex-wrap gap-1.5',
          )}
        >
          {data.isLocation ? (
            <FinderLocationSearch
              coordinates={data.coordinates || null}
              setCoordinates={data.setCoordinates || (() => {})}
              autoGeocodeZip={false}
              showCurrentLocationButton={false}
              onLocationKind={data.onLocationKind}
              cancelSignalRef={cancelSignalRef}
            />
          ) : data.isCurrentLocation ? (
            <FinderLocationSearch
              coordinates={data.coordinates || null}
              setCoordinates={data.setCoordinates || (() => {})}
              showZipInput={false}
              onLocationKind={data.onLocationKind}
              cancelSignalRef={cancelSignalRef}
            />
          ) : (
            <>
              {data.input ? (
                <div className='flex w-full min-w-0 flex-row items-stretch gap-2'>
                  <div className='relative min-w-0 flex-1 max-w-[160px]'>
                    <input
                      type='number'
                      placeholder={data.inputPlaceholder || 'Enter your age'}
                      className={cn(
                        finderLocationInputBaseClass,
                        'w-full py-1.5',
                      )}
                      value={localAgeInput}
                      onChange={(e) => {
                        setLocalAgeInput(e.target.value);
                        setShowAgeInputError(false);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          commitInputValue();
                        }
                      }}
                      min='12'
                      max='120'
                      aria-invalid={showAgeInputError}
                      aria-describedby={
                        showAgeInputError ? ageRangeErrorId : undefined
                      }
                    />
                    {showAgeInputError ? (
                      <div
                        id={ageRangeErrorId}
                        role='alert'
                        className='absolute bottom-full left-0 z-10 mb-1 w-[220px] rounded-md bg-text-primary px-3 py-2 text-xs font-semibold leading-snug text-white shadow-lg md:bottom-auto md:top-full md:mb-0 md:mt-1'
                      >
                        Groups range from age 12-120. Enter a valid age.
                      </div>
                    ) : null}
                  </div>
                  <button
                    type='button'
                    className={finderApplyZipButtonClass}
                    onClick={(e) => {
                      e.stopPropagation();
                      commitInputValue();
                    }}
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <>
                  {filteredItems.map((item, index) => {
                    return (
                      <div
                        key={index}
                        className={cn(
                          data.checkboxLayout === 'horizontal' &&
                            'flex max-w-full min-w-0 flex-wrap gap-x-2 gap-y-2 pr-2',
                        )}
                      >
                        {data.checkbox ? (
                          <div
                            className='flex max-w-full min-w-0 cursor-pointer! items-center gap-1.5'
                            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                              e.stopPropagation();
                              refine(item.value);
                            }}
                          >
                            <div
                              className={cn(
                                'box-border flex size-[18px] shrink-0 items-center justify-center rounded-sm border border-[#D1D5DB] bg-transparent',
                                item.isRefined && 'border-ocean bg-ocean',
                              )}
                              aria-hidden
                            >
                              {item.isRefined ? (
                                <Icon
                                  name='check'
                                  size={14}
                                  className='text-white'
                                />
                              ) : null}
                            </div>
                            <div className={styles.checkbox}>
                              {data.attribute === 'adultsOnly'
                                ? item.value === 'false' ||
                                  item.value === 'False'
                                  ? 'Children Welcome'
                                  : 'Adult Only'
                                : item.label}
                            </div>
                          </div>
                        ) : (
                          <Button
                            key={index}
                            intent='secondary'
                            size='sm'
                            className={cn(
                              styles.button,
                              data.isMeetingType && styles.meetingTypeButton,
                              item.isRefined && styles.buttonRefined,
                            )}
                            onClick={(
                              e: React.MouseEvent<HTMLButtonElement>,
                            ) => {
                              e.stopPropagation();
                              if (data.singleSelectRefinement) {
                                if (item.isRefined) {
                                  refine(item.value);
                                  return;
                                }
                                items.forEach((i) => {
                                  if (i.isRefined) refine(i.value);
                                });
                                refine(item.value);
                                return;
                              }
                              refine(item.value);
                            }}
                          >
                            {data.isMeetingType && (
                              <Icon
                                name={
                                  meetingTypeUsesGlobeIcon(item.label)
                                    ? 'globe'
                                    : 'map'
                                }
                                size={16}
                                className={
                                  item.isRefined
                                    ? 'text-white'
                                    : 'hover:text-white'
                                }
                              />
                            )}
                            {data.isWeekdays
                              ? item.label === 'Thursday'
                                ? 'Thur'
                                : item.label.substring(0, 3)
                              : item.label}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      )}

      {data.isDropdown && (
        <div className='flex flex-col gap-2 w-full'>
          <div className='relative w-full'>
            <select
              value={dropdownSelectValue}
              onChange={(e) => applyDropdownSelection(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                finderLocationInputBaseClass,
                'flex w-full cursor-pointer appearance-none items-center bg-white pr-9',
              )}
              aria-label={
                data.title
                  ? `Select ${data.title}`
                  : popupTitle
                    ? `Select ${popupTitle.toLowerCase()}`
                    : 'Select filter'
              }
            >
              <option value=''>{dropdownEmptyLabel}</option>
              {sortedForDropdown.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none',
              )}
            >
              <Icon name='chevronDown' size={16} className='text-[#909090]' />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
