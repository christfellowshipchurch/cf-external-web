import { useEffect, useRef, useState } from 'react';
import { Button } from '~/primitives/button/button.primitive';
import * as Form from '@radix-ui/react-form';
import { cn } from '~/lib/utils';
import {
  RadixFormSelectShell,
  radixCheckboxClassName,
  radixCheckboxOptionLabelClassName,
  radixCompactFormLabelClassName,
  RadixFormErrorMessage,
  radixFormFieldStackClassName,
  radixInputClassName,
  radixSelectClassName,
} from '~/primitives/inputs/form-radix-field';
import { formFieldInvalidControlStyles } from '~/primitives/inputs/form-control.styles';
import { useFetcher, useParams, useSearchParams } from 'react-router';
import type {
  ConnectCardLoaderReturnType,
  ConnectCardPrefill,
  ConnectCardPrefillResponse,
} from '~/routes/connect-card/types';
import { buildConnectCardSubmission } from '~/routes/connect-card/build-submission';
import { getSpanishRockSubmitValue } from '~/routes/connect-card/connect-card-rock-values';
import { pushFormEvent } from '~/lib/gtm';

interface ConnectCardProps {
  onSuccess: () => void;
  isEspanol?: boolean;
}

export const renderInputField = (
  name: string,
  label: string,
  type: string,
  requiredMessage: string,
  defaultValue?: string,
  placeholder?: string,
  fieldClassName = '',
  value?: string,
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void,
) => (
  <Form.Field
    name={name}
    className={cn('mb-4', radixFormFieldStackClassName, fieldClassName)}
  >
    <Form.Label className={radixCompactFormLabelClassName}>{label}</Form.Label>
    <Form.Control asChild>
      <input
        type={type}
        required
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={radixInputClassName}
      />
    </Form.Control>
    <RadixFormErrorMessage match='valueMissing'>
      {requiredMessage}
    </RadixFormErrorMessage>
    {type === 'email' && (
      <RadixFormErrorMessage match='typeMismatch'>
        Please enter a valid email address
      </RadixFormErrorMessage>
    )}
  </Form.Field>
);

interface CheckboxOption {
  guid: string;
  value: string;
}

// Options grouped under the "next step in my faith" sub-heading within the
// "I am looking to:" section. Matched by Rock defined-value label, mirroring
// the existing `Other` handling.
const NEXT_STEP_VALUES = ['The Journey class', 'Baptism'];

const CONNECT_CARD_OPTION_LABELS_ES: Record<string, string> = {
  'The Journey class': 'la clase Journey',
  Baptism: 'bautismo',
  'Find community': 'Encontrar comunidad',
  'Make a difference by serving as a volunteer':
    'Hacer la diferencia ayudando como voluntario',
  'Make a difference by volunteering':
    'Hacer la diferencia ayudando como voluntario',
  'Discover a place where my kids feel at home':
    'Descubrir un lugar donde mis hijos se sientan en casa',
  Other: 'Otro',
};

const getConnectCardOptionLabel = (value: string, isEspanol?: boolean) =>
  isEspanol ? (CONNECT_CARD_OPTION_LABELS_ES[value] ?? value) : value;

const emptyPrefill: Required<ConnectCardPrefill> = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  campus: '',
};

const ROCK_PERSON_ID_QUERY_PARAMS = ['rckipid', 'rckpid'];
const ROCK_PERSON_TOKEN_MAX_LENGTH = 512;

const hasControlCharacters = (value: string) =>
  Array.from(value).some((char) => {
    const code = char.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const isValidRockPersonToken = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed || trimmed.length > ROCK_PERSON_TOKEN_MAX_LENGTH) {
    return false;
  }

  return !(
    hasControlCharacters(trimmed) ||
    trimmed.includes('"') ||
    trimmed.includes('\\') ||
    trimmed.includes('{{') ||
    trimmed.includes('}}') ||
    trimmed.includes('{%') ||
    trimmed.includes('%}')
  );
};

const getRockPersonIdSearchParam = (searchParams: URLSearchParams) => {
  for (const paramName of ROCK_PERSON_ID_QUERY_PARAMS) {
    const value = searchParams.get(paramName)?.trim();
    if (value) {
      return { paramName, value };
    }
  }

  return null;
};

export const renderCheckboxField = (
  checkbox: CheckboxOption,
  index: number,
  label = checkbox.value,
  namePrefix = 'allThatApplies',
  submitValue = checkbox.guid,
) => (
  <Form.Field
    key={index}
    name={`${namePrefix}-${index}`}
    className={cn('flex gap-2 md:items-center', formFieldInvalidControlStyles)}
  >
    <Form.Control asChild>
      <input
        type='checkbox'
        id={checkbox.guid}
        value={submitValue}
        className={radixCheckboxClassName}
      />
    </Form.Control>
    <Form.Label
      htmlFor={checkbox.guid}
      className={radixCheckboxOptionLabelClassName}
    >
      {label}
    </Form.Label>
  </Form.Field>
);

