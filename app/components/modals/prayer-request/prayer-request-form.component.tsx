import * as Form from '@radix-ui/react-form';
import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { pushFormEvent } from '~/lib/gtm';
import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import {
  radixFormFieldStackClassName,
  radixFormLabelClassName,
  radixSelectClassName,
  radixTextareaClassName,
  renderRadixInputField,
  RadixFormErrorMessage,
} from '~/primitives/inputs/form-radix-field';
import { PrayerRequestLoaderReturnType } from '~/routes/prayer-request/types';

interface PrayerRequestFormProps {
  onSuccess: (firstName: string) => void;
}

const followUpOptions = [
  { value: '1', label: 'Yes - Text Message' },
  { value: '2', label: 'Yes - Phone Call' },
  { value: '3', label: 'Yes - Email' },
  { value: '4', label: 'No Thank You' },
];

const PrayerRequestForm: React.FC<PrayerRequestFormProps> = ({ onSuccess }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [campuses, setCampuses] = useState<
    PrayerRequestLoaderReturnType['campuses']
  >([]);
  const submittedFirstName = useRef('');
  const fetcher = useFetcher();

  useEffect(() => {
    fetcher.load('/prayer-request');
  }, []);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setLoading(false);

      if ('campuses' in fetcher.data) {
        setCampuses((fetcher.data as PrayerRequestLoaderReturnType).campuses);
      } else if ('error' in fetcher.data) {
        setError(fetcher.data.error || 'An unexpected error occurred');
      } else {
        setError(null);
        pushFormEvent('form_complete', 'prayer_request', 'Prayer Request');
        onSuccess(submittedFirstName.current);
      }
    }

    if (fetcher.state === 'submitting') {
      setLoading(true);
      setError(null);
    }
  }, [fetcher.state, fetcher.data, onSuccess]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    submittedFirstName.current = String(formData.get('FirstName') || '');

    try {
      fetcher.submit(formData, {
        method: 'post',
        action: '/prayer-request',
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
      <h2 className='mb-6 text-3xl text-navy font-bold'>Prayer Request</h2>
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
          'Email',
          'Email',
          'email',
          'Please enter your email address',
        )}
        {renderRadixInputField(
          'MobilePhone',
          'Mobile Phone',
          'tel',
          'Please enter your phone number',
        )}

        <Form.Field
          name='Campus'
          className={cn('mb-4 md:col-span-2', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixFormLabelClassName}>Campus</Form.Label>
          <Form.Control asChild>
            {campuses && (
              <select className={radixSelectClassName} required>
                <option value=''>Select a Campus</option>
                {campuses.map(({ guid, name }, index) => (
                  <option key={index} value={guid}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please select a campus
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='Request'
          className={cn('mb-4 md:col-span-2', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixFormLabelClassName}>
            How can we pray for you?
          </Form.Label>
          <Form.Control asChild>
            <textarea required rows={5} className={radixTextareaClassName} />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter your prayer request
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='FollowUp'
          className={cn('mb-4 md:col-span-2', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixFormLabelClassName}>
            Would you like our team to follow up with you?
          </Form.Label>
          <Form.Control asChild>
            <select className={radixSelectClassName}>
              <option value=''>Select one...</option>
              {followUpOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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

export default PrayerRequestForm;
