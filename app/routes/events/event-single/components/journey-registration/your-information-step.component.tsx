import * as Form from '@radix-ui/react-form';
import { useEffect, useRef } from 'react';
import { useFetcher } from 'react-router';
import Icon from '~/primitives/icon';
import { Button } from '~/primitives/button/button.primitive';
import { pushFormEvent } from '~/lib/gtm';
import { cn } from '~/lib/utils';
import {
  radixFormFieldStackClassName,
  radixFormLabelClassName,
  radixSelectClassName,
  radixTextareaClassName,
  renderRadixInputField,
  RadixFormErrorMessage,
  RadixFormSelectShell,
} from '~/primitives/inputs/form-radix-field';
import { FORM_COPY } from '~/components/modals/journey-finder-sign-up/journey-finder-sign-up-form.component';
import {
  formatSessionShortDate,
  formatSessionTime,
  JOURNEY_SESSION_NUMBERS,
  type JourneyCampus,
  type JourneySessionSelection,
} from '~/lib/journey-sessions';

/** Kept between submissions so "Schedule Another Session" doesn't re-ask. */
export type JourneyPersonDetails = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  atCF: string;
  reason: string;
  hopeToGet: string;
};

interface YourInformationStepProps {
  campuses: JourneyCampus[];
  preferredCampusId: number;
  selection: JourneySessionSelection;
  registered: JourneySessionSelection;
  isSpanish: boolean;
  defaults?: JourneyPersonDetails;
  onBack: () => void;
  onSuccess: (details: JourneyPersonDetails) => void;
}

type ActionResult = { success?: boolean; error?: string };

