import * as Form from '@radix-ui/react-form';
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { pushFormEvent } from '~/lib/gtm';
import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import {
  RadixFormErrorMessage,
  RadixFormSelectShell,
  radixCheckboxClassName,
  radixCheckboxOptionLabelClassName,
  radixCompactFormLabelClassName,
  radixFormFieldStackClassName,
  radixInputClassName,
  radixSelectClassName,
  radixTextareaClassName,
} from '~/primitives/inputs/form-radix-field';
import { ShareMySkillsLoaderReturnType } from '~/routes/share-my-skills/types';

interface ShareMySkillsFormProps {
  onSuccess: () => void;
}

const SKILLS_OPTIONS = [
  { label: 'Hospitality experience', value: '1' },
  { label: 'Culinary experience', value: '2' },
  { label: 'Driving experience', value: '3' },
  { label: 'Construction experience', value: '4' },
  { label: 'Warehouse experience', value: '5' },
];

const ShareMySkillsForm: React.FC<ShareMySkillsFormProps> = ({ onSuccess }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [campuses, setCampuses] = useState<
    ShareMySkillsLoaderReturnType['campuses']
  >([]);
  const [skillsError, setSkillsError] = useState(false);
  const [checkedSkills, setCheckedSkills] = useState<Record<string, boolean>>(
    {},
  );
  const fetcher = useFetcher();

  useEffect(() => {
    fetcher.load('/share-my-skills');
  }, []);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setLoading(false);

      if ('campuses' in fetcher.data) {
        setCampuses((fetcher.data as ShareMySkillsLoaderReturnType).campuses);
      } else if ('error' in fetcher.data) {
        setError(
          (fetcher.data as { error: string }).error ||
            'An unexpected error occurred',
        );
      } else {
        setError(null);
        pushFormEvent('form_complete', 'share_my_skills', 'Share My Skills');
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

    const anyChecked = Object.values(checkedSkills).some(Boolean);
    if (!anyChecked) {
      setSkillsError(true);
      return;
    }
    setSkillsError(false);

    const formData = new FormData(event.currentTarget);

    try {
      fetcher.submit(formData, {
        method: 'post',
        action: '/share-my-skills',
      });
    } catch {
      setError(
        'An error occurred while submitting the form. Please try again.',
      );
      setLoading(false);
    }
  };

  const handleSkillChange = (value: string, checked: boolean) => {
    setCheckedSkills((prev) => ({ ...prev, [value]: checked }));
    if (checked) setSkillsError(false);
  };

  return (
    <>
      <h2 className='mb-2 text-3xl text-navy font-bold'>Share My Skills</h2>
      <h3 className='mb-4 text-lg text-ocean'>
        Do you have a unique skill set or experience?
      </h3>
      <p className='mb-10 text-pretty max-w-lg mx-auto'>
        Unique opportunities arise throughout the year that need specific
        skills. Share yours below and we'll reach out if there's a fit.
      </p>
      <Form.Root
        onSubmit={handleSubmit}
        className='flex flex-col md:grid text-left grid-cols-1 gap-y-3 gap-x-6 md:grid-cols-2'
      >
        <Form.Field
          name='FirstName'
          className={cn('mb-4', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixCompactFormLabelClassName}>
            First Name
          </Form.Label>
          <Form.Control asChild>
            <input type='text' required className={radixInputClassName} />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter your first name
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='LastName'
          className={cn('mb-4', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixCompactFormLabelClassName}>
            Last Name
          </Form.Label>
          <Form.Control asChild>
            <input type='text' required className={radixInputClassName} />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter your last name
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='PhoneNumber'
          className={cn('mb-4', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixCompactFormLabelClassName}>
            Phone
          </Form.Label>
          <Form.Control asChild>
            <input type='tel' required className={radixInputClassName} />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter your phone number
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='EmailAddress'
          className={cn('mb-4', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixCompactFormLabelClassName}>
            Email
          </Form.Label>
          <Form.Control asChild>
            <input type='email' required className={radixInputClassName} />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            Please enter your email address
          </RadixFormErrorMessage>
          <RadixFormErrorMessage match='typeMismatch'>
            Please enter a valid email address
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='Campus1'
          className={cn('mb-4', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixCompactFormLabelClassName}>
            Campus Location
          </Form.Label>
          {campuses && (
            <RadixFormSelectShell>
              <Form.Control asChild>
                <select
                  className={radixSelectClassName}
                  required
                  defaultValue=''
                >
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

        <div>
          <p className={cn('mb-2', radixCompactFormLabelClassName)}>
            Skills and Interests
          </p>
          <div className='flex flex-col gap-2 pl-1'>
            {SKILLS_OPTIONS.map(({ label, value }) => (
              <label
                key={value}
                className={cn(
                  'flex items-center gap-2 cursor-pointer',
                  radixCheckboxOptionLabelClassName,
                )}
              >
                <input
                  type='checkbox'
                  name={`skillsInterests_${value}`}
                  value={value}
                  className={radixCheckboxClassName}
                  onChange={(e) => handleSkillChange(value, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
          {skillsError && (
            <p className='mt-1 text-sm text-alert'>
              Please select at least one skill or interest
            </p>
          )}
        </div>

        <Form.Field
          name='Skills'
          className={cn('mb-4 md:col-span-2', radixFormFieldStackClassName)}
        >
          <Form.Label className={radixCompactFormLabelClassName}>
            Share more about your skills and interests
          </Form.Label>
          <Form.Control asChild>
            <textarea rows={4} className={radixTextareaClassName} />
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

export default ShareMySkillsForm;
