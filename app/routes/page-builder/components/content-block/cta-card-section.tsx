import { FC } from 'react';
import { ContentBlockData } from '../../types';
import { cn, parseRockKeyValueList } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import lowerCase from 'lodash/lowerCase';
import HTMLRenderer from '~/primitives/html-renderer';
import { getCtaStyles } from '../builder-utils';
import { SetAReminderModal } from '~/components/modals/set-a-reminder/reminder-modal.component';

const SET_A_REMINDER_SENTINELS = new Set([
  '/#set-a-reminder',
  '#set-a-reminder',
]);

// CTA Card Layout
export const CtaCardSection: FC<{ data: ContentBlockData }> = ({ data }) => {
  const ctas = parseRockKeyValueList(data.callsToAction ?? '').map((cta) => ({
    title: cta.key,
    url: cta.value,
  }));
  const { isDark, getButtonIntent, getButtonClassName } = getCtaStyles(data, 2);

  return (
    <section
      className={cn('content-padding py-28', data?.className ?? '')}
      aria-label={data.name}
    >
      <div
        className={cn(
          'max-w-screen-content mx-auto flex flex-col md:flex-row gap-10',
          'md:items-center justify-between',
          'border border-neutral-lighter rounded-2xl p-8 md:p-12',
          `bg-${lowerCase(data.backgroundColor)}`,
        )}
      >
        <div className='flex-1 lg:max-w-[70%]'>
          <h2
            className={cn('heading-section-sm mb-4', {
              'text-white': isDark,
            })}
          >
            {data.name}
          </h2>
          <HTMLRenderer
            className={isDark ? 'text-text-alternate' : 'text-text-secondary'}
            html={data.content}
          />
        </div>

        <div className='flex flex-col lg:flex-row gap-2'>
          {/* Limit to 2 CTA buttons */}
          {ctas.slice(0, 2).map((cta, idx) =>
            SET_A_REMINDER_SENTINELS.has(cta.url) ? (
              <SetAReminderModal
                key={cta.url}
                intent={getButtonIntent(idx)}
                buttonClassName={cn(getButtonClassName(idx), 'font-normal')}
              />
            ) : (
              <Button
                key={cta.url}
                className={cn(getButtonClassName(idx), 'font-normal')}
                intent={getButtonIntent(idx)}
                href={cta.url}
              >
                {cta.title}
              </Button>
            ),
          )}
        </div>
      </div>
    </section>
  );
};
