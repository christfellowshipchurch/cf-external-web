import * as Form from '@radix-ui/react-form';
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { pushFormEvent } from '~/lib/gtm';
import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import {
  radixFormFieldStackClassName,
  radixFormLabelClassName,
  radixSelectClassName,
  RadixFormErrorMessage,
  renderRadixInputField,
} from '~/primitives/inputs/form-radix-field';

const RESOURCE_ROUTE = '/class-interest';

type CampusOption = {
  id: number;
  guid: string;
  name: string;
};

interface ClassInterestFormProps {
  onSuccess: () => void;
  classValueGuid?: string;
}

const ClassInterestForm: React.FC<ClassInterestFormProps> = ({
  onSuccess,
  classValueGuid,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const fetcher = useFetcher();

  useEffect(() => {
    fetcher.load(RESOURCE_ROUTE);
  }, []);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setLoading(false);

      if (
        typeof fetcher.data === 'object' &&
        fetcher.data !== null &&
        'campuses' in fetcher.data
      ) {
        setCampuses(fetcher.data.campuses as CampusOption[]);
      } else if (
        typeof fetcher.data === 'object' &&
        fetcher.data !== null &&
        'error' in fetcher.data
      ) {
        setError(String(fetcher.data.error) || 'An unexpected error occurred');
      } else {
        setError(null);
        pushFormEvent('form_complete', 'class_interest', 'Class Interest');
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

    try {
      fetcher.submit(formData, {
        method: 'post',
        action: RESOURCE_ROUTE,
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
        Tell Us What You&apos;re Looking For
      </h2>
      <p className='mb-6 text-base leading-6 text-text_primary'>
        Share your details and campus. If enough people are interested, we may
        offer this class in a future season and let you know.
      </p>
      <Form.Root
        onSubmit={handleSubmit}
        className='flex flex-col md:grid text-left grid-cols-1 gap-y-3 gap-x-6 md:grid-cols-2'
      >
        {classValueGuid && (
          <input type='hidden' name='ClassValueGuid' value={classValueGuid} />
        )}
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
          'EmailAddress',
          'Email Address',
          'email',
          'Please enter your email address',
        )}
        {renderRadixInputField(
          'PhoneNumber',
          'Phone',
          'tel',
          'Please enter your phone number',
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

export default ClassInterestForm;
