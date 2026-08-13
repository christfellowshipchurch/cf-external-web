import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { useInstantSearch } from 'react-instantsearch';
import { Icon } from '~/primitives/icon/icon';
import {
  FilterPopup,
  type FilterPopupData,
} from '~/components/finders/search-filters/filter-popup.component';
import { cn } from '~/lib/utils';
import { useNavbarVisibility } from '~/providers/navbar-visibility-context';
const MORE_FILTERS_ID = 'moreFilters';

function isInsideSearchFiltersPortal(target: unknown): boolean {
  if (target == null || typeof target !== 'object') return false;
  const el = target as { closest?: (selector: string) => unknown };
  if (typeof el.closest !== 'function') return false;
  return el.closest('[data-search-filters-portal]') != null;
}

function uniqueAttributesFromFilterData(data: FilterPopupData): string[] {
  return [...new Set(data.content.map((section) => section.attribute))];
}

function countRefinementsForAttributes(
  refinementList: Record<string, string[]> | undefined,
  attributes: string[],
): number {
  if (!refinementList) return 0;
  let n = 0;
  for (const attr of attributes) {
    const vals = refinementList[attr];
    if (!Array.isArray(vals)) continue;
    n += vals.filter((v) => v != null && String(v).trim() !== '').length;
  }
  return n;
}

export type SearchFilterDesktopItem = {
  id: string;
  label: string;
  popupTitle: string;
  data: FilterPopupData;
  icon?: ComponentProps<typeof Icon>['name'];
};

export type SearchFiltersAllFiltersRenderProps = {
  onHide: () => void;
  onClearAllToUrl: () => void;
  /**
   * True when viewport is narrow mobile (`max-width: 767px`): render the overflow
   * panel as a bottom sheet (same as single-filter popups). False on tablet compact
   * row — use inline card chrome instead.
   */
  mobileBottomSheet: boolean;
  /** Same label as the overflow trigger pill (use as bottom sheet title on mobile). */
  morePanelTitle: string;
};

export type SearchFiltersProps = {
  onClearAllToUrl: () => void;
  desktopFilters: SearchFilterDesktopItem[];
  /** When set, first N filters show on `<lg` (with optional “More” when there is overflow). `renderMorePanel` is only required if `desktopFilters.length` exceeds this count. */
  compactInlineFilterCount?: number;
  /** Overflow panel when two or more filters remain after the inline count; required when there are more filters than `compactInlineFilterCount`. */
  renderMorePanel?: (props: SearchFiltersAllFiltersRenderProps) => ReactNode;
  moreButtonLabel?: string;
  moreButtonIcon?: ComponentProps<typeof Icon>['name'];
  /** Wired into `FilterPopup` for group finder “People” age field (refinement + Configure). */
  filterPopupAgeInput?: string;
  setFilterPopupAgeInput?: (value: string) => void;
  /**
   * Highlights a pill when active state is not only from `refinementList` (e.g. campus/age/geo URL).
   */
  isFilterPillSupplementallyActive?: (item: SearchFilterDesktopItem) => boolean;
  /** Class finder: popup footer uses grouped class count (see FilterPopup `groupedFooterCount`). */
  groupedFooterCount?: boolean;
};

