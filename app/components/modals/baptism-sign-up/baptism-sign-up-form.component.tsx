import { useEffect, useRef, useState } from 'react';
import * as Form from '@radix-ui/react-form';
import { useFetcher, useSearchParams } from 'react-router-dom';
import { Button } from '~/primitives/button/button.primitive';
import { cn } from '~/lib/utils';
import { pushFormEvent } from '~/lib/gtm';
import { scrollToAnchor } from '~/lib/scroll-to-anchor';
import { formRadioGroupVerticalStyles } from '~/primitives/inputs/form-control.styles';
import {
  RadixFormErrorMessage,
  RadixFormSelectShell,
  radixCompactFormLabelClassName,
  radixFormFieldStackClassName,
  radixFormLabelClassName,
  radixInputClassName,
  radixRadioClassName,
  radixSelectClassName,
  radixTextareaClassName,
} from '~/primitives/inputs/form-radix-field';
import type { BaptismSignUpLoaderReturnType } from '~/routes/baptism-sign-up/types';

export type BaptismSignUpSuccessDetails = {
  firstName: string;
  lastName: string;
};

interface BaptismSignUpFormProps {
  onSuccess: (details?: BaptismSignUpSuccessDetails) => void;
  groupGuid?: string;
  isSpanish?: boolean;
  showHeader?: boolean;
}

const MAX_STORY_LENGTH = 200;

// Permissive US phone format (e.g. 561-123-4567, (561) 123-4567, 5611234567).
const US_PHONE_PATTERN = '\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}';

const T_SHIRT_SIZES = [
  'Youth Small',
  'Youth Medium',
  'Youth Large',
  'Adult Small',
  'Adult Medium',
  'Adult Large',
  'Adult XL',
  'Adult XXL',
];
const GRADE_OPTIONS = ['6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const SHARE_STORY_OPTIONS = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
  { value: 'No Preference', label: 'No Preference' },
];

const SPANISH_SHARE_STORY_OPTIONS = [
  { value: 'Yes', label: 'Si' },
  { value: 'No', label: 'No' },
  { value: 'No Preference', label: 'Sin preferencia' },
];