const CONNECT_CARD_INTRO =
  'Fill out the form below and someone from our team will follow up with you!';

const CONNECT_CARD_INTRO_ES =
  'Completa el formulario a continuación y alguien de nuestro equipo se comunicará contigo.';

const ConnectCardForm: React.FC<ConnectCardProps> = ({
  onSuccess,
  isEspanol,
}) => {
  const [isOther, setIsOther] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prefillValues, setPrefillValues] =
    useState<Required<ConnectCardPrefill>>(emptyPrefill);
  const [campusSelectKey, setCampusSelectKey] = useState(0);
  const { location: campusUrlFromPath } = useParams();
  const isCampusLocked = Boolean(campusUrlFromPath);
  const fetcher = useFetcher({ key: 'connect-card-form' });
  const prefillFetcher = useFetcher({ key: 'connect-card-prefill' });
  const [searchParams, setSearchParams] = useSearchParams();
  const processedRckipidRef = useRef(false);
  const requestedPrefillRef = useRef(false);

  const [formFieldData, setFormFieldData] =
    useState<ConnectCardLoaderReturnType>({
      campuses: [],
      allThatApplies: [],
    });

  // Effect for initial data loading
  useEffect(() => {
    fetcher.load('/connect-card');
  }, []);

  useEffect(() => {
    if (processedRckipidRef.current) {
      return;
    }

    const rockPersonIdParam = getRockPersonIdSearchParam(searchParams);
    if (!rockPersonIdParam) {
      return;
    }

    processedRckipidRef.current = true;
    const isValidRckipid = isValidRockPersonToken(rockPersonIdParam.value);

    const nextSearchParams = new URLSearchParams(searchParams);
    ROCK_PERSON_ID_QUERY_PARAMS.forEach((paramName) =>
      nextSearchParams.delete(paramName),
    );
    setSearchParams(nextSearchParams, { replace: true });

    if (!isValidRckipid) {
      return;
    }

    requestedPrefillRef.current = true;
    prefillFetcher.load(
      `/api/connect-card-prefill?rckpid=${encodeURIComponent(
        rockPersonIdParam.value,
      )}`,
    );
  }, [prefillFetcher, searchParams, setSearchParams]);

  useEffect(() => {
    if (
      !requestedPrefillRef.current ||
      prefillFetcher.state !== 'idle' ||
      !prefillFetcher.data
    ) {
      return;
    }

    const response = prefillFetcher.data as ConnectCardPrefillResponse;

    if (response.status !== 'success') {
      return;
    }

    setPrefillValues((current) => ({
      ...current,
      firstName: response.prefill.firstName ?? current.firstName,
      lastName: response.prefill.lastName ?? current.lastName,
      email: response.prefill.email ?? current.email,
      phone: response.prefill.phone ?? current.phone,
      campus: isCampusLocked
        ? current.campus
        : (response.prefill.campus ?? current.campus),
    }));

    if (response.prefill.campus && !isCampusLocked) {
      setCampusSelectKey((key) => key + 1);
    }
  }, [isCampusLocked, prefillFetcher.state, prefillFetcher.data]);

  // Effect for handling form data and submissions
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setLoading(false);

      if ('campuses' in fetcher.data && 'allThatApplies' in fetcher.data) {
        // This was the initial data load
        setFormFieldData(fetcher.data as ConnectCardLoaderReturnType);
      } else if ('error' in fetcher.data) {
        setError(fetcher.data.error || 'An unexpected error occurred');
      } else {
        // This was a successful form submission
        setError(null);
        pushFormEvent('form_complete', 'connect_card', 'Connect Card');
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
    const rawFormData = Object.fromEntries(formData.entries());
    const submission = buildConnectCardSubmission(rawFormData);

    // Debug: log payload before submitting
    // eslint-disable-next-line no-console -- temporary connect card debug
    console.group('[Connect Card] Submit preview');
    // eslint-disable-next-line no-console -- temporary connect card debug
    console.log('Raw form fields:', submission.rawFormData);
    // eslint-disable-next-line no-console -- temporary connect card debug
    console.log('Workflow type ID:', submission.workflowTypeId);
    // eslint-disable-next-line no-console -- temporary connect card debug
    console.log('Rock endpoint:', submission.endpoint);
    // eslint-disable-next-line no-console -- temporary connect card debug
    console.log('Rock body:', submission.body);
    // eslint-disable-next-line no-console -- temporary connect card debug
    console.groupEnd();

    // --- Live form submission ---
    try {
      fetcher.submit(formData, {
        method: 'post',
        action: '/connect-card',
      });
    } catch {
      setError(
        'An error occurred while submitting the form. Please try again.',
      );
      setLoading(false);
    }
  };

  const handlePrefillValueChange =
    (field: keyof ConnectCardPrefill) =>
    (
      event:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLSelectElement>,
    ) => {
      setPrefillValues((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const { campuses, allThatApplies } = formFieldData;
  const lockedCampus = campusUrlFromPath
    ? campuses.find((campus) => campus.url === campusUrlFromPath)
    : undefined;

  const otherCheckbox = allThatApplies.find(
    (checkbox) => checkbox.value === 'Other',
  );
  // Preserve each option's original index so submitted field names
  // (`allThatApplies-${index}`) stay unique across the grouped sub-lists.
  const indexedCheckboxes = allThatApplies.map((checkbox, index) => ({
    checkbox,
    index,
  }));
  const nextStepCheckboxes = indexedCheckboxes.filter(({ checkbox }) =>
    NEXT_STEP_VALUES.includes(checkbox.value),
  );
  const generalCheckboxes = indexedCheckboxes.filter(
    ({ checkbox }) =>
      checkbox.value !== 'Other' && !NEXT_STEP_VALUES.includes(checkbox.value),
  );

  return (
    <>
      <h2 className='mb-6 text-3xl text-navy font-bold'>
        {isEspanol ? 'Conéctate' : 'Get Connected'}
      </h2>
      <p className='text-center mb-10 col-span-2 text-sm text-text-secondary'>
        {isEspanol ? CONNECT_CARD_INTRO_ES : CONNECT_CARD_INTRO}
      </p>
      <Form.Root
        onSubmit={handleSubmit}
        className='flex flex-col md:grid text-left grid-cols-1 gap-y-3 gap-x-6 md:grid-cols-2'
      >
        {isEspanol && <input type='hidden' name='language' value='Spanish' />}
        {renderInputField(
          'firstName',
          isEspanol ? 'Nombre' : 'First Name',
          'text',
          isEspanol ? 'Nombre es obligatorio.' : 'Please enter your first name',
          undefined,
          isEspanol ? 'Nombre' : 'First Name',
          '',
          prefillValues.firstName,
          handlePrefillValueChange('firstName'),
        )}
        {renderInputField(
          'lastName',
          isEspanol ? 'Apellido' : 'Last Name',
          'text',
          isEspanol
            ? 'Apellido es obligatorio.'
            : 'Please enter your last name',
          undefined,
          isEspanol ? 'Apellido' : 'Last Name',
          '',
          prefillValues.lastName,
          handlePrefillValueChange('lastName'),
        )}
        {renderInputField(
          'phone',
          isEspanol ? 'Teléfono' : 'Phone',
          'tel',
          isEspanol
            ? 'Teléfono es obligatorio.'
            : 'Please enter a valid number',
          undefined,
          'xxx-xxx-xxxx',
          '',
          prefillValues.phone,
          handlePrefillValueChange('phone'),
        )}
        {renderInputField(
          'email',
          'Email',
          'text',
          isEspanol ? 'Email es obligatorio.' : 'Please enter a valid email',
          undefined,
          isEspanol ? 'Email' : 'Example@gmail.com',
          '',
          prefillValues.email,
          handlePrefillValueChange('email'),
        )}

        <Form.Field name='campus' className={radixFormFieldStackClassName}>
          <Form.Label
            className={radixCompactFormLabelClassName}
            htmlFor={lockedCampus ? 'connect-card-campus' : undefined}
          >
            Campus
          </Form.Label>
          {lockedCampus ? (
            <>
              <input type='hidden' name='campus' value={lockedCampus.guid} />
              <RadixFormSelectShell>
                <select
                  id='connect-card-campus'
                  className={radixSelectClassName}
                  disabled
                  aria-readonly
                >
                  <option>{lockedCampus.name}</option>
                </select>
              </RadixFormSelectShell>
            </>
          ) : (
            campuses && (
              <RadixFormSelectShell>
                <Form.Control asChild>
                  <select
                    key={`campus-${campusSelectKey}`}
                    name='campus'
                    className={radixSelectClassName}
                    required
                    defaultValue={prefillValues.campus}
                  >
                    <option value=''>
                      {isEspanol ? 'Seleccione un campus' : 'Select a Campus'}
                    </option>
                    {campuses.map(({ guid, name }, index) => (
                      <option key={index} value={guid}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Form.Control>
              </RadixFormSelectShell>
            )
          )}
          <RadixFormErrorMessage match='valueMissing'>
            {isEspanol ? 'Campus es obligatorio.' : 'Please select a campus'}
          </RadixFormErrorMessage>
        </Form.Field>

        <Form.Field
          name='decision'
          className={cn(
            'mt-3 flex gap-2 md:items-center',
            formFieldInvalidControlStyles,
          )}
        >
          <Form.Control asChild>
            <input
              type='checkbox'
              id='decision'
              name='decision'
              value={
                isEspanol
                  ? 'Hoy tomé la decisión de seguir a Cristo.'
                  : 'I made a decision to follow Christ today.'
              }
              className={radixCheckboxClassName}
            />
          </Form.Control>
          <Form.Label
            htmlFor='decision'
            className={radixCheckboxOptionLabelClassName}
          >
            {isEspanol
              ? 'Hoy tomé la decisión de seguir a Cristo.'
              : 'I made a decision to follow Christ today'}
          </Form.Label>
        </Form.Field>

        <h3 className='col-span-2 mt-6 md:mt-8 text-lg font-bold italic text-navy'>
          {isEspanol ? 'Estoy buscondo:' : 'I am looking to:'}
        </h3>
        {nextStepCheckboxes.length > 0 && (
          <div className='col-span-2 flex flex-col gap-3 border-b border-gray-200 pb-4'>
            <p className='italic text-navy'>
              {isEspanol
                ? 'Tomar mi siguiente paso en la fe a través de...'
                : 'Take the next step in my faith through…'}
            </p>
            {isEspanol ? (
              <div className='flex flex-wrap gap-x-6 gap-y-2'>
                {nextStepCheckboxes.map(({ checkbox }) => (
                  <label
                    key={checkbox.guid}
                    className={cn(
                      'flex gap-2 md:items-center',
                      radixCheckboxOptionLabelClassName,
                    )}
                  >
                    <input
                      type='radio'
                      name='nextStep'
                      value={getSpanishRockSubmitValue(checkbox.guid)}
                      className={radixCheckboxClassName}
                    />
                    {getConnectCardOptionLabel(checkbox.value, isEspanol)}
                  </label>
                ))}
              </div>
            ) : (
              <div className='grid grid-cols-1 gap-y-2 md:grid-cols-2 md:gap-x-6'>
                {nextStepCheckboxes.map(({ checkbox, index }) =>
                  renderCheckboxField(
                    checkbox,
                    index,
                    getConnectCardOptionLabel(checkbox.value, isEspanol),
                  ),
                )}
              </div>
            )}
          </div>
        )}
        <div className='col-span-2 grid grid-cols-1 gap-y-2 md:grid-cols-2 md:gap-x-6'>
          {generalCheckboxes.map(({ checkbox, index }) =>
            renderCheckboxField(
              checkbox,
              index,
              getConnectCardOptionLabel(checkbox.value, isEspanol),
              isEspanol ? 'selection' : 'allThatApplies',
              isEspanol
                ? getSpanishRockSubmitValue(checkbox.guid)
                : checkbox.guid,
            ),
          )}
        </div>

        {otherCheckbox && (
          <Form.Field
            name={isEspanol ? 'selection-other' : otherCheckbox.guid}
            className={cn(
              'flex gap-2 md:items-center',
              formFieldInvalidControlStyles,
            )}
          >
            <Form.Control asChild>
              <input
                type='checkbox'
                id={otherCheckbox.guid}
                value={
                  isEspanol
                    ? getSpanishRockSubmitValue(otherCheckbox.guid)
                    : otherCheckbox.guid
                }
                className={radixCheckboxClassName}
                onChange={(_e) => setIsOther(!isOther)}
              />
            </Form.Control>
            <Form.Label
              htmlFor={otherCheckbox.guid}
              className={radixCheckboxOptionLabelClassName}
            >
              {getConnectCardOptionLabel(otherCheckbox.value, isEspanol)}
            </Form.Label>
          </Form.Field>
        )}

        {isOther && (
          <>
            <div />
            <Form.Field
              name='otherContent'
              className={radixFormFieldStackClassName}
            >
              <Form.Control asChild>
                <input
                  type='text'
                  placeholder={
                    isEspanol ? 'Porfavor especifique' : 'Please specify'
                  }
                  className={radixInputClassName}
                />
              </Form.Control>
            </Form.Field>
          </>
        )}

        {error && <p className='text-alert col-span-2 text-center'>{error}</p>}

        <Form.Submit className='mt-10 mx-auto col-span-1 md:col-span-2' asChild>
          <Button
            className='w-40 h-12'
            size='md'
            type='submit'
            disabled={loading}
          >
            {loading ? 'Loading...' : isEspanol ? 'Complete' : 'Submit'}
          </Button>
        </Form.Submit>
      </Form.Root>
    </>
  );
};

export default ConnectCardForm;
