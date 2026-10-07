import * as Form from '@radix-ui/react-form';
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { pushFormEvent } from '~/lib/gtm';
import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import { formRadioGroupVerticalStyles } from '~/primitives/inputs/form-control.styles';
import {
  radixCheckboxClassName,
  radixCheckboxOptionLabelClassName,
  radixFormFieldStackClassName,
  radixFormLabelClassName,
  radixRadioClassName,
  radixSelectClassName,
  radixTextareaClassName,
  renderRadixInputField,
  RadixFormErrorMessage,
} from '~/primitives/inputs/form-radix-field';
import type { HelpMeFindAGroupLoaderReturnType } from './types';

const API_ROUTE = '/api/help-me-find-a-group';

const TYPE_OPTIONS = [
  { value: 'In Person', label: 'In Person' },
  { value: 'Online', label: 'Online' },
] as const;

interface HelpMeFindAGroupFormProps {
  onSuccess: () => void;
}

const HelpMeFindAGroupForm: React.FC<HelpMeFindAGroupFormProps> = ({
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [campuses, setCampuses] = useState<
    HelpMeFindAGroupLoaderReturnType['campuses']
  >([]);
  const [hubs, setHubs] = useState<HelpMeFindAGroupLoaderReturnType['hubs']>(
    [],
  );
  const fetcher = useFetcher();

  useEffect(() => {
    fetcher.load(API_ROUTE);
  }, []);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setLoading(false);

      if ('campuses' in fetcher.data) {
        const data = fetcher.data as HelpMeFindAGroupLoaderReturnType;
        setCampuses(data.campuses);
        setHubs(data.hubs);
      } else if ('error' in fetcher.data) {
        setError(fetcher.data.error || 'An unexpected error occurred');
      } else {
        setError(null);
        pushFormEvent(
          'form_complete',
          'help_me_find_a_group',
          'Help Me Find a Group',
        );
        onSuccess();
      }
    }

    if (fetcher.state === 'submitting') {
      setLoading(true);
      setError(null);
    }
  }, [fetcher.state, fetcher.data, onSuccess]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const hubValues = formData.getAll('Hub');

    if (hubValues.length === 0) {
      setError('Please select at least one area.');
      return;
    }

    try {
      fetcher.submit(formData, {
        method: 'post',
        action: API_ROUTE,
      });
    } catch {
      setError(
        'An error occurred while submitting the form. Please try again.',
      );
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className='mb-6 text-3xl text-navy font-bold'>
        Help Me Find a Group
      </h2>
      <Form.Root
        onSubmit={handleSubmit}
        className='flex flex-col md:grid text-left grid-cols-1 gap-y-3 gap-x-6 md:grid-cols-2'
      >
        {renderRadixInputField(
          'FirstName',
          'First Name',
          'text',
          'Please enter your first name',
        )}
        {renderRadixInputField(
          'LastName',
          'Last Name',
          'text',
          'Please enter your last name',
        )}

        {renderRadixInputField(
          'PhoneNumber',
          'Phone',
          'tel',
          'Please enter your phone number',
        )}
        {renderRadixInputField(
          'EmailAddress',
          'Email',
          'email',
          'Please enter your email address',
        )}

        <Form.Field
          name='Campus'
          className={cn('mb-4 md:col-span-2', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixFormLabelClassName}>Campus</Form.Label>
          <Form.Control asChild>
            <select className={radixSelectClassName} required>
              <option value=''>Select a Campus</option>
              {campuses.map(({ guid, name }) => (
                <option key={guid} value={guid}>
                  {name}
                </option>
              ))}
            </select>
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please select a campus
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field name='Type' className={cn(radixFormFieldStackClassName)}>
          <Form.Label className={radixFormLabelClassName}>
            I prefer to meet:
          </Form.Label>
          <div className={formRadioGroupVerticalStyles} role='radiogroup'>
            {TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className='inline-flex cursor-pointer items-center gap-2'
              >
                <Form.Control asChild>
                  <input
                    type='radio'
                    name='Type'
                    value={option.value}
                    required
                    className={radixRadioClassName}
                  />
                </Form.Control>
                <span className='leading-4'>{option.label}</span>
              </label>
            ))}
          </div>
          <RadixFormErrorMessage match='valueMissing'>
            Please select a meeting preference
          </RadixFormErrorMessage>
        </Form.Field>

        <div
          className={cn(
            'mt-2 md:mt-0 col-span-1',
            radixFormFieldStackClassName,
          )}
        >
          <p className={radixFormLabelClassName}>
            I am interested in meeting with:
          </p>
          <div className='flex flex-col gap-2'>
            {hubs.map((hub) => (
              <label
                key={hub.guid}
                className={cn(
                  'flex gap-2 md:items-center',
                  radixCheckboxOptionLabelClassName,
                )}
              >
                <input
                  type='checkbox'
                  name='Hub'
                  value={hub.guid}
                  className={radixCheckboxClassName}
                />
                {hub.value}
              </label>
            ))}
          </div>
        </div>

        <Form.Field
          name='Comments'
          className={cn(
            'col-span-1 mt-2 md:mt-0 md:col-span-2',
            radixFormFieldStackClassName,
          )}
        >
          <Form.Label className={radixFormLabelClassName}>Comments</Form.Label>
          <Form.Control asChild>
            <textarea className={radixTextareaClassName} rows={4} />
          </Form.Control>
        </Form.Field>

        {error && <p className='text-alert col-span-2 text-center'>{error}</p>}

        <Form.Submit className='mt-6 mx-auto col-span-1 md:col-span-2' asChild>
          <Button
            className='w-40 h-12'
            size='md'
            type='submit'
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Submit'}
          </Button>
        </Form.Submit>
      </Form.Root>
    </>
  );
};

export default HelpMeFindAGroupForm;
