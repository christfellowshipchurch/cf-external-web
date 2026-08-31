import * as Form from '@radix-ui/react-form';
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import {
  radixFormFieldStackClassName,
  radixFormLabelClassName,
  radixInputClassName,
  radixSelectClassName,
  RadixFormErrorMessage,
} from '~/primitives/inputs/form-radix-field';
import { pushFormEvent } from '~/lib/gtm';

interface GroupConnectFormProps {
  groupId: string;
  campus?: string;
  onSuccess: () => void;
}

type CampusOption = {
  guid: string;
  name: string;
};

const GroupConnectForm: React.FC<GroupConnectFormProps> = ({
  groupId,
  campus,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);

  const fetcher = useFetcher();
  const campusesFetcher = useFetcher<{ campuses: CampusOption[] }>();
  const isSubmitting = fetcher.state === 'submitting';
  const campuses = campusesFetcher.data?.campuses ?? [];

  useEffect(() => {
    if (campus === undefined) {
      campusesFetcher.load('/group-finder-notify');
    }
  }, [campus]);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data as { error?: string };
      if (data.error) {
        setError(data.error);
      } else {
        pushFormEvent('form_complete', 'group_signup', 'Group/Class Signup');
        onSuccess();
      }
    }
  }, [fetcher.state, fetcher.data, onSuccess]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      fetcher.submit(formData, {
        method: 'post',
        action: '/group-finder',
      });
    } catch {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <>
      <h2 className='mb-6 text-3xl text-navy font-bold'>
        Connect with a Leader
      </h2>
      <p className='mb-10 max-w-xs text-pretty mx-auto'>
        Please fill out the form below to let a group leader know you are
        interested.
      </p>
      <Form.Root
        onSubmit={handleSubmit}
        className='flex flex-col md:grid text-left grid-cols-1 gap-y-3 gap-x-6 md:grid-cols-2'
      >
        <input type='hidden' name='groupId' value={groupId} />

        {/* First Name */}
        <Form.Field name='firstName' className={radixFormFieldStackClassName}>
          <Form.Label className={radixFormLabelClassName}>
            First Name*
          </Form.Label>
          <Form.Control asChild>
            <input type='text' required className={radixInputClassName} />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter your first name
          </RadixFormErrorMessage>
        </Form.Field>
        {/* Last Name */}
        <Form.Field name='lastName' className={radixFormFieldStackClassName}>
          <Form.Label className={radixFormLabelClassName}>
            Last Name*
          </Form.Label>
          <Form.Control asChild>
            <input type='text' required className={radixInputClassName} />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter your last name
          </RadixFormErrorMessage>
        </Form.Field>
        {/* Phone */}
        <Form.Field name='phoneNumber' className={radixFormFieldStackClassName}>
          <Form.Label className={radixFormLabelClassName}>Phone*</Form.Label>
          <Form.Control asChild>
            <input type='text' required className={radixInputClassName} />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter your phone number
          </RadixFormErrorMessage>
        </Form.Field>
        {/* Email */}
        <Form.Field name='email' className={radixFormFieldStackClassName}>
          <Form.Label className={radixFormLabelClassName}>Email*</Form.Label>
          <Form.Control asChild>
            <input type='text' required className={radixInputClassName} />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter your email
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='campus'
          className={cn('md:col-span-2', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixFormLabelClassName}>Campus*</Form.Label>
          {campus !== undefined ? (
            <>
              <input type='hidden' name='campus' value={campus} />
              <Form.Control asChild>
                <select className={radixSelectClassName} required disabled>
                  <option>{campus}</option>
                </select>
              </Form.Control>
            </>
          ) : (
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
          )}
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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Loading...' : 'Submit'}
          </Button>
        </Form.Submit>
      </Form.Root>
    </>
  );
};

export default GroupConnectForm;
