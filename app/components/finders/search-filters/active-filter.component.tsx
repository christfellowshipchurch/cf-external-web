import { useMemo } from 'react';
import { useInstantSearch } from 'react-instantsearch';
import startCase from 'lodash/startCase';
import { Icon } from '~/primitives/icon/icon';
import { AlgoliaFinderClearAllButton } from '~/routes/group-finder/components/clear-all-button.component';
import { formatMeetingFrequencyLabel } from '~/routes/group-finder/format-group-meeting-schedule';
import { GroupType } from '~/routes/group-finder/types';

type RefinementChip = {
  key: string;
  attribute: string;
  value: string;
  label: string;
};

function refinementChipDisplayLabel(attribute: string, value: string): string {
  if (attribute === ('adultsOnly' as const satisfies keyof GroupType)) {
    const v = value.toLowerCase();
    if (v === 'true') return 'Adults Only';
    if (v === 'false') return 'Child Welcome';
  }
  if (attribute === ('meetingFrequency' as const satisfies keyof GroupType)) {
    return formatMeetingFrequencyLabel(value);
  }
  if (attribute === 'eventCategories') {
    return startCase(value);
  }
  if (attribute === 'eventLocations') {
    return value;
  }
  return value;
}

export function ActiveFilters({
  onClearAllToUrl,
  additionalFiltersActive,
  additionalFiltersHint = 'Campus, age, or map filters are applied.',
}: {
  /** When set, “Clear All” is shown at the end of the row (all breakpoints). */
  onClearAllToUrl?: () => void;
  /** True when filters live outside InstantSearch uiState (e.g. group finder campus / age / geo). */
  additionalFiltersActive?: boolean;
  /** Shown when there are no refinement chips but `additionalFiltersActive` is true. */
  additionalFiltersHint?: string;
} = {}) {
  const { indexUiState, setIndexUiState } = useInstantSearch();
  const refinementList = (indexUiState.refinementList ?? {}) as Record<
    string,
    string[]
  >;
  const refinementChips = useMemo((): RefinementChip[] => {
    const out: RefinementChip[] = [];
    for (const [attribute, values] of Object.entries(refinementList)) {
      if (!Array.isArray(values)) continue;
      for (const raw of values) {
        if (raw == null || String(raw).trim() === '') continue;
        const value = String(raw);
        out.push({
          key: `${attribute}:${value}`,
          attribute,
          value,
          label: refinementChipDisplayLabel(attribute, value),
        });
      }
    }
    return out;
  }, [refinementList]);

  if (
    refinementChips.length === 0 &&
    !((additionalFiltersActive ?? false) && onClearAllToUrl)
  ) {
    return null;
  }

  const removeRefinement = (attribute: string, value: string) => {
    setIndexUiState((state) => {
      const rl = {
        ...(state.refinementList as Record<string, string[]> | undefined),
      };
      const current = rl[attribute] ?? [];
      const next = current.filter((v) => v !== value);
      if (next.length === 0) delete rl[attribute];
      else rl[attribute] = next;
      return { ...state, refinementList: rl, page: 0 };
    });
  };

  const chipClassName =
    'bg-ocean/10 text-ocean font-semibold text-sm min-h-0 min-w-0 px-3 py-2 rounded-[999px] flex flex-row items-center gap-1.5 transition-colors';

  return (
    <div className='border-t border-neutral-default/15 pt-4 pb-3 max-w-screen-content mx-auto w-full min-w-0'>
      <div className='flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2'>
        <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
          <p className='text-neutral-default font-semibold text-sm shrink-0'>
            Active<span className='inline sm:hidden'>:</span>{' '}
            <span className='hidden sm:inline'>Filters:</span>
          </p>
          <div className='flex min-w-0 flex-wrap items-center gap-2'>
            {refinementChips.length > 0 ? (
              refinementChips.map((chip) => (
                <div
                  key={chip.key}
                  className={chipClassName}
                  role='group'
                  aria-label={`Active filter ${chip.label}`}
                >
                  <span className='max-w-[220px] truncate' title={chip.label}>
                    {chip.label}
                  </span>
                  <button
                    type='button'
                    className='shrink-0 cursor-pointer rounded-full p-0.5 text-ocean transition-colors hover:bg-ocean/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-1'
                    aria-label={`Remove filter ${chip.label}`}
                    onClick={() => removeRefinement(chip.attribute, chip.value)}
                  >
                    <Icon name='x' className='text-ocean' size={16} />
                  </button>
                </div>
              ))
            ) : (additionalFiltersActive ?? false) ? (
              <p className='text-neutral-default text-sm'>
                {additionalFiltersHint}
              </p>
            ) : null}
          </div>
        </div>
        {refinementChips.length > 0 || onClearAllToUrl ? (
          <div className='ml-auto shrink-0'>
            <AlgoliaFinderClearAllButton
              onClearAllToUrl={onClearAllToUrl}
              additionalFiltersActive={additionalFiltersActive}
              className='text-sm sm:text-base'
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