export const YourInformationStep = ({
  campuses,
  preferredCampusId,
  selection,
  registered,
  isSpanish,
  defaults,
  onBack,
  onSuccess,
}: YourInformationStepProps) => {
  const fetcher = useFetcher<ActionResult>();
  const submittedRef = useRef<JourneyPersonDetails | null>(null);
  const copy = FORM_COPY[isSpanish ? 'Spanish' : 'English'];
  const isSubmitting = fetcher.state !== 'idle';
  const campusName = (id: number) =>
    campuses.find((campus) => campus.id === id)?.name ?? '';
  const scheduledCount = JOURNEY_SESSION_NUMBERS.filter(
    (n) => selection[n] || registered[n],
  ).length;

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data?.success) return;
    pushFormEvent('form_complete', 'journey_sign_up', 'Journey Sign Up');
    if (submittedRef.current) onSuccess(submittedRef.current);
  }, [fetcher.state, fetcher.data]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = (name: string) => formData.get(name)?.toString() ?? '';
    submittedRef.current = {
      firstName: value('firstName'),
      lastName: value('lastName'),
      phone: value('phone'),
      email: value('email'),
      atCF: value('atCF'),
      reason: value('reason'),
      hopeToGet: value('hopeToGet'),
    };
    fetcher.submit(formData, {
      method: 'post',
      action: '/api/journey-sign-up',
    });
  };

  return (
    <div className='flex w-full max-w-[880px] flex-col gap-4'>
      <div className='flex items-center gap-4'>
        <button
          type='button'
          onClick={onBack}
          className='flex items-center gap-1 text-sm font-semibold text-black'
        >
          <Icon name='chevronLeft' size={16} /> Back
        </button>
        <h3 className='text-xl font-bold text-black'>Your Information</h3>
      </div>

      <div className='flex flex-col gap-6 md:flex-row md:items-start'>
        <div className='w-full rounded-xl border border-neutral-lighter bg-white p-6 md:flex-1'>
          <div className='mb-6 flex items-center gap-2 text-black'>
            <Icon name='user' size={16} className='text-ocean' />
            <h4 className='text-sm font-extrabold'>{copy.cardHeading}</h4>
          </div>
          <Form.Root
            onSubmit={handleSubmit}
            className='grid grid-cols-1 gap-x-4 gap-y-1 text-left md:grid-cols-2'
          >
            {renderRadixInputField(
              'firstName',
              copy.firstName,
              'text',
              copy.requiredFirstName,
              defaults?.firstName,
            )}
            {renderRadixInputField(
              'lastName',
              copy.lastName,
              'text',
              copy.requiredLastName,
              defaults?.lastName,
            )}
            {renderRadixInputField(
              'phone',
              copy.phone,
              'tel',
              copy.requiredPhone,
              defaults?.phone,
            )}
            {renderRadixInputField(
              'email',
              copy.email,
              'email',
              copy.requiredEmail,
              defaults?.email,
            )}

            <Form.Field
              name='atCF'
              className={cn('mb-4 md:col-span-2', radixFormFieldStackClassName)}
            >
              <Form.Label className={radixFormLabelClassName}>
                {copy.atCF}
              </Form.Label>
              <RadixFormSelectShell>
                <Form.Control asChild>
                  <select
                    required
                    defaultValue={defaults?.atCF ?? ''}
                    className={radixSelectClassName}
                  >
                    <option value='' disabled>
                      {isSpanish ? 'Selecciona una' : 'Select one'}
                    </option>
                    {copy.atCFOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Form.Control>
              </RadixFormSelectShell>
              <RadixFormErrorMessage match='valueMissing'>
                {copy.requiredAtCF}
              </RadixFormErrorMessage>
            </Form.Field>

            {/* Rock stores Reason as a coded single-select, so this stays a select rather than the design's free-text box. */}
            <Form.Field
              name='reason'
              className={cn('mb-4 md:col-span-2', radixFormFieldStackClassName)}
            >
              <Form.Label className={radixFormLabelClassName}>
                {copy.reason}
              </Form.Label>
              <RadixFormSelectShell>
                <Form.Control asChild>
                  <select
                    required
                    defaultValue={defaults?.reason ?? ''}
                    className={radixSelectClassName}
                  >
                    <option value='' disabled>
                      {copy.reasonPlaceholder}
                    </option>
                    {copy.reasonOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Form.Control>
              </RadixFormSelectShell>
              <RadixFormErrorMessage match='valueMissing'>
                {copy.requiredReason}
              </RadixFormErrorMessage>
            </Form.Field>

            <Form.Field
              name='hopeToGet'
              className={cn('mb-4 md:col-span-2', radixFormFieldStackClassName)}
            >
              <Form.Label className={radixFormLabelClassName}>
                {copy.hopeToGet}
              </Form.Label>
              <Form.Control asChild>
                <textarea
                  rows={3}
                  defaultValue={defaults?.hopeToGet}
                  className={radixTextareaClassName}
                />
              </Form.Control>
            </Form.Field>

            <input
              type='hidden'
              name='preferredCampusId'
              value={preferredCampusId}
            />
            {JOURNEY_SESSION_NUMBERS.map((n) =>
              selection[n] ? (
                <input
                  key={n}
                  type='hidden'
                  name={`session${n}Group`}
                  value={selection[n]?.groupGuid}
                />
              ) : null,
            )}

            {fetcher.data?.error && (
              <p className='text-center text-alert md:col-span-2'>
                {fetcher.data.error}
              </p>
            )}

            <Form.Submit asChild className='md:col-span-2'>
              <Button
                type='submit'
                size='md'
                className='mt-2 h-12 w-full rounded-lg'
                disabled={isSubmitting}
              >
                {isSubmitting ? copy.loading : 'Complete Registration'}
              </Button>
            </Form.Submit>
          </Form.Root>
        </div>

        <aside className='flex w-full flex-col gap-3 md:w-[260px]'>
          <div className='flex items-center justify-between'>
            <h4 className='font-bold text-black'>Your Sessions</h4>
            <button
              type='button'
              onClick={onBack}
              className='text-xs font-semibold text-ocean'
            >
              Edit Sessions
            </button>
          </div>
          {JOURNEY_SESSION_NUMBERS.map((n) => {
            const option = registered[n] ?? selection[n];
            return (
              <div
                key={n}
                className='rounded-lg border border-neutral-lighter bg-white px-3 py-2'
              >
                <p className='text-xs text-neutral-default'>
                  Session {n}
                  {registered[n] ? ' · Registered' : ''}
                </p>
                {option ? (
                  <>
                    <p className='text-sm font-semibold text-black'>
                      {formatSessionShortDate(option.startsAt)} ·{' '}
                      {formatSessionTime(option.startsAt)}
                    </p>
                    <p className='text-xs text-neutral-default'>
                      {campusName(option.campusId)}
                    </p>
                  </>
                ) : (
                  <p className='text-sm text-neutral-default'>Not scheduled</p>
                )}
              </div>
            );
          })}
          <p className='text-xs text-neutral-default'>
            {scheduledCount} of 3 sessions scheduled.
            {scheduledCount < 3 &&
              ' You can schedule the remaining sessions later.'}
          </p>
        </aside>
      </div>
    </div>
  );
};
