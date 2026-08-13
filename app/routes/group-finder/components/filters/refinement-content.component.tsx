import React from 'react';
import { useRefinementList } from 'react-instantsearch';
import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import { Icon } from '~/primitives/icon/icon';
import { formatMeetingFrequencyLabel } from '../../format-group-meeting-schedule';
import { GroupType } from '../../types';

function meetingTypeUsesGlobeIcon(label: string): boolean {
  const t = label.trim().toLowerCase();
  return t === 'virtual' || t === 'online';
}

interface AllFiltersRefinementContentProps {
  data: {
    content: {
      attribute: string;
      isMeetingType?: boolean;
      isWeekdays?: boolean;
    };
  };
  showSection: boolean;
}

/** Class finder (and legacy) accordion body — group finder overflow uses {@link FilterPopup} instead. */
export const AllFiltersRefinementContent = ({
  data,
  showSection,
}: AllFiltersRefinementContentProps) => {
  const { items, refine } = useRefinementList({
    attribute: data.content.attribute,
  });
  const content = data.content;

  const MEETING_DAYS_ORDER = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  const sortedItems =
    content.isWeekdays === true
      ? [...items].sort(
          (a, b) =>
            MEETING_DAYS_ORDER.indexOf(a.label) -
            MEETING_DAYS_ORDER.indexOf(b.label),
        )
      : items;

  const styles = {
    button:
      'h-auto min-h-0 min-w-0 w-fit whitespace-normal border-0 bg-gray px-3 py-1.5 text-sm font-semibold leading-tight text-text-primary transition-colors duration-300 hover:bg-neutral-200 rounded-[16777200px]',
    meetingTypeButton: 'flex items-center gap-1.5',
    buttonRefined: 'bg-ocean !text-white hover:!bg-navy hover:!text-white',
  };

  const renderButton = (
    item: { label: string; value: string; isRefined: boolean; count: number },
    index: number,
  ) => (
    <Button
      key={index}
      intent='secondary'
      size='sm'
      className={cn(
        styles.button,
        content.isMeetingType && styles.meetingTypeButton,
        item.isRefined && styles.buttonRefined,
      )}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        refine(item.value);
      }}
    >
      {content.isMeetingType && (
        <Icon
          name={meetingTypeUsesGlobeIcon(item.label) ? 'globe' : 'map'}
          size={16}
          className={item.isRefined ? 'text-white' : 'hover:text-white'}
        />
      )}
      {content.attribute === ('meetingDay' as const satisfies keyof GroupType)
        ? item.label === 'Thursday'
          ? 'Thur'
          : item.label.substring(0, 3)
        : content.attribute ===
            ('meetingFrequency' as const satisfies keyof GroupType)
          ? formatMeetingFrequencyLabel(item.label || item.value)
          : item.label}
    </Button>
  );

  return (
    <div
      className={cn(
        'cursor-default',
        'flex flex-col gap-4 overflow-hidden',
        showSection ? 'h-auto' : 'h-0',
      )}
    >
      <div className={cn('flex flex-wrap gap-x-1.5 gap-y-1.5 bg-white pr-4')}>
        {sortedItems.map((item, index) => (
          <div key={index}>{renderButton(item, index)}</div>
        ))}
      </div>
    </div>
  );
};
