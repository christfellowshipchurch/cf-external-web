import React, { useEffect, useState } from 'react';
import { useFetcher, useNavigate } from 'react-router-dom';

import { Button } from '~/primitives/button/button.primitive';
import TextFieldInput from '~/primitives/inputs/text-field';
import BirthdateInput from '~/primitives/inputs/date-input/birthdate-input.primitive';
import { radixSelectClassName } from '~/primitives/inputs/form-radix-field';
import {
  formFieldStackStyles,
  formLabelStyles,
  formRequiredHintStyles,
  formRequiredMarkerStyles,
} from '~/primitives/inputs/form-control.styles';
import { cn } from '~/lib/utils';
import { YesFormPersonalInfo } from '../types';
import { ConnectCardLoaderReturnType } from '~/routes/connect-card/types';

interface Props {
  data: YesFormPersonalInfo;
  isSpanish?: boolean;
}

const YesFormPersonalInfoPartial: React.FC<Props> = ({ data, isSpanish }) => {
  const [formData, setFormData] = useState<YesFormPersonalInfo>(data);
  const [error, setError] = useState<string | null>(null);
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const [formFieldData, setFormFieldData] =
    useState<ConnectCardLoaderReturnType>({
      campuses: [],
      allThatApplies: [],
    });

  // Effect for initial data loading
  useEffect(() => {
    fetcher.load('/connect-card');
  }, []);

  // Effect for handling form data and submissions
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if ('campuses' in fetcher.data && 'allThatApplies' in fetcher.data) {
        // This was the initial data load
        setFormFieldData(fetcher.data as ConnectCardLoaderReturnType);
      } else if ('error' in fetcher.data) {
        // This was a failed form submission
        setError(
          fetcher.data.error ||
            (isSpanish
              ? 'Ocurrió un error inesperado'
              : 'An unexpected error occurred'),
        );
      } else {
        // This was a successful form submission (not initial load, not error)
        setError(null);
        navigate(isSpanish ? '/dijiste-si/devocional' : '/yes/devotional');
      }
    }

    if (fetcher.state === 'submitting') {
      setError(null);
    }
  }, [fetcher.state, fetcher.data, navigate]);

  const loading = fetcher.state === 'submitting' || fetcher.state === 'loading';

  const handleChange = (field: keyof YesFormPersonalInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formDataObj = new FormData(event.currentTarget);

    try {
      fetcher.submit(formDataObj, {
        method: 'post',
        action: '/connect-card',
      });
    } catch {
      setError(
        isSpanish
          ? 'Ocurrió un error al enviar el formulario. Por favor, inténtalo de nuevo.'
          : 'An error occurred while submitting the form. Please try again.',
      );
    }
  };

  const { campuses } = formFieldData;

  const copy = {
    heading: isSpanish ? '¡Cuéntanos sobre ti!' : 'Tell us about yourself!',
    nameLabel: isSpanish ? 'Nombre' : 'Name',
    firstNamePlaceholder: isSpanish ? 'Nombre' : 'First Name',
    lastNamePlaceholder: isSpanish ? 'Apellido' : 'Last Name',
    emailLabel: isSpanish ? 'Correo electrónico' : 'Email',
    emailPlaceholder: isSpanish ? 'ejemplo@gmail.com' : 'Example@gmail.com',
    phoneLabel: isSpanish ? 'Número de teléfono' : 'Phone Number',
    phonePlaceholder: 'xxx-xxx-xxxx',
    dateOfBirthLabel: isSpanish ? 'Fecha de nacimiento' : 'Date of Birth',
    campusLabel: 'Campus',
    required: isSpanish ? '(requerido)' : '(required)',
    selectCampus: isSpanish ? 'Selecciona un campus' : 'Select a Campus',
    loading: isSpanish ? 'Cargando...' : 'Loading...',
    submit: isSpanish ? 'Enviar' : 'Submit',
  };

  return (
    <form onSubmit={handleSubmit} className='w-full content-padding'>
      <div className='mx-auto flex flex-col gap-4 p-8 w-full max-w-lg bg-white rounded-2xl shadow-md mt-16 mb-28 lg:mt-32 lg:mb-50 xl:mt-48 xl:mb-82'>
        <h2 className='heading-h4 mb-2 text-pretty'>{copy.heading}</h2>
        <div className='flex flex-col gap-4'>
          <div className='flex items-end gap-4 w-full'>
            <div className='flex-1'>
              <TextFieldInput
                name='firstName'
                className=''
                value={formData.firstName}
                error={null}
                setValue={(val) => handleChange('firstName', val)}
                setError={() => {}}
                label={copy.nameLabel}
                placeholder={copy.firstNamePlaceholder}
                isRequired
              />
            </div>
            <div className='flex-1'>
              <TextFieldInput
                name='lastName'
                className=''
                value={formData.lastName}
                error={null}
                setValue={(val) => handleChange('lastName', val)}
                setError={() => {}}
                placeholder={copy.lastNamePlaceholder}
                isRequired
              />
            </div>
          </div>
        </div>
        <TextFieldInput
          name='email'
          className=''
          value={formData.email}
          error={null}
          setValue={(val) => handleChange('email', val)}
          setError={() => {}}
          type='email'
          label={copy.emailLabel}
          placeholder={copy.emailPlaceholder}
          isRequired
        />
        <TextFieldInput
          name='phone'
          className=''
          value={formData.phone ?? ''}
          error={null}
          setValue={(val) => handleChange('phone', val)}
          setError={() => {}}
          type='tel'
          label={copy.phoneLabel}
          placeholder={copy.phonePlaceholder}
          isRequired
        />
        <BirthdateInput
          name='dateOfBirth'
          value={formData.dateOfBirth ?? ''}
          setValue={(val) => handleChange('dateOfBirth', val)}
          label={copy.dateOfBirthLabel}
          isRequired
          showRequiredHint
        />
        <div className={cn('w-full', formFieldStackStyles)}>
          <label className={formLabelStyles}>
            <span className={formRequiredMarkerStyles}>{'*'}</span>
            {copy.campusLabel}
            <span className={formRequiredHintStyles}>{copy.required}</span>
          </label>
          {campuses && campuses.length > 0 && (
            <select name='campus' className={radixSelectClassName} required>
              <option value={''}>{copy.selectCampus}</option>
              {campuses.map(({ guid, name }, index) => (
                <option key={index} value={guid}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Hidden decision checkbox - marked as checked (same value for backend) */}
        <input
          type='checkbox'
          name='decision'
          value='I made a decision to follow Christ today.'
          defaultChecked
          style={{ display: 'none' }}
        />
        {error && <p className='text-alert text-center'>{error}</p>}
        <div className='flex justify-between mt-4 w-full'>
          <Button
            type='submit'
            size='md'
            intent='primary'
            className='w-full font-normal'
            disabled={loading}
          >
            {loading ? copy.loading : copy.submit}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default YesFormPersonalInfoPartial;
