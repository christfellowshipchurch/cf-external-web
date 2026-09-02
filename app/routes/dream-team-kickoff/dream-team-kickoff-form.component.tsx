import * as Form from '@radix-ui/react-form';
import { useEffect, useState } from 'react';
import { useFetcher, useSearchParams } from 'react-router-dom';
import { pushFormEvent } from '~/lib/gtm';
import { cn } from '~/lib/utils';
import Icon from '~/primitives/icon';
import { Button } from '~/primitives/button/button.primitive';
import {
  radixFormFieldStackClassName,
  radixFormLabelClassName,
  radixSelectClassName,
  renderRadixInputField,
  RadixFormErrorMessage,
  RadixFormSelectShell,
} from '~/primitives/inputs/form-radix-field';
import BirthdateInput from '~/primitives/inputs/date-input/birthdate-input.primitive';
import type { DreamTeamKickoffLoaderReturnType } from './types';

interface DreamTeamKickoffFormProps {
  onSuccess: (details?: DreamTeamKickoffSuccessDetails) => void;
  groupGuid?: string;
}

export type DreamTeamKickoffSuccessDetails = {
  firstName: string;
  lastName: string;
};

type SelectOption = { value: string; label: string };
type DreamTeamKickoffActionData = { success: true } | { error: string };

const YES_NO_OPTIONS: SelectOption[] = [
  { value: '1', label: 'Yes' },
  { value: '2', label: 'No' },
];

const renderInputField = renderRadixInputField;

const DreamTeamKickoffForm: React.FC<DreamTeamKickoffFormProps> = ({
  onSuccess,
  groupGuid,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [submittedName, setSubmittedName] =
    useState<DreamTeamKickoffSuccessDetails | null>(null);
  const fetcher = useFetcher<DreamTeamKickoffActionData>();
  const [searchParams] = useSearchParams();
  const campusesFetcher = useFetcher<DreamTeamKickoffLoaderReturnType>({
    key: 'dream-team-kickoff-campuses',
  });
  const isSubmitting = fetcher.state === 'submitting';
  const campuses = campusesFetcher.data?.campuses ?? [];
  const selectedGroupGuid = groupGuid ?? searchParams.get('Group') ?? '';

  useEffect(() => {
    campusesFetcher.load('/dream-team-kickoff');
  }, []);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if ('error' in fetcher.data) {
        setError(fetcher.data.error || 'An unexpected error occurred');
      } else if ('success' in fetcher.data) {
        setError(null);
        pushFormEvent(
          'form_complete',
          'dream_team_kickoff',
          'Dream Team Kickoff Sign Up',
        );
        onSuccess(submittedName ?? undefined);
      }
    }

    if (fetcher.state === 'submitting') {
      setError(null);
    }
  }, [fetcher.state, fetcher.data, onSuccess]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmittedName({
      firstName: formData.get('FirstName')?.toString() ?? '',
      lastName: formData.get('LastName')?.toString() ?? '',
    });
    const actionSearchParams = selectedGroupGuid
      ? `?${new URLSearchParams({ Group: selectedGroupGuid }).toString()}`
      : '';

    try {
      fetcher.submit(formData, {
        method: 'post',
        action: `/dream-team-kickoff${actionSearchParams}`,
      });
    } catch {
      setError(
        'An error occurred while submitting the form. Please try again.',
      );
    }
  };

  const renderSelectField = (
    name: string,
    label: string,
    placeholder: string,
    options: SelectOption[],
  ) => (
    <Form.Field
      name={name}
      className={cn('mb-4', radixFormFieldStackClassName)}
    >
      <Form.Label className={radixFormLabelClassName}>{label}</Form.Label>
      <RadixFormSelectShell>
        <Form.Control asChild>
          <select
            name={name}
            required
            defaultValue=''
            className={radixSelectClassName}
          >
            <option value='' disabled>
              {placeholder}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Form.Control>
      </RadixFormSelectShell>
      <RadixFormErrorMessage match='valueMissing'>
        Please select an option
      </RadixFormErrorMessage>
    </Form.Field>
  );

  return (
    <div className='w-full rounded-xl border border-neutral-lighter bg-white p-6 shadow-sm md:p-8'>
      <div className='mb-6 flex items-center gap-2 text-black'>
        <Icon name='user' size={16} className='text-black' />
        <h2 className='text-sm font-extrabold'>Personal Information</h2>
      </div>
      <Form.Root
        onSubmit={handleSubmit}
        className='flex flex-col md:grid text-left grid-cols-1 gap-y-3 gap-x-6 md:grid-cols-2'
      >
        {renderInputField(
          'FirstName',
          'First Name',
          'text',
          'Please enter your first name',
        )}
        {renderInputField(
          'LastName',
          'Last Name',
          'text',
          'Please enter your last name',
        )}
        {renderInputField(
          'PhoneNumber',
          'Cell Phone',
          'tel',
          'Please enter a valid number',
        )}
        {renderInputField(
          'EmailAddress',
          'Email Address',
          'email',
          'Please enter a valid email',
        )}

        <Form.Field
          name='Campus'
          className={cn('mb-4', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixFormLabelClassName}>
            Campus Location
          </Form.Label>
          <RadixFormSelectShell>
            <Form.Control asChild>
              <select
                name='Campus'
                required
                defaultValue=''
                className={radixSelectClassName}
              >
                <option value='' disabled>
                  Select a campus
                </option>
                {campuses.map((campus) => (
                  <option key={campus.guid} value={campus.guid}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </Form.Control>
          </RadixFormSelectShell>
          <RadixFormErrorMessage match='valueMissing'>
            Please select a campus
          </RadixFormErrorMessage>
        </Form.Field>

        <BirthdateInput
          name='Birthdate'
          label='Birthdate'
          isRequired
          className='mb-4'
        />
        {renderSelectField(
          'CompletedJourney',
          'Have you completed the Journey?',
          'Select an option',
          YES_NO_OPTIONS,
        )}
        {renderSelectField(
          'FilledOutApplication',
          'Have you filled out a Volunteer Application?',
          'Select an option',
          YES_NO_OPTIONS,
        )}

        <p className='col-span-1 md:col-span-2 text-sm text-navy'>
          Want to explore what you can be a part of? Check it out{' '}
          <a
            href='https://www.christfellowship.church/volunteer#church'
            target='_blank'
            rel='noreferrer'
            className='font-bold underline'
          >
            here
          </a>
          !
        </p>

        {renderSelectField(
          'ActiveOnDreamTeam',
          'Are you actively serving on a Dream Team?',
          'Select an option',
          YES_NO_OPTIONS,
        )}

        {error && (
          <p className='text-alert col-span-1 md:col-span-2 text-center'>
            {error}
          </p>
        )}

        <Form.Submit className='mt-6 mx-auto col-span-1 md:col-span-2' asChild>
          <Button
            className='w-full h-12'
            size='md'
            type='submit'
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Loading...' : 'Submit'}
          </Button>
        </Form.Submit>
      </Form.Root>
    </div>
  );
};

export default DreamTeamKickoffForm;
