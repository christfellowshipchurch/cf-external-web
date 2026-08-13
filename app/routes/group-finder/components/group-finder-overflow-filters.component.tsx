import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInstantSearch } from 'react-instantsearch';

import {
  FilterPopup,
  MobileFilterBottomSheet,
} from '~/components/finders/search-filters/filter-popup.component';
import { hasInstantSearchIndexUiActiveFilters } from '~/lib/algolia-active-filters';
import {
  getGroupFinderMoreOverflowFilterData,
  getGroupFinderTabletFiltersPanelData,
} from '../group-search-filters.data';
import {
  parseGroupFinderUrlState,
  hasGroupFinderNonInstantSearchFilters,
} from '../group-finder-url-state';
import { FiltersFooter } from './filters/filters-footer.component';
import { FiltersHeader } from './filters/filters-header.component';

type Coordinates = {
  lat: number | null;
  lng: number | null;
} | null;

/**
 * Group finder compact-row overflow: reuses {@link FilterPopup} (`layout="embedded"`) instead of a
 * separate all-filters accordion stack.
 */
export function GroupFinderOverflowFiltersPanel({
  onHide,
  ageInput,
  setAgeInput,
  coordinates,
  setCoordinates,
  locationSource,
  onLocationKind,
  onClearAllToUrl,
  mobileBottomSheet = false,
  bottomSheetTitle,
}: {
  onHide: () => void;
  ageInput: string;
  setAgeInput: (age: string) => void;
  coordinates: Coordinates;
  setCoordinates: (coordinates: Coordinates) => void;
  locationSource: 'zip' | 'gps' | null;
  onLocationKind: (kind: 'zip' | 'gps' | null) => void;
  onClearAllToUrl?: () => void;
  mobileBottomSheet?: boolean;
  bottomSheetTitle: string;
}) {
  const filterOpts = useMemo(
    () => ({
      coordinates,
      setCoordinates,
      locationSource,
      onLocationKind,
    }),
    [coordinates, setCoordinates, locationSource, onLocationKind],
  );

  const mobileData = useMemo(
    () => getGroupFinderMoreOverflowFilterData(filterOpts),
    [filterOpts],
  );

  const tabletData = useMemo(
    () => getGroupFinderTabletFiltersPanelData(filterOpts),
    [filterOpts],
  );

  const data = mobileBottomSheet ? mobileData : tabletData;

  const [searchParams] = useSearchParams();
  const { setIndexUiState, indexUiState } = useInstantSearch();

  const clearAllDisabled = !(
    hasInstantSearchIndexUiActiveFilters(indexUiState) ||
    hasGroupFinderNonInstantSearchFilters(
      parseGroupFinderUrlState(searchParams),
      coordinates,
    )
  );

  const clearAllRefinements = () => {
    onClearAllToUrl?.();
    setIndexUiState((state) => ({
      ...state,
      query: '',
      refinementList: {},
      page: 0,
    }));
    setCoordinates({ lat: null, lng: null });
    setAgeInput('');
    onLocationKind(null);
  };

  const footer = (
    <FiltersFooter
      onHide={onHide}
      onClearAll={clearAllRefinements}
      clearAllDisabled={clearAllDisabled}
    />
  );

  const embeddedFilters = (
    <FilterPopup
      popupTitle={bottomSheetTitle}
      data={data}
      showSection
      onHide={onHide}
      layout='embedded'
      ageInput={ageInput}
      setAgeInput={setAgeInput}
    />
  );

  if (mobileBottomSheet) {
    return (
      <MobileFilterBottomSheet
        title={bottomSheetTitle}
        onClose={onHide}
        scrollable={
          <div className='flex min-h-0 flex-col px-4 pb-4 pt-1'>
            {embeddedFilters}
          </div>
        }
        footer={
          <div className='min-w-0 shrink-0 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_36px_-12px_rgba(15,23,42,0.14)]'>
            {footer}
          </div>
        }
      />
    );
  }

  return (
    <div className='flex min-h-0 w-full max-h-[min(85vh,calc(100dvh-10rem))] flex-col overflow-hidden bg-white shadow-md'>
      <div className='shrink-0'>
        <FiltersHeader onHide={onHide} />
      </div>

      <div
        data-finder-filter-scroll
        className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4'
      >
        {embeddedFilters}
      </div>

      <div className='shrink-0'>{footer}</div>
    </div>
  );
}
