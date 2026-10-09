import React, { useState } from 'react';
import { INTERESTS, STRENGTHS, VolunteerFormInterests } from '../types';
import { Button } from '~/primitives/button/button.primitive';
import Slider from '~/primitives/inputs/slider/slider.primitive';
import { Checkbox } from '~/primitives/inputs/checkbox/checkbox.primitive';
import { formTextareaBaseStyles } from '~/primitives/inputs/form-control.styles';
import SecureTextField from '~/primitives/inputs/text-field/secure-text-field.primitive';
import { Form, useActionData } from 'react-router';

interface Props {
  data: VolunteerFormInterests;
  onBack: () => void;
}

export const VolunteerFormInterestsPartial: React.FC<Props> = ({
  data,
  onBack,
}) => {
  const actionData = useActionData<{
    errors?: Partial<Record<keyof VolunteerFormInterests, string>>;
    defaultValues?: VolunteerFormInterests;
  }>();

  const [formData, setFormData] = useState<VolunteerFormInterests>(() => {
    const d = actionData?.defaultValues ?? data;
    // form data from server comes in as strings, so we need to parse them
    return {
      ...d,
      personality: Number(d.personality),
      taskOriented: Number(d.taskOriented),
      backgroundCheck: String(d.backgroundCheck) === 'true',
    };
  });

  const errors = actionData?.errors ?? {};

  const handleChange = (
    field: keyof VolunteerFormInterests,
    value: string | boolean | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggle = <K extends 'strengths' | 'interests'>(
    field: K,
    value: VolunteerFormInterests[K][number],
  ) => {
    const arr = (formData[field] ?? []) as VolunteerFormInterests[K];
    let newArr;
    if (arr.includes(value as never)) {
      newArr = arr.filter((v) => v !== value);
    } else {
      newArr = [...arr, value];
    }
    setFormData((prev) => ({ ...prev, [field]: newArr }));
  };

  return (
    <Form
      method='post'
      className='flex flex-col gap-10 p-12 pt-10 mb-20 w-full max-w-[750px] mx-auto'
    >
      {/* Hidden Fields */}
      <input type='hidden' name='personality' value={formData.personality} />
      <input type='hidden' name='taskOriented' value={formData.taskOriented} />
      {formData.strengths.map((s) => (
        <input type='hidden' name='strengths' value={s} key={s} />
      ))}
      {formData.interests.map((i) => (
        <input type='hidden' name='interests' value={i} key={i} />
      ))}
      <input
        type='hidden'
        name='backgroundCheck'
        value={String(formData.backgroundCheck)}
      />

      <h2 className='heading-h4 mb-6'>
        Let&apos;s explore your talents and passions to find the right fit.
      </h2>
      <div className='flex flex-col gap-8'>
        <span className='text-text-primary font-bold'>
          How would you describe your personality?{' '}
        </span>
        <Slider
          leftLabel='Outgoing'
          rightLabel='Reserved'
          value={formData.personality ?? 50}
          min={0}
          max={100}
          onValueChange={(value: number) => handleChange('personality', value)}
        />
      </div>
      <div className='flex flex-col gap-8'>
        <span className='text-text-primary font-bold'>
          How would you describe your personality?{' '}
        </span>
        <Slider
          leftLabel='People-Oriented'
          rightLabel='Task-Oriented'
          value={formData.taskOriented ?? 50}
          min={0}
          max={100}
          onValueChange={(value: number) => handleChange('taskOriented', value)}
        />
      </div>
      <div className='flex flex-col gap-3'>
        <span className='text-text-primary font-bold'>
          Are you comfortable:{' '}
        </span>
        {STRENGTHS.map((strength) => (
          <Checkbox
            key={strength}
            label={strength}
            checked={formData.strengths?.includes(strength) ?? false}
            onChange={() => handleToggle('strengths', strength)}
          />
        ))}
      </div>
      <div className='flex flex-col gap-3'>
        <label className='font-bold'>What are you passionate about?</label>
        <textarea
          name='comments'
          className={formTextareaBaseStyles}
          value={formData.comments}
          rows={5}
          onChange={(e) => handleChange('comments', e.target.value)}
        />
      </div>
      <div className='flex flex-col gap-3'>
        <label className='font-bold'>
          <span className='text-ocean'>*</span> Which areas are you most
          interested in?{' '}
          <span className='text-text-secondary font-normal italic'>
            (required)
          </span>{' '}
        </label>
        {errors.interests && (
          <p className='text-sm text-red-500'>{errors.interests}</p>
        )}
        <div className='grid grid-cols-2 gap-3'>
          {INTERESTS.map((interest) => (
            <Checkbox
              key={interest}
              label={interest}
              checked={formData.interests?.includes(interest) ?? false}
              onChange={() => handleToggle('interests', interest)}
            />
          ))}
        </div>
      </div>
      <div className='flex flex-col gap-3'>
        <label className='font-bold'>
          <span className='text-ocean'>*</span> Background Check{' '}
          <span className='text-text-secondary font-normal italic'>
            (required)
          </span>{' '}
        </label>
        <div className='flex flex-col gap-3 text-text-secondary'>
          <p>
            To ensure the safety of children and vulnerable individuals in our
            care, we are required to conduct a background check. This process
            requires your Social Security Number. Your information will be
            encrypted and securely transmitted to our background check partner.
            We take your privacy seriously.
          </p>
          <Checkbox
            label={
              'I consent to a confidential background check, and I understand that the results will be used solely for volunteer screening purposes.'
            }
            checked={formData.backgroundCheck ?? false}
            onChange={(checked) => handleChange('backgroundCheck', !!checked)}
            required
          />
        </div>
      </div>
      <div className='flex flex-col gap-3 text-text-secondary w-64'>
        <SecureTextField
          name='ssn'
          value={formData.ssn ?? ''}
          error={errors.ssn ?? null}
          setValue={(val: string) => handleChange('ssn', val)}
          setError={() => {}}
          label='Social Security Number'
          isRequired={formData.backgroundCheck}
          placeholder='###-##-0000'
        />
      </div>
      <div className='flex justify-center gap-4 py-18'>
        <Button
          type='button'
          intent='secondary'
          className='font-normal'
          onClick={onBack}
        >
          Previous: Availability
        </Button>
        <Button
          type='submit'
          intent='primary'
          href='/volunteer-form/confirmation'
          prefetch='viewport'
          className='font-normal'
        >
          Submit
        </Button>
      </div>
    </Form>
  );
};

export default VolunteerFormInterestsPartial;
