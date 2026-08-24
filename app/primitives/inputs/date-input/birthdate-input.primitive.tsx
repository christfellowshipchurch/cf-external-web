import { useEffect, useRef, useState } from 'react';
import { cn } from '~/lib/utils';
import {
  formControlBaseStyles,
  formControlErrorStyles,
  formFieldStackStyles,
  formLabelStyles,
  formRequiredHintStyles,
  formRequiredMarkerStyles,
} from '~/primitives/inputs/form-control.styles';
import { FormFieldErrorText } from '~/primitives/inputs/form-error-message';
import {
  composeIsoBirthdate,
  splitIsoBirthdate,
  validateBirthdateParts,
  type BirthdateParts,
} from '~/primitives/inputs/date-input/birthdate.utils';

interface BirthdateInputProps {
  /** Submitted as `yyyy-mm-dd` on a hidden input, matching `<input type="date">`. */
  name?: string;
  /** ISO `yyyy-mm-dd`. Reseeds the three boxes whenever it changes externally. */
  value?: string;
  /** Called with the ISO date, or `''` while the entry is incomplete or invalid. */
  setValue?: (value: string) => void;
  /** Overrides the internal validation message (e.g. a server-side error). */
  error?: string | null;
  label?: string;
  isRequired?: boolean;
  /** Adds the `*` marker and `(required)` hint, as the old `DateInput` did. */
  showRequiredHint?: boolean;
  disabled?: boolean;
  /** Applied to the fieldset wrapper, for call-site layout (grid span, margin). */
  className?: string;
}

const SEGMENTS = [
  { key: 'month', label: 'Month', placeholder: 'MM', length: 2 },
  { key: 'day', label: 'Day', placeholder: 'DD', length: 2 },
  { key: 'year', label: 'Year', placeholder: 'YYYY', length: 4 },
] as const;

/** `autocomplete` tokens for a split birthdate, so browser autofill still works. */
const AUTOCOMPLETE: Record<keyof BirthdateParts, string> = {
  month: 'bday-month',
  day: 'bday-day',
  year: 'bday-year',
};

/**
 * Birthdate entry as three numeric boxes (MM / DD / YYYY) instead of a native
 * date picker, so mobile keyboards open on the numeric keypad. The composed
 * value is submitted on a hidden input under `name`, so form actions keep
 * reading the same `yyyy-mm-dd` string they got from `<input type="date">`.
 */
const BirthdateInput: React.FC<BirthdateInputProps> = ({
  name,
  value,
  setValue,
  error,
  label,
  isRequired = false,
  showRequiredHint = false,
  disabled = false,
  className = '',
}) => {
  const [parts, setParts] = useState<BirthdateParts>(() =>
    splitIsoBirthdate(value ?? ''),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const lastEmitted = useRef(value ?? '');

  // Reseed only on changes we did not cause, so late-arriving prefill and form
  // resets land without clobbering a half-typed value.
  useEffect(() => {
    if (value === undefined || value === lastEmitted.current) return;

    lastEmitted.current = value;
    setParts(splitIsoBirthdate(value));
  }, [value]);

  const iso = composeIsoBirthdate(parts);
  const shownError = error ?? validationError;

  // Blocks native form submission while the date is unusable, which is what
  // `<input type="date" required max={today}>` did before.
  useEffect(() => {
    inputRefs.current.month?.setCustomValidity(shownError ?? '');
  }, [shownError]);

  const commit = (nextParts: BirthdateParts) => {
    setParts(nextParts);

    if (validationError) setValidationError(null);

    const nextIso = composeIsoBirthdate(nextParts);

    if (nextIso === lastEmitted.current) return;

    lastEmitted.current = nextIso;
    setValue?.(nextIso);
  };

  const handleChange = (
    key: keyof BirthdateParts,
    rawValue: string,
    maxLength: number,
  ) => {
    const digits = rawValue.replace(/\D/g, '').slice(0, maxLength);

    commit({ ...parts, [key]: digits });

    if (digits.length !== maxLength) return;

    const nextKey = SEGMENTS[SEGMENTS.findIndex((s) => s.key === key) + 1]?.key;

    if (nextKey) inputRefs.current[nextKey]?.focus();
  };

  const handleKeyDown = (
    key: keyof BirthdateParts,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    // Backspace out of an empty box steps back, so fixing a typo is one motion.
    if (event.key !== 'Backspace' || parts[key] !== '') return;

    const previousKey =
      SEGMENTS[SEGMENTS.findIndex((s) => s.key === key) - 1]?.key;

    if (previousKey) inputRefs.current[previousKey]?.focus();
  };

  // Validated on blur of the whole group, so "0" mid-typing is not an error.
  const handleBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;

    setValidationError(validateBirthdateParts(parts, { isRequired }));
  };

  return (
    <fieldset
      className={cn(
        'w-full min-w-0 border-0 p-0',
        formFieldStackStyles,
        className,
      )}
      onBlur={handleBlur}
      disabled={disabled}
    >
      {label && (
        <legend className={cn(formLabelStyles, 'mb-3 p-0')}>
          {isRequired && (
            <span className={formRequiredMarkerStyles}>{'*'}</span>
          )}
          {label}
          {isRequired && (
            <span className={formRequiredHintStyles}>{'(required)'}</span>
          )}
        </legend>
      )}
      <div className='flex w-full min-w-0 items-center gap-2'>
        {SEGMENTS.map(({ key, label: segmentLabel, placeholder, length }) => (
          <input
            key={key}
            ref={(element) => {
              inputRefs.current[key] = element;
            }}
            type='text'
            inputMode='numeric'
            // `pattern` keeps older iOS on the numeric keypad; `type="number"`
            // would strip leading zeros and add spinners.
            pattern='[0-9]*'
            autoComplete={AUTOCOMPLETE[key]}
            maxLength={length}
            required={isRequired}
            disabled={disabled}
            aria-label={segmentLabel}
            placeholder={placeholder}
            value={parts[key]}
            onChange={(event) => handleChange(key, event.target.value, length)}
            onKeyDown={(event) => handleKeyDown(key, event)}
            className={cn(
              shownError ? formControlErrorStyles : formControlBaseStyles,
              'min-w-0 text-center',
              key === 'year' ? 'flex-[1.6]' : 'flex-1',
            )}
            data-invalid={Boolean(shownError)}
            aria-invalid={Boolean(shownError)}
          />
        ))}
      </div>
      {name && <input type='hidden' name={name} value={iso} />}
      {shownError && <FormFieldErrorText>{shownError}</FormFieldErrorText>}
    </fieldset>
  );
};

export default BirthdateInput;
