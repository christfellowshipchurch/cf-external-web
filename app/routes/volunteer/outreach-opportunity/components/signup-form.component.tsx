import * as Form from '@radix-ui/react-form';
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';

import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import {
  radixCheckboxClassName,
  radixFormFieldStackClassName,
  radixFormLabelClassName,
  radixInputClassName,
  radixSelectClassName,
  RadixFormErrorMessage,
} from '~/primitives/inputs/form-radix-field';
import BirthdateInput from '~/primitives/inputs/date-input/birthdate-input.primitive';
import { pushFormEvent } from '~/lib/gtm';
import { RockCampuses } from '~/lib/rock-config';

interface SignupFormProps {
  groupGuid: string;
  waiverPdfUrl: string;
  /** Path to POST to — the outreach-opportunity route's own action. */
  actionPath: string;
  onSuccess: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({
  groupGuid,
  waiverPdfUrl,
  actionPath,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === 'submitting';

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data as { error?: string; success?: boolean };
      if (data.error) {
        setError(data.error);
      } else if (data.success) {
        pushFormEvent(
          'form_complete',
          'community_serving_signup',
          'Community Serving Opportunity Sign Up',
        );
        onSuccess();
      }
    }
  }, [fetcher.state, fetcher.data, onSuccess]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    fetcher.submit(formData, { method: 'post', action: actionPath });
  };

  return (
    <Form.Root
      onSubmit={handleSubmit}
      className='flex flex-col text-left gap-y-4 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-4'
    >
      <input type='hidden' name='groupGuid' value={groupGuid} />

      <Form.Field name='firstName' className={radixFormFieldStackClassName}>
        <Form.Label className={radixFormLabelClassName}>First Name*</Form.Label>
        <Form.Control asChild>
          <input type='text' required className={radixInputClassName} />
        </Form.Control>
        <RadixFormErrorMessage match='valueMissing'>
          Please enter your first name
        </RadixFormErrorMessage>
      </Form.Field>

      <Form.Field name='lastName' className={radixFormFieldStackClassName}>
        <Form.Label className={radixFormLabelClassName}>Last Name*</Form.Label>
        <Form.Control asChild>
          <input type='text' required className={radixInputClassName} />
        </Form.Control>
        <RadixFormErrorMessage match='valueMissing'>
          Please enter your last name
        </RadixFormErrorMessage>
      </Form.Field>

      <Form.Field name='phoneNumber' className={radixFormFieldStackClassName}>
        <Form.Label className={radixFormLabelClassName}>Cell Phone*</Form.Label>
        <Form.Control asChild>
          <input type='tel' required className={radixInputClassName} />
        </Form.Control>
        <RadixFormErrorMessage match='valueMissing'>
          Please enter your phone number
        </RadixFormErrorMessage>
      </Form.Field>

      <Form.Field name='email' className={radixFormFieldStackClassName}>
        <Form.Label className={radixFormLabelClassName}>Email*</Form.Label>
        <Form.Control asChild>
          <input type='email' required className={radixInputClassName} />
        </Form.Control>
        <RadixFormErrorMessage match='valueMissing'>
          Please enter your email
        </RadixFormErrorMessage>
        <RadixFormErrorMessage match='typeMismatch'>
          Please enter a valid email
        </RadixFormErrorMessage>
      </Form.Field>

      <BirthdateInput name='birthdate' label='Birthdate*' isRequired />

      <Form.Field name='campus' className={radixFormFieldStackClassName}>
        <Form.Label className={radixFormLabelClassName}>Campus*</Form.Label>
        <Form.Control asChild>
          <select required className={radixSelectClassName} defaultValue=''>
            <option value='' disabled>
              Select campus
            </option>
            {RockCampuses.filter((c) => c.name !== 'Online').map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </Form.Control>
        <RadixFormErrorMessage match='valueMissing'>
          Please select your home campus
        </RadixFormErrorMessage>
      </Form.Field>

      <Form.Field
        name='waiverAccepted'
        className={cn(
          'my-1 md:col-span-2 md:my-4',
          radixFormFieldStackClassName,
        )}
      >
        <label className='flex items-center gap-3 cursor-pointer select-none'>
          <Form.Control asChild>
            <input
              type='checkbox'
              required
              value='true'
              className={radixCheckboxClassName}
            />
          </Form.Control>
          <span className='text-sm'>
            I accept the terms of the{' '}
            <a
              href={waiverPdfUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='font-semibold text-ocean underline underline-offset-2 decoration-ocean/80 hover:text-ocean/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean'
              onClick={(event) => event.stopPropagation()}
            >
              Christ Fellowship liability waiver
            </a>
            *
          </span>
        </label>
        <RadixFormErrorMessage match='valueMissing'>
          You must accept the waiver to sign up.
        </RadixFormErrorMessage>
      </Form.Field>

      {error ? (
        <p className='text-alert text-sm md:col-span-2 text-center'>{error}</p>
      ) : null}

      <Form.Submit className='mt-2 mx-auto md:col-span-2' asChild>
        <Button
          intent='primary'
          className='w-40 h-12 rounded-full'
          size='md'
          type='submit'
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting…' : 'Submit'}
        </Button>
      </Form.Submit>
    </Form.Root>
  );
};

export default SignupForm;
