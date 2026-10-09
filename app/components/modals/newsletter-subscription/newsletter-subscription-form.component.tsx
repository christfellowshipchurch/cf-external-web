import * as Form from '@radix-ui/react-form';
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { pushFormEvent } from '~/lib/gtm';
import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import {
  radixCheckboxClassName,
  radixFormFieldStackClassName,
  radixFormLabelClassName,
  radixSelectClassName,
  renderRadixInputField,
  RadixFormErrorMessage,
} from '~/primitives/inputs/form-radix-field';
import { NewsletterSubscriptionLoaderReturnType } from '~/routes/newsletter-subscription/types';

interface NewsletterSubscriptionFormProps {
  onSuccess: () => void;
  initialEmail?: string;
}

export const renderInputField = renderRadixInputField;

const NewsletterSubscriptionForm: React.FC<NewsletterSubscriptionFormProps> = ({
  onSuccess,
  initialEmail,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [campuses, setCampuses] = useState<
    NewsletterSubscriptionLoaderReturnType['campuses']
  >([]);
  const fetcher = useFetcher();

  useEffect(() => {
    fetcher.load('/newsletter-subscription');
  }, []);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setLoading(false);

      if ('campuses' in fetcher.data) {
        setCampuses(
          (fetcher.data as NewsletterSubscriptionLoaderReturnType).campuses,
        );
      } else if ('error' in fetcher.data) {
        setError(fetcher.data.error || 'An unexpected error occurred');
      } else {
        setError(null);
        pushFormEvent(
          'form_complete',
          'newsletter_subscription',
          'Newsletter Subscription',
        );
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
        action: '/newsletter-subscription',
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
        Subscribe to Updates
      </h2>
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
          'Phone',
          'tel',
          'Please enter your phone number',
        )}
        {renderInputField(
          'EmailAddress',
          'Email Address',
          'email',
          'Please enter your email address',
          initialEmail,
        )}

        <Form.Field
          name='Campus'
          className={cn('mb-4 md:col-span-2', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixFormLabelClassName}>
            Campus Location
          </Form.Label>
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
              , and consent to receive email communications from Christ
              Fellowship Church.
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

export default NewsletterSubscriptionForm;