export function SearchFilters({
  onClearAllToUrl,
  desktopFilters,
  compactInlineFilterCount,
  renderMorePanel,
  moreButtonLabel = 'More',
  moreButtonIcon = 'sliderAlt',
  filterPopupAgeInput,
  setFilterPopupAgeInput,
  isFilterPillSupplementallyActive,
  groupedFooterCount = false,
}: SearchFiltersProps) {
  const { indexUiState } = useInstantSearch();
  const { setIsFinderFilterOpen } = useNavbarVisibility();
  const refinementList = useMemo(
    () => (indexUiState.refinementList ?? {}) as Record<string, string[]>,
    [indexUiState.refinementList],
  );

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [useMobileBottomSheet, setUseMobileBottomSheet] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setUseMobileBottomSheet(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Desktop/tablet popovers: freeze navbar hide/show and block page scroll so
  // the sticky filter bar (and absolute popup) stay put. Do NOT set
  // overflow:hidden on html/body — that breaks position:sticky and leaves the
  // popup clipped above the viewport when the navbar was open.
  // Mobile bottom sheets already lock scroll in MobileFilterBottomSheet.
  useEffect(() => {
    const isDesktopFilterOpen =
      Boolean(activeDropdown) && !useMobileBottomSheet;
    setIsFinderFilterOpen(isDesktopFilterOpen);

    if (!isDesktopFilterOpen) {
      return () => setIsFinderFilterOpen(false);
    }

    const isInFilterPopupScroll = (target: unknown) => {
      if (!(target instanceof Element)) return false;
      return target.closest('[data-finder-filter-scroll]') != null;
    };

    const preventPageScroll = (event: Event) => {
      if (isInFilterPopupScroll(event.target)) return;
      event.preventDefault();
    };

    const preventScrollKeys = (event: Event) => {
      const key = 'key' in event ? String((event as { key: string }).key) : '';
      const scrollKeys = new Set([
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' ',
      ]);
      if (!scrollKeys.has(key)) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (isInFilterPopupScroll(target)) return;
      event.preventDefault();
    };

    document.addEventListener('wheel', preventPageScroll, { passive: false });
    document.addEventListener('touchmove', preventPageScroll, {
      passive: false,
    });
    document.addEventListener('keydown', preventScrollKeys);

    return () => {
      setIsFinderFilterOpen(false);
      document.removeEventListener('wheel', preventPageScroll);
      document.removeEventListener('touchmove', preventPageScroll);
      document.removeEventListener('keydown', preventScrollKeys);
    };
  }, [activeDropdown, useMobileBottomSheet, setIsFinderFilterOpen]);

  const hasCompactOverflow =
    compactInlineFilterCount != null &&
    desktopFilters.length > compactInlineFilterCount;
  const showCompactRow =
    compactInlineFilterCount != null &&
    compactInlineFilterCount > 0 &&
    desktopFilters.length > 0 &&
    (!hasCompactOverflow || renderMorePanel != null);

  // For determining which filters to show in the inline compact row and whether to show the "More" button
  const inlineCompactItems = showCompactRow
    ? desktopFilters.slice(0, compactInlineFilterCount)
    : [];
  const overflowDesktopItems = showCompactRow
    ? desktopFilters.slice(compactInlineFilterCount)
    : [];
  const showMoreForOverflow = overflowDesktopItems.length > 1;

  const compactRowButtonCount = showCompactRow
    ? inlineCompactItems.length +
      (overflowDesktopItems.length === 1 ? 1 : showMoreForOverflow ? 1 : 0)
    : 0;

  const moreOverflowSelectedCount = useMemo(() => {
    if (overflowDesktopItems.length <= 1) return 0;
    return overflowDesktopItems.reduce(
      (acc, item) =>
        acc +
        countRefinementsForAttributes(
          refinementList,
          uniqueAttributesFromFilterData(item.data),
        ),
      0,
    );
  }, [overflowDesktopItems, refinementList]);

  const toggleDropdown = (dropdownName: string) => {
    if (activeDropdown === dropdownName) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(dropdownName);
    }
  };

  const closeAllDropdowns = () => {
    setActiveDropdown(null);
  };

  const openMorePanel = () => {
    if (activeDropdown === MORE_FILTERS_ID) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(MORE_FILTERS_ID);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (isInsideSearchFiltersPortal(event.target)) {
        return;
      }
      const { target } = event;
      if (
        containerRef.current &&
        target instanceof Node &&
        !containerRef.current.contains(target)
      ) {
        closeAllDropdowns();
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('pointerdown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [activeDropdown]);

  const dropdownButtonStyles =
    'flex max-w-full items-center justify-center md:justify-between gap-1 rounded-lg border border-[#DEE0E3] px-4 py-2.5 text-sm font-semibold text-neutral-default transition-all duration-300 hover:border-neutral-default cursor-pointer';
  const dropdownButtonOpenStyles =
    'border-ocean bg-ocean/10 text-ocean hover:border-ocean';

  const renderFilterPill = (
    item: SearchFilterDesktopItem,
    options?: {
      embedPopup?: boolean;
      isSingleVisibleButton?: boolean;
      /** Compact row: split full width evenly across visible pills (e.g. 2 filters + More). */
      compactEqualWidth?: boolean;
    },
  ) => {
    const embedPopup = options?.embedPopup ?? true;
    const isSingleVisibleButton = options?.isSingleVisibleButton ?? false;
    const compactEqualWidth = options?.compactEqualWidth ?? false;
    const isOpen = activeDropdown === item.id;
    const selectedCount = countRefinementsForAttributes(
      refinementList,
      uniqueAttributesFromFilterData(item.data),
    );
    const supplemental = isFilterPillSupplementallyActive?.(item) ?? false;
    const isHighlighted = isOpen || selectedCount > 0 || supplemental;
    return (
      <div
        className={cn(
          dropdownButtonStyles,
          isSingleVisibleButton
            ? 'w-full md:w-fit'
            : compactEqualWidth
              ? 'min-w-0 flex-1'
              : 'w-fit',
          embedPopup && 'relative',
          isHighlighted && dropdownButtonOpenStyles,
        )}
        onClick={() => toggleDropdown(item.id)}
      >
        <div className='flex min-w-0 flex-row items-center gap-2'>
          {item.icon ? (
            <Icon
              name={item.icon}
              className={cn(
                'transition-colors duration-300',
                isHighlighted ? 'text-ocean' : 'text-neutral-default',
                selectedCount > 0 && 'hidden lg:inline-block',
              )}
              size={16}
            />
          ) : null}
          <p className='truncate'>{item.label}</p>
          {selectedCount > 0 ? (
            <span
              className={cn(
                'relative flex size-5 shrink-0 items-center justify-center rounded-full py-1 px-2',
                isHighlighted
                  ? 'bg-ocean text-white'
                  : 'bg-neutral-default/20 text-neutral-default',
              )}
            >
              <p className='text-[11px] font-extrabold leading-none! text-center'>
                {selectedCount}
              </p>
            </span>
          ) : null}
        </div>
        <Icon
          name='chevronDown'
          className={cn(
            'ml-1 hidden shrink-0 transition-all duration-300 lg:inline-block',
            isHighlighted ? 'text-ocean' : 'text-neutral-default',
            isOpen && 'rotate-180',
          )}
        />

        {embedPopup ? (
          <FilterPopup
            popupTitle={item.popupTitle}
            data={item.data}
            onHide={closeAllDropdowns}
            showSection={isOpen}
            layout='popover'
            ageInput={filterPopupAgeInput}
            setAgeInput={setFilterPopupAgeInput}
            groupedFooterCount={groupedFooterCount}
          />
        ) : null}
      </div>
    );
  };

  const compactInlineOpenItem =
    !showCompactRow || !activeDropdown || activeDropdown === MORE_FILTERS_ID
      ? undefined
      : desktopFilters.find((f) => f.id === activeDropdown);

  const isMoreOpen = activeDropdown === MORE_FILTERS_ID;
  const isMoreHighlighted =
    isMoreOpen ||
    (!!showCompactRow && showMoreForOverflow && moreOverflowSelectedCount > 0);

  return (
    <div className='flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:gap-4'>
      <div
        ref={containerRef}
        className='flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center'
      >
        {showCompactRow ? (
          <div className='flex w-full min-w-0 flex-col gap-2 lg:hidden'>
            <div
              className={cn(
                'flex w-full min-w-0 items-stretch gap-2',
                compactRowButtonCount > 1 ? 'flex-nowrap' : 'flex-wrap',
              )}
            >
              {inlineCompactItems.map((item) => (
                <Fragment key={item.id}>
                  {renderFilterPill(item, {
                    embedPopup: !useMobileBottomSheet,
                    isSingleVisibleButton: compactRowButtonCount === 1,
                    compactEqualWidth: compactRowButtonCount > 1,
                  })}
                </Fragment>
              ))}

              {overflowDesktopItems.length === 1 ? (
                <Fragment key={overflowDesktopItems[0].id}>
                  {renderFilterPill(overflowDesktopItems[0], {
                    embedPopup: !useMobileBottomSheet,
                    isSingleVisibleButton: compactRowButtonCount === 1,
                    compactEqualWidth: compactRowButtonCount > 1,
                  })}
                </Fragment>
              ) : showMoreForOverflow ? (
                <div
                  className={cn(
                    dropdownButtonStyles,
                    compactRowButtonCount > 1 ? 'min-w-0 flex-1' : 'w-fit',
                    isMoreHighlighted && dropdownButtonOpenStyles,
                  )}
                  onClick={() => openMorePanel()}
                >
                  <div className='flex min-w-0 flex-row items-center gap-2'>
                    <Icon
                      name={moreButtonIcon}
                      className={cn(
                        'transition-colors duration-300',
                        isMoreHighlighted
                          ? 'text-ocean'
                          : 'text-neutral-default',
                        moreOverflowSelectedCount > 0 &&
                          'hidden lg:inline-block',
                      )}
                      size={16}
                    />
                    <p className='truncate'>{moreButtonLabel}</p>
                    {moreOverflowSelectedCount > 0 ? (
                      <span
                        className={cn(
                          'relative flex size-5 shrink-0 items-center justify-center rounded-full py-1 px-2',
                          isMoreHighlighted
                            ? 'bg-ocean text-white'
                            : 'bg-neutral-default/20 text-neutral-default',
                        )}
                      >
                        <p className='text-[11px] font-extrabold leading-none! text-center'>
                          {moreOverflowSelectedCount}
                        </p>
                      </span>
                    ) : null}
                  </div>
                  <Icon
                    name='chevronDown'
                    className={cn(
                      'ml-1 hidden shrink-0 transition-all duration-300 lg:inline-block',
                      isMoreHighlighted ? 'text-ocean' : 'text-neutral-default',
                      isMoreOpen && 'rotate-180',
                    )}
                  />
                </div>
              ) : null}
            </div>

            {useMobileBottomSheet && compactInlineOpenItem ? (
              <FilterPopup
                key={compactInlineOpenItem.id}
                popupTitle={compactInlineOpenItem.popupTitle}
                data={compactInlineOpenItem.data}
                onHide={closeAllDropdowns}
                showSection
                layout='bottomSheet'
                ageInput={filterPopupAgeInput}
                setAgeInput={setFilterPopupAgeInput}
                groupedFooterCount={groupedFooterCount}
              />
            ) : null}

            {showMoreForOverflow && isMoreOpen && renderMorePanel ? (
              useMobileBottomSheet ? (
                renderMorePanel({
                  onHide: closeAllDropdowns,
                  onClearAllToUrl,
                  mobileBottomSheet: true,
                  morePanelTitle: moreButtonLabel,
                })
              ) : (
                <div className='w-full overflow-hidden rounded-lg border border-neutral-300 shadow-md'>
                  {renderMorePanel({
                    onHide: closeAllDropdowns,
                    onClearAllToUrl,
                    mobileBottomSheet: false,
                    morePanelTitle: moreButtonLabel,
                  })}
                </div>
              )
            ) : null}
          </div>
        ) : null}

        <div className='hidden flex-wrap items-center gap-2 lg:flex'>
          {desktopFilters.map((item) => (
            <Fragment key={item.id}>
              {renderFilterPill(item, {
                isSingleVisibleButton: desktopFilters.length === 1,
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
