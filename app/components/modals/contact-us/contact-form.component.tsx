import * as Form from '@radix-ui/react-form';
import { useEffect, useState } from 'react';
import { Button } from '~/primitives/button/button.primitive';
import { cn } from '~/lib/utils';
import {
  radixCheckboxClassName,
  radixFormFieldStackClassName,
  radixFormLabelClassName,
  radixInputClassName,
  radixSelectClassName,
  radixTextareaClassName,
  RadixFormErrorMessage,
  RadixFormSelectShell,
} from '~/primitives/inputs/form-radix-field';
import { useFetcher } from 'react-router';
import { ContactUsLoaderReturnType } from '~/routes/contact-us/types';
import { pushFormEvent } from '~/lib/gtm';

interface ContactUsFormProps {
  onSuccess: () => void;
}

const ContactUsForm: React.FC<ContactUsFormProps> = ({ onSuccess }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fetcher = useFetcher();

  const [campuses, setCampuses] = useState<
    ContactUsLoaderReturnType['campuses']
  >([]);

  useEffect(() => {
    fetcher.load('/contact-us');
  }, []);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setLoading(false);

      if ('campuses' in fetcher.data) {
        setCampuses((fetcher.data as ContactUsLoaderReturnType).campuses);
      } else if ('error' in fetcher.data) {
        setError(fetcher.data.error || 'An unexpected error occurred');
      } else {
        setError(null);
        pushFormEvent('form_complete', 'contact_us', 'Contact Us');
        onSuccess();
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

    try {
      fetcher.submit(formData, {
        method: 'post',
        action: '/contact-us',
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
      <h2 className='mb-4 text-3xl text-center text-navy font-bold'>
        Contact Us
      </h2>
      <p className='mb-8 text-pretty text-center'>
        We believe every person matters, so we personally respond to every
        question, comment, and prayer request you send us. <br /> <br /> We look
        forward to hearing from you!
      </p>
      <Form.Root
        onSubmit={handleSubmit}
        className='flex flex-col md:grid text-left grid-cols-1 gap-y-3 gap-x-6 md:grid-cols-2 px-0 md:px-6'
      >
        <Form.Field
          name='firstName'
          className={cn('mb-4', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixFormLabelClassName}>
            First Name
          </Form.Label>
          <Form.Control asChild>
            <input
              type='text'
              required
              placeholder='First Name'
              className={radixInputClassName}
            />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter your first name
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='lastName'
          className={cn('mb-4', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixFormLabelClassName}>Last Name</Form.Label>
          <Form.Control asChild>
            <input
              type='text'
              required
              placeholder='Last Name'
              className={radixInputClassName}
            />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter your last name
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='phone'
          className={cn('mb-4', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixFormLabelClassName}>
            Cell Phone
          </Form.Label>
          <Form.Control asChild>
            <input
              type='tel'
              required
              placeholder='xxx-xxx-xxxx'
              className={radixInputClassName}
            />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter your phone number
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='email'
          className={cn('mb-4', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixFormLabelClassName}>
            Email Address
          </Form.Label>
          <Form.Control asChild>
            <input
              type='email'
              required
              placeholder='Example@gmail.com'
              className={radixInputClassName}
            />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter your email address
          </RadixFormErrorMessage>
          <RadixFormErrorMessage match='typeMismatch'>
            Please enter a valid email address
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='campus'
          className={cn('mb-4 md:col-span-2', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixFormLabelClassName}>Location</Form.Label>
          {campuses && (
            <RadixFormSelectShell>
              <Form.Control asChild>
                <select className={radixSelectClassName} required>
                  <option value=''>Select a Campus</option>
                  {campuses.map(({ guid, name }, index) => (
                    <option key={index} value={guid}>
                      {name}
                    </option>
                  ))}
                </select>
              </Form.Control>
            </RadixFormSelectShell>
          )}
          <RadixFormErrorMessage match='valueMissing'>
            Please select a campus
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='message'
          className={cn('mb-4 md:col-span-2', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixFormLabelClassName}>Message</Form.Label>
          <Form.Control asChild>
            <textarea
              required
              rows={5}
              placeholder='Enter your message'
              className={radixTextareaClassName}
            />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter a message
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='smsConsent'
          className={cn('mt-2 md:col-span-2', radixFormFieldStackClassName)}
        >
          <div className='flex gap-2 items-start'>
            <Form.Control asChild>
              <input
                type='checkbox'
                required
                className={radixCheckboxClassName}
              />
            </Form.Control>
            <Form.Label className='text-sm text-text-secondary leading-5'>
              By submitting, you agree to our{' '}
              <a
                href='https://www.christfellowship.church/terms-of-use'
                target='_blank'
                rel='noopener noreferrer'
                className='underline'
              >
                Terms of Use
              </a>{' '}
              and{' '}
              <a
                href='https://www.christfellowship.church/privacy-policy'
                target='_blank'
                rel='noopener noreferrer'
                className='underline'
              >
                Privacy Policy
              </a>
              . I agree to receive communications by text message about my
              inquiry. You may opt-out by replying STOP or REMOVE or ask for
              more information by replying HELP. Message frequency varies
              depending on your activities. Message and data rates may apply.
              You may review our{' '}
              <a
                href='https://www.christfellowship.church/privacy-policy'
                target='_blank'
                rel='noopener noreferrer'
                className='underline'
              >
                Privacy Policy
              </a>{' '}
              to learn how your data is used.
            </Form.Label>
          </div>
          <RadixFormErrorMessage match='valueMissing'>
            You must agree to continue
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

export default ContactUsForm;
