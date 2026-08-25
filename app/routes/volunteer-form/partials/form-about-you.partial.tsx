import React, { useState } from 'react';
import { Form, useActionData } from 'react-router-dom';
import { CAMPUS, type VolunteerFormPersonalInfo } from '../types';
import { Button } from '~/primitives/button/button.primitive';
import TextFieldInput from '~/primitives/inputs/text-field';
import SelectInput from '~/primitives/inputs/select-input/select-input.primitive';
import BirthdateInput from '~/primitives/inputs/date-input/birthdate-input.primitive';

const campusOptions = CAMPUS.map((campus) => ({
  value: campus,
  label: campus,
}));

interface Props {
  data: VolunteerFormPersonalInfo;
  onBack: () => void;
}

export const VolunteerFormPersonalInfoPartial: React.FC<Props> = ({
  data,
  onBack,
}) => {
  const actionData = useActionData<{
    errors?: Partial<Record<keyof VolunteerFormPersonalInfo, string>>;
    defaultValues?: VolunteerFormPersonalInfo;
  }>();

  const [formData, setFormData] = useState<VolunteerFormPersonalInfo>(
    actionData?.defaultValues ?? data,
  );

  const errors = actionData?.errors ?? {};

  const handleChange = (
    field: keyof VolunteerFormPersonalInfo,
    value: string,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Form
      method='post'
      className='flex flex-col gap-4 p-8 w-full max-w-lg mt-12'
      action='/volunteer-form/about-you'
    >
      <h2 className='heading-h4 mb-8 text-center text-pretty'>
        First things first, tell us about yourself
      </h2>
      <div className='flex flex-col gap-4'>
        {/* Campus Select */}
        <SelectInput
          name='campus'
          value={formData.campus ?? ''}
          error={errors.campus ?? null}
          setValue={(val) => handleChange('campus', val)}
          setError={() => {}}
          options={campusOptions}
          isRequired
          label='Where do you attend Christ Fellowship?'
        />
        <label className='font-bold text-text-primary text-sm -mb-2'>
          <span className='text-ocean mr-1'>{'*'}</span>
          Name{' '}
          <span className='font-normal italic text-text-secondary'>
            (required)
          </span>
        </label>
        <div className='flex gap-4'>
          <TextFieldInput
            name='firstName'
            className=''
            value={formData.firstName}
            error={errors.firstName ?? null}
            setValue={(val) => handleChange('firstName', val)}
            setError={() => {}}
            placeholder='First Name'
            isRequired
          />
          <TextFieldInput
            name='lastName'
            className=''
            value={formData.lastName}
            error={errors.lastName ?? null}
            setValue={(val) => handleChange('lastName', val)}
            setError={() => {}}
            placeholder='Last Name'
            isRequired
          />
        </div>
      </div>
      <TextFieldInput
        name='email'
        className=''
        value={formData.email}
        error={errors.email ?? null}
        setValue={(val) => handleChange('email', val)}
        setError={() => {}}
        type='email'
        label='Email'
        placeholder='Example@gmail.com'
        isRequired
      />
      <TextFieldInput
        name='phone'
        className=''
        value={formData.phone ?? ''}
        error={errors.phone ?? null}
        setValue={(val) => handleChange('phone', val)}
        setError={() => {}}
        type='tel'
        label='Phone Number'
        placeholder='xxx-xxx-xxxx'
        isRequired
      />
      <BirthdateInput
        name='dateOfBirth'
        value={formData.dateOfBirth ?? ''}
        error={errors.dateOfBirth ?? null}
        setValue={(val) => handleChange('dateOfBirth', val)}
        label='Date of Birth'
        isRequired
        showRequiredHint
      />
      <div className='flex justify-between mt-4'>
        <Button type='button' intent='secondary' onClick={onBack}>
          Back
        </Button>
        <Button
          type='submit'
          intent='primary'
          href='/volunteer-form/availability'
          prefetch='viewport'
        >
          Next
        </Button>
      </div>
    </Form>
  );
};

export default VolunteerFormPersonalInfoPartial;