const US_STATES: { abbr: string; name: string }[] = [
  { abbr: 'AL', name: 'Alabama' },
  { abbr: 'AK', name: 'Alaska' },
  { abbr: 'AZ', name: 'Arizona' },
  { abbr: 'AR', name: 'Arkansas' },
  { abbr: 'CA', name: 'California' },
  { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' },
  { abbr: 'DE', name: 'Delaware' },
  { abbr: 'DC', name: 'District of Columbia' },
  { abbr: 'FL', name: 'Florida' },
  { abbr: 'GA', name: 'Georgia' },
  { abbr: 'HI', name: 'Hawaii' },
  { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' },
  { abbr: 'IN', name: 'Indiana' },
  { abbr: 'IA', name: 'Iowa' },
  { abbr: 'KS', name: 'Kansas' },
  { abbr: 'KY', name: 'Kentucky' },
  { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' },
  { abbr: 'MD', name: 'Maryland' },
  { abbr: 'MA', name: 'Massachusetts' },
  { abbr: 'MI', name: 'Michigan' },
  { abbr: 'MN', name: 'Minnesota' },
  { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' },
  { abbr: 'MT', name: 'Montana' },
  { abbr: 'NE', name: 'Nebraska' },
  { abbr: 'NV', name: 'Nevada' },
  { abbr: 'NH', name: 'New Hampshire' },
  { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' },
  { abbr: 'NY', name: 'New York' },
  { abbr: 'NC', name: 'North Carolina' },
  { abbr: 'ND', name: 'North Dakota' },
  { abbr: 'OH', name: 'Ohio' },
  { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' },
  { abbr: 'PA', name: 'Pennsylvania' },
  { abbr: 'RI', name: 'Rhode Island' },
  { abbr: 'SC', name: 'South Carolina' },
  { abbr: 'SD', name: 'South Dakota' },
  { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' },
  { abbr: 'UT', name: 'Utah' },
  { abbr: 'VT', name: 'Vermont' },
  { abbr: 'VA', name: 'Virginia' },
  { abbr: 'WA', name: 'Washington' },
  { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' },
  { abbr: 'WY', name: 'Wyoming' },
];

// Full years between the entered birthdate and today. Returns null for empty,
// invalid, or future dates so callers can withhold the age-based fields.
const computeAge = (birthdate: string): number | null => {
  if (!birthdate) return null;
  const [year, month, day] = birthdate.split('-').map(Number);
  if (!year || !month || !day) return null;

  const dob = new Date(year, month - 1, day);
  if (
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  if (dob > today) return null;

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
};

const renderTextField = (
  name: string,
  label: string,
  requiredMessage: string,
  options: {
    type?: string;
    required?: boolean;
    placeholder?: string;
    pattern?: string;
    patternMessage?: string;
    typeMismatchMessage?: string;
    defaultValue?: string;
  } = {},
) => {
  const {
    type = 'text',
    required = true,
    placeholder,
    pattern,
    patternMessage,
    typeMismatchMessage = 'Please enter a valid email address',
    defaultValue,
  } = options;

  return (
    <Form.Field
      name={name}
      className={cn('mb-4', radixFormFieldStackClassName)}
    >
      <Form.Label className={radixCompactFormLabelClassName}>
        {label}
      </Form.Label>
      <Form.Control asChild>
        <input
          type={type}
          required={required}
          placeholder={placeholder}
          pattern={pattern}
          defaultValue={defaultValue}
          className={radixInputClassName}
        />
      </Form.Control>
      {required && (
        <RadixFormErrorMessage match='valueMissing'>
          {requiredMessage}
        </RadixFormErrorMessage>
      )}
      {type === 'email' && (
        <RadixFormErrorMessage match='typeMismatch'>
          {typeMismatchMessage}
        </RadixFormErrorMessage>
      )}
      {pattern && patternMessage && (
        <RadixFormErrorMessage match='patternMismatch'>
          {patternMessage}
        </RadixFormErrorMessage>
      )}
    </Form.Field>
  );
};

const renderSelectField = (
  name: string,
  label: string,
  placeholder: string,
  requiredMessage: string,
  optionElements: React.ReactNode,
  defaultValue = '',
) => (
  <Form.Field name={name} className={radixFormFieldStackClassName}>
    <Form.Label className={radixCompactFormLabelClassName}>{label}</Form.Label>
    <RadixFormSelectShell>
      <Form.Control asChild>
        <select
          required
          defaultValue={defaultValue}
          className={radixSelectClassName}
        >
          <option value='' disabled>
            {placeholder}
          </option>
          {optionElements}
        </select>
      </Form.Control>
    </RadixFormSelectShell>
    <RadixFormErrorMessage match='valueMissing'>
      {requiredMessage}
    </RadixFormErrorMessage>
  </Form.Field>
);

const BAPTISM_SIGN_UP_INTRO =
  'Fill out the form below to sign up for baptism and someone from our team will follow up with next steps!';

const DEV_PREFILL = {
  firstName: 'Testy',
  lastName: 'McTester',
  email: 'testy.mctester@example.com',
  phone: '561-555-1234',
  birthdate: '1995-07-14',
  addressLine1: '123 Palm Tree Ln',
  addressLine2: 'Apt 4B',
  city: 'Palm Beach Gardens',
  state: 'FL',
  zip: '33410',
  tShirtSize: 'Adult Medium',
  myStory: 'I am ready to take this next step and go public with my faith.',
  shareYourStory: 'No Preference',
} as const;

const FORM_COPY = {
  English: {
    title: 'Sign Up for Baptism',
    intro: BAPTISM_SIGN_UP_INTRO,
    firstName: 'First Name',
    firstNamePlaceholder: 'First Name',
    lastName: 'Last Name',
    lastNamePlaceholder: 'Last Name',
    email: 'Email Address',
    emailPlaceholder: 'Example@gmail.com',
    phone: 'Cell Phone',
    phonePlaceholder: 'xxx-xxx-xxxx',
    campus: 'Home Campus',
    campusPlaceholder: 'Select a Campus',
    birthdate: 'Birthdate',
    address: 'Address',
    addressLine1: 'Address Line 1',
    addressLine1Placeholder: 'Street address',
    addressLine2: 'Address Line 2',
    addressLine2Placeholder: 'Apartment, suite, etc. (optional)',
    city: 'City',
    cityPlaceholder: 'City',
    state: 'State',
    statePlaceholder: 'Select a State',
    zip: 'Zip Code',
    zipPlaceholder: 'Zip Code',
    tShirtSize: 'T-Shirt Size',
    tShirtSizePlaceholder: 'Select a Size',
    myStory: 'Tell us why now is your time to get baptized!',
    charactersRemaining: 'characters remaining',
    shareYourStory:
      'Are you comfortable with sharing your story on platform before being baptized?',
    areYouInHighSchool: 'Are you in High School?',
    yes: 'Yes',
    no: 'No',
    guardianHeading: 'Parent / Guardian Information',
    grade: 'Grade',
    gradePlaceholder: 'Select a Grade',
    guardianFirstName: "Guardian's First Name",
    guardianLastName: "Guardian's Last Name",
    guardianEmail: "Guardian's Email",
    guardianPhone: "Guardian's Phone Number",
    relationship: 'Relation to the participant',
    relationshipPlaceholder: 'e.g. Mother, Father, Guardian',
    submit: 'Submit',
    loading: 'Loading...',
    missingGroup: 'Missing group reference. Please use the link provided.',
    submitError:
      'An error occurred while submitting the form. Please try again.',
    requiredFirstName: 'Please enter your first name',
    requiredLastName: 'Please enter your last name',
    requiredEmail: 'Please enter your email',
    validEmail: 'Please enter a valid email address',
    requiredPhone: 'Please enter your phone number',
    validPhone: 'Please enter a valid phone number',
    requiredCampus: 'Please select a campus',
    requiredBirthdate: 'Please enter your birthdate',
    requiredAddress: 'Please enter your address',
    requiredCity: 'Please enter your city',
    requiredState: 'Please select a state',
    requiredZip: 'Please enter your zip code',
    requiredTShirtSize: 'Please select a t-shirt size',
    requiredMyStory: 'Please tell us why now is your time',
    requiredOption: 'Please select an option',
    requiredHighSchool: 'Please let us know',
    requiredGrade: 'Please select a grade',
    requiredGuardianFirstName: "Please enter the guardian's first name",
    requiredGuardianLastName: "Please enter the guardian's last name",
    requiredGuardianEmail: "Please enter the guardian's email",
    requiredGuardianPhone: "Please enter the guardian's phone number",
    requiredRelationship: 'Please enter your relation to the participant',
    shareStoryOptions: SHARE_STORY_OPTIONS,
  },
  Spanish: {
    title: 'Inscríbete para el bautismo',
    intro:
      'Completa el formulario a continuación para inscribirte para el bautismo y alguien de nuestro equipo se comunicará contigo con los próximos pasos.',
    firstName: 'Nombre',
    firstNamePlaceholder: 'Nombre',
    lastName: 'Apellido',
    lastNamePlaceholder: 'Apellido',
    email: 'Correo electrónico',
    emailPlaceholder: 'Ejemplo@gmail.com',
    phone: 'Teléfono celular',
    phonePlaceholder: 'xxx-xxx-xxxx',
    campus: 'Campus principal',
    campusPlaceholder: 'Selecciona un campus',
    birthdate: 'Fecha de nacimiento',
    address: 'Dirección',
    addressLine1: 'Dirección línea 1',
    addressLine1Placeholder: 'Dirección',
    addressLine2: 'Dirección línea 2',
    addressLine2Placeholder: 'Apartamento, suite, etc. (opcional)',
    city: 'Ciudad',
    cityPlaceholder: 'Ciudad',
    state: 'Estado',
    statePlaceholder: 'Selecciona un estado',
    zip: 'Código postal',
    zipPlaceholder: 'Código postal',
    tShirtSize: 'Talla de camiseta',
    tShirtSizePlaceholder: 'Selecciona una talla',
    myStory: 'Cuéntanos por qué ahora es tu momento para bautizarte.',
    charactersRemaining: 'caracteres restantes',
    shareYourStory:
      '¿Te sientes cómodo compartiendo tu historia en la plataforma antes de bautizarte?',
    areYouInHighSchool: '¿Estás en la escuela secundaria?',
    yes: 'Si',
    no: 'No',
    guardianHeading: 'Información del padre / tutor',
    grade: 'Grado',
    gradePlaceholder: 'Selecciona un grado',
    guardianFirstName: 'Nombre del tutor',
    guardianLastName: 'Apellido del tutor',
    guardianEmail: 'Correo electrónico del tutor',
    guardianPhone: 'Teléfono del tutor',
    relationship: 'Relación con el participante',
    relationshipPlaceholder: 'Ej. Madre, padre, tutor',
    submit: 'Enviar',
    loading: 'Cargando...',
    missingGroup:
      'Falta la referencia del grupo. Por favor usa el enlace proporcionado.',
    submitError:
      'Ocurrió un error al enviar el formulario. Inténtalo de nuevo.',
    requiredFirstName: 'Por favor ingresa tu nombre',
    requiredLastName: 'Por favor ingresa tu apellido',
    requiredEmail: 'Por favor ingresa tu correo electrónico',
    validEmail: 'Por favor ingresa un correo electrónico válido',
    requiredPhone: 'Por favor ingresa tu número de teléfono',
    validPhone: 'Por favor ingresa un número de teléfono válido',
    requiredCampus: 'Por favor selecciona un campus',
    requiredBirthdate: 'Por favor ingresa tu fecha de nacimiento',
    requiredAddress: 'Por favor ingresa tu dirección',
    requiredCity: 'Por favor ingresa tu ciudad',
    requiredState: 'Por favor selecciona un estado',
    requiredZip: 'Por favor ingresa tu código postal',
    requiredTShirtSize: 'Por favor selecciona una talla de camiseta',
    requiredMyStory: 'Por favor cuéntanos por qué ahora es tu momento',
    requiredOption: 'Por favor selecciona una opción',
    requiredHighSchool: 'Por favor déjanos saber',
    requiredGrade: 'Por favor selecciona un grado',
    requiredGuardianFirstName: 'Por favor ingresa el nombre del tutor',
    requiredGuardianLastName: 'Por favor ingresa el apellido del tutor',
    requiredGuardianEmail: 'Por favor ingresa el correo electrónico del tutor',
    requiredGuardianPhone: 'Por favor ingresa el teléfono del tutor',
    requiredRelationship: 'Por favor ingresa tu relación con el participante',
    shareStoryOptions: SPANISH_SHARE_STORY_OPTIONS,
  },
};

/** Scrolls to the Register section, or the form itself when that section is absent. */
const scrollToFormSection = (formElement: HTMLElement | null) => {
  if (scrollToAnchor('register')) return;

  formElement?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
};

const BaptismSignUpForm: React.FC<BaptismSignUpFormProps> = ({
  onSuccess,
  groupGuid,
  isSpanish = false,
  showHeader = true,
}) => {
  const [searchParams] = useSearchParams();
  const isDevPrefillEnabled =
    import.meta.env.DEV && searchParams.get('prefill') === '1';
  const prefillValues = isDevPrefillEnabled ? DEV_PREFILL : null;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [birthdate, setBirthdate] = useState(prefillValues?.birthdate ?? '');
  const [inHighSchool, setInHighSchool] = useState('');
  const [story, setStory] = useState(prefillValues?.myStory ?? '');
  const [submittedName, setSubmittedName] =
    useState<BaptismSignUpSuccessDetails | null>(null);
  const [formFieldData, setFormFieldData] =
    useState<BaptismSignUpLoaderReturnType>({ campuses: [] });

  const fetcher = useFetcher({ key: 'baptism-sign-up-form' });
  const formSectionRef = useRef<HTMLDivElement>(null);
  const selectedGroupGuid = groupGuid ?? searchParams.get('Group') ?? '';
  const language = isSpanish ? 'Spanish' : 'English';
  const copy = FORM_COPY[language];

  useEffect(() => {
    fetcher.load('/baptism-sign-up');
  }, []);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setLoading(false);

      if ('campuses' in fetcher.data) {
        // Initial data load.
        setFormFieldData(fetcher.data as BaptismSignUpLoaderReturnType);
      } else if ('error' in fetcher.data) {
        setError(fetcher.data.error || 'An unexpected error occurred');
      } else {
        // Successful form submission.
        setError(null);
        pushFormEvent('form_complete', 'baptism_sign_up', 'Baptism Sign Up');
        onSuccess(submittedName ?? undefined);
      }
    }

    if (fetcher.state === 'submitting') {
      setLoading(true);
      setError(null);
    }
  }, [fetcher.state, fetcher.data, onSuccess]);

  const handleBirthdateChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    setBirthdate(value);
    // Reset the High School answer whenever the age is no longer exactly 18 so
    // a stale "Yes" can't keep the guardian block open.
    if (computeAge(value) !== 18) {
      setInHighSchool('');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedGroupGuid) {
      setError(copy.missingGroup);
      return;
    }

    const formData = new FormData(event.currentTarget);
    setSubmittedName({
      firstName: formData.get('firstName')?.toString() ?? '',
      lastName: formData.get('lastName')?.toString() ?? '',
    });
    const actionSearchParams = new URLSearchParams({
      Group: selectedGroupGuid,
      Language: language,
    });

    scrollToFormSection(formSectionRef.current);

    try {
      fetcher.submit(formData, {
        method: 'post',
        action: `/baptism-sign-up?${actionSearchParams.toString()}`,
      });
    } catch {
      setError(copy.submitError);
      setLoading(false);
    }
  };

  const { campuses } = formFieldData;
  const age = computeAge(birthdate);
  const showHighSchoolQuestion = age === 18;
  const showGuardianBlock =
    age !== null && (age < 18 || (age === 18 && inHighSchool === 'True'));
  const today = new Date().toISOString().split('T')[0];
  const remaining = MAX_STORY_LENGTH - story.length;
  const campusDefaultValue =
    prefillValues && campuses.length > 0 ? (campuses[0]?.guid ?? '') : '';

  return (
    <div ref={formSectionRef}>
      {showHeader && (
        <>
          <h2 className='mb-6 text-3xl text-navy font-bold'>{copy.title}</h2>
          <p className='text-center md:text-left mb-10 col-span-2 text-sm text-text-secondary'>
            {copy.intro}
          </p>
        </>
      )}
      <Form.Root
        onSubmit={handleSubmit}
        className='flex flex-col md:grid text-left grid-cols-1 gap-y-3 gap-x-6 md:grid-cols-2'
      >
        {renderTextField('firstName', copy.firstName, copy.requiredFirstName, {
          placeholder: copy.firstNamePlaceholder,
          defaultValue: prefillValues?.firstName,
        })}
        {renderTextField('lastName', copy.lastName, copy.requiredLastName, {
          placeholder: copy.lastNamePlaceholder,
          defaultValue: prefillValues?.lastName,
        })}
        {renderTextField('email', copy.email, copy.requiredEmail, {
          type: 'email',
          placeholder: copy.emailPlaceholder,
          typeMismatchMessage: copy.validEmail,
          defaultValue: prefillValues?.email,
        })}
        {renderTextField('phone', copy.phone, copy.requiredPhone, {
          type: 'tel',
          placeholder: copy.phonePlaceholder,
          pattern: US_PHONE_PATTERN,
          patternMessage: copy.validPhone,
          defaultValue: prefillValues?.phone,
        })}

        <Form.Field name='campus' className={radixFormFieldStackClassName}>
          <Form.Label className={radixCompactFormLabelClassName}>
            {copy.campus}
          </Form.Label>
          <RadixFormSelectShell>
            <Form.Control asChild>
              <select
                key={campusDefaultValue || 'empty-campus'}
                required
                defaultValue={campusDefaultValue}
                className={radixSelectClassName}
              >
                <option value='' disabled>
                  {copy.campusPlaceholder}
                </option>
                {campuses.map(({ guid, name }) => (
                  <option key={guid} value={guid}>
                    {name}
                  </option>
                ))}
              </select>
            </Form.Control>
          </RadixFormSelectShell>
          <RadixFormErrorMessage match='valueMissing'>
            {copy.requiredCampus}
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field name='birthdate' className={radixFormFieldStackClassName}>
          <Form.Label className={radixCompactFormLabelClassName}>
            {copy.birthdate}
          </Form.Label>
          <Form.Control asChild>
            <input
              type='date'
              required
              max={today}
              value={birthdate}
              onChange={handleBirthdateChange}
              className={radixInputClassName}
            />
          </Form.Control>
          <RadixFormErrorMessage match='valueMissing'>
            {copy.requiredBirthdate}
          </RadixFormErrorMessage>
        </Form.Field>

        <h3 className='col-span-2 mt-4 text-lg font-bold italic text-navy'>
          {copy.address}
        </h3>
        {renderTextField(
          'addressLine1',
          copy.addressLine1,
          copy.requiredAddress,
          {
            placeholder: copy.addressLine1Placeholder,
            type: 'text',
            defaultValue: prefillValues?.addressLine1,
          },
        )}
        {renderTextField('addressLine2', copy.addressLine2, '', {
          required: false,
          placeholder: copy.addressLine2Placeholder,
          defaultValue: prefillValues?.addressLine2,
        })}
        {renderTextField('city', copy.city, copy.requiredCity, {
          placeholder: copy.cityPlaceholder,
          defaultValue: prefillValues?.city,
        })}
        {renderSelectField(
          'state',
          copy.state,
          copy.statePlaceholder,
          copy.requiredState,
          US_STATES.map(({ abbr, name }) => (
            <option key={abbr} value={abbr}>
              {name}
            </option>
          )),
          prefillValues?.state,
        )}
        {renderTextField('zip', copy.zip, copy.requiredZip, {
          placeholder: copy.zipPlaceholder,
          defaultValue: prefillValues?.zip,
        })}

        {renderSelectField(
          'tShirtSize',
          copy.tShirtSize,
          copy.tShirtSizePlaceholder,
          copy.requiredTShirtSize,
          T_SHIRT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          )),
          prefillValues?.tShirtSize,
        )}

        <Form.Field
          name='myStory'
          className={cn(
            'col-span-1 md:col-span-2',
            radixFormFieldStackClassName,
          )}
        >
          <Form.Label className={radixFormLabelClassName}>
            {copy.myStory}
          </Form.Label>
          <Form.Control asChild>
            <textarea
              rows={4}
              required
              maxLength={MAX_STORY_LENGTH}
              value={story}
              onChange={(event) => setStory(event.target.value)}
              className={radixTextareaClassName}
            />
          </Form.Control>
          <p className='text-sm text-text-secondary'>
            {remaining} {copy.charactersRemaining}
          </p>
          <RadixFormErrorMessage match='valueMissing'>
            {copy.requiredMyStory}
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='shareYourStory'
          className={cn(
            'col-span-1 mt-2 md:col-span-2',
            radixFormFieldStackClassName,
          )}
        >
          <Form.Label className={radixFormLabelClassName}>
            {copy.shareYourStory}
          </Form.Label>
          <div className={formRadioGroupVerticalStyles} role='radiogroup'>
            {copy.shareStoryOptions.map((option) => (
              <label key={option.value} className='flex items-center gap-2'>
                <Form.Control asChild>
                  <input
                    type='radio'
                    name='shareYourStory'
                    value={option.value}
                    required
                    defaultChecked={
                      prefillValues?.shareYourStory === option.value
                    }
                    className={radixRadioClassName}
                  />
                </Form.Control>
                <span className='leading-4'>{option.label}</span>
              </label>
            ))}
          </div>
          <RadixFormErrorMessage match='valueMissing'>
            {copy.requiredOption}
          </RadixFormErrorMessage>
        </Form.Field>

        {showHighSchoolQuestion && (
          <Form.Field
            name='areYouInHighSchool'
            className={cn(
              'col-span-1 mt-2 md:col-span-2',
              radixFormFieldStackClassName,
            )}
          >
            <Form.Label className={radixFormLabelClassName}>
              {copy.areYouInHighSchool}
            </Form.Label>
            <div className={formRadioGroupVerticalStyles} role='radiogroup'>
              {[
                { label: copy.yes, value: 'True' },
                { label: copy.no, value: 'False' },
              ].map((option) => (
                <label key={option.value} className='flex items-center gap-2'>
                  <Form.Control asChild>
                    <input
                      type='radio'
                      name='areYouInHighSchool'
                      value={option.value}
                      required
                      checked={inHighSchool === option.value}
                      onChange={(event) => setInHighSchool(event.target.value)}
                      className={radixRadioClassName}
                    />
                  </Form.Control>
                  <span className='leading-4'>{option.label}</span>
                </label>
              ))}
            </div>
            <RadixFormErrorMessage match='valueMissing'>
              {copy.requiredHighSchool}
            </RadixFormErrorMessage>
          </Form.Field>
        )}

        {showGuardianBlock && (
          <>
            <h3 className='col-span-2 mt-4 text-lg font-bold italic text-navy'>
              {copy.guardianHeading}
            </h3>
            {renderSelectField(
              'grade',
              copy.grade,
              copy.gradePlaceholder,
              copy.requiredGrade,
              GRADE_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              )),
            )}
            <div className='hidden md:block' />
            {renderTextField(
              'gFirstName',
              copy.guardianFirstName,
              copy.requiredGuardianFirstName,
              { placeholder: copy.firstNamePlaceholder },
            )}
            {renderTextField(
              'gLastName',
              copy.guardianLastName,
              copy.requiredGuardianLastName,
              { placeholder: copy.lastNamePlaceholder },
            )}
            {renderTextField(
              'guardiansEmail',
              copy.guardianEmail,
              copy.requiredGuardianEmail,
              {
                type: 'email',
                placeholder: copy.emailPlaceholder,
                typeMismatchMessage: copy.validEmail,
              },
            )}
            {renderTextField(
              'guardiansPhone',
              copy.guardianPhone,
              copy.requiredGuardianPhone,
              {
                type: 'tel',
                placeholder: copy.phonePlaceholder,
                pattern: US_PHONE_PATTERN,
                patternMessage: copy.validPhone,
              },
            )}
            {renderTextField(
              'relationship',
              copy.relationship,
              copy.requiredRelationship,
              { placeholder: copy.relationshipPlaceholder },
            )}
          </>
        )}

        <input type='hidden' name='Group' value={selectedGroupGuid} />

        {error && <p className='text-alert col-span-2 text-center'>{error}</p>}

        <Form.Submit className='mt-10 mx-auto col-span-1 md:col-span-2' asChild>
          <Button
            className='w-40 h-12'
            size='md'
            type='submit'
            disabled={loading}
          >
            {loading ? copy.loading : copy.submit}
          </Button>
        </Form.Submit>
      </Form.Root>
    </div>
  );
};

export default BaptismSignUpForm;
