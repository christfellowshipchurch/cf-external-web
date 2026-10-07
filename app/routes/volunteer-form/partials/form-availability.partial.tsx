import React, { useState } from 'react';
import { Form, useActionData } from 'react-router';
import type { VolunteerFormAvailability } from '../types';
import {
  DAYS_OF_WEEK,
  HOURS_OPTIONS,
  TIMES_OF_DAY,
  FREQUENCY_OPTIONS,
} from '../types';
import { Button } from '~/primitives/button/button.primitive';
import RadioButtons from '~/primitives/inputs/radio-buttons';
import { Checkbox } from '~/primitives/inputs/checkbox/checkbox.primitive';

interface Props {
  data: VolunteerFormAvailability;
  onBack: () => void;
}

export const VolunteerFormAvailabilityPartial: React.FC<Props> = ({
  data,
  onBack,
}) => {
  const actionData = useActionData<{
    errors?: Partial<Record<keyof VolunteerFormAvailability, string>>;
    defaultValues?: VolunteerFormAvailability;
  }>();

  const [formData, setFormData] = useState<VolunteerFormAvailability>(
    actionData?.defaultValues ?? data,
  );

  const errors = actionData?.errors ?? {};

  const handleToggle = (
    field: keyof VolunteerFormAvailability,
    value: string,
  ) => {
    const arr = (formData[field] as string[]) ?? [];
    let newArr;
    if (arr.includes(value)) {
      newArr = arr.filter((v) => v !== value);
    } else {
      newArr = [...arr, value];
    }
    setFormData((prev) => ({ ...prev, [field]: newArr }));
  };

  return (
    <Form
      method='post'
      className='flex flex-col gap-8 p-12 py-10 w-full max-w-[725px] mx-auto'
    >
      {/* Hidden inputs for form submission */}
      {formData.daysAvailable.map((day) => (
        <input type='hidden' name='daysAvailable' key={day} value={day} />
      ))}
      {formData.timesAvailable.map((time) => (
        <input type='hidden' name='timesAvailable' key={time} value={time} />
      ))}
      <input type='hidden' name='frequency' value={formData.frequency} />
      <input type='hidden' name='hoursPerWeek' value={formData.hoursPerWeek} />

      <h2 className='text-2xl font-bold mb-6'>
        Please tell us when you&apos;re typically available to volunteer
      </h2>
      <div className='flex flex-col gap-8'>
        <div>
          <label className='font-bold mb-2 block'>
            Which days of the week are you available to volunteer?
          </label>
          {errors.daysAvailable && (
            <p className='text-sm text-red-500'>{errors.daysAvailable}</p>
          )}
          <div className='grid grid-cols-7 gap-6 mt-2'>
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className='flex flex-col gap-2'>
                <span className='text-text-primary'>{day}</span>
                <Checkbox
                  key={day}
                  checked={formData.daysAvailable.includes(day)}
                  onChange={() => handleToggle('daysAvailable', day)}
                  label={''}
                  className='ml-[2px]'
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className='font-bold mb-2 block'>
            What times are you typically available?
          </label>
          {errors.timesAvailable && (
            <p className='text-sm text-red-500'>{errors.timesAvailable}</p>
          )}
          <div className='flex flex-row gap-4 mt-2'>
            {TIMES_OF_DAY.map((time) => (
              <Button
                key={time}
                type='button'
                intent={
                  formData.timesAvailable.includes(time) ? 'primary' : 'white'
                }
                size='sm'
                className={`border-1 border-ocean font-normal text-text-primary ${
                  formData.timesAvailable.includes(time)
                    ? 'border-ocean text-white bg-ocean'
                    : 'border-ocean/40 text-text-primary'
                } px-6 py-2 min-w-0`}
                onClick={() => handleToggle('timesAvailable', time)}
              >
                {time}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <label className='font-bold mb-4 block'>
            How frequently would you like to serve?
          </label>
          <RadioButtons
            options={FREQUENCY_OPTIONS}
            selectedOption={formData.frequency ?? 'Weekly'}
            onChange={(val: string) =>
              setFormData((prev) => ({ ...prev, frequency: val }))
            }
            orientation='horizontal'
          />
        </div>
        <div>
          <label className='font-bold mb-4 block'>
            How many hours a week can you volunteer?
          </label>
          <RadioButtons
            options={HOURS_OPTIONS}
            selectedOption={formData.hoursPerWeek ?? '1-2'}
            onChange={(val: string) =>
              setFormData((prev) => ({ ...prev, hoursPerWeek: val }))
            }
            orientation='horizontal'
          />
        </div>
      </div>
      <div className='flex justify-center gap-6 mt-10'>
        <Button
          type='button'
          intent='secondary'
          onClick={onBack}
          size='md'
          className='font-normal'
        >
          Previous: About You
        </Button>
        <Button
          type='submit'
          intent='primary'
          size='md'
          href='/volunteer-form/interests'
          prefetch='viewport'
          className='font-normal'
        >
          Next: Interests
        </Button>
      </div>
    </Form>
  );
};

export default VolunteerFormAvailabilityPartial;
