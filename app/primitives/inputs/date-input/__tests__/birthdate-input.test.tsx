import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BirthdateInput from '../birthdate-input.primitive';

const hiddenValue = (name = 'birthdate') =>
  (
    document.querySelector(
      `input[type='hidden'][name='${name}']`,
    ) as HTMLInputElement | null
  )?.value;

const fill = (month: string, day: string, year: string) => {
  fireEvent.change(screen.getByLabelText('Month'), {
    target: { value: month },
  });
  fireEvent.change(screen.getByLabelText('Day'), { target: { value: day } });
  fireEvent.change(screen.getByLabelText('Year'), { target: { value: year } });
};

describe('BirthdateInput', () => {
  // The reason this component exists: a native date picker on mobile hides the
  // numeric keypad. Losing these attributes silently undoes the whole change.
  it('asks mobile keyboards for the numeric keypad on every box', () => {
    render(<BirthdateInput label='Birthdate' />);

    for (const boxLabel of ['Month', 'Day', 'Year']) {
      const input = screen.getByLabelText(boxLabel);
      expect(input).toHaveAttribute('inputmode', 'numeric');
      expect(input).toHaveAttribute('pattern', '[0-9]*');
      // `type="number"` would strip the leading zero from "07".
      expect(input).toHaveAttribute('type', 'text');
    }
  });

  it('keeps the browser autofill tokens for a split birthdate', () => {
    render(<BirthdateInput label='Birthdate' />);

    expect(screen.getByLabelText('Month')).toHaveAttribute(
      'autocomplete',
      'bday-month',
    );
    expect(screen.getByLabelText('Day')).toHaveAttribute(
      'autocomplete',
      'bday-day',
    );
    expect(screen.getByLabelText('Year')).toHaveAttribute(
      'autocomplete',
      'bday-year',
    );
  });

  // Form actions and Rock still read one `yyyy-mm-dd` string under the old
  // field name, so nothing server-side had to change.
  it('submits the composed date under the original field name', () => {
    render(<BirthdateInput name='birthdate' label='Birthdate' />);

    fill('7', '14', '1995');

    expect(hiddenValue()).toBe('1995-07-14');
  });

  it('submits nothing until all three boxes are filled', () => {
    render(<BirthdateInput name='birthdate' label='Birthdate' />);

    fill('07', '14', '19');

    expect(hiddenValue()).toBe('');
  });

  it('ignores non-numeric characters', () => {
    render(<BirthdateInput name='birthdate' label='Birthdate' />);

    fireEvent.change(screen.getByLabelText('Month'), {
      target: { value: 'a7/' },
    });

    expect(screen.getByLabelText('Month')).toHaveValue('7');
  });

  it('reports the ISO date to the parent as it becomes valid', () => {
    const setValue = vi.fn();
    render(<BirthdateInput label='Birthdate' setValue={setValue} />);

    fill('02', '29', '2024');

    expect(setValue).toHaveBeenLastCalledWith('2024-02-29');
  });

  it('refuses to compose a date that does not exist', () => {
    const setValue = vi.fn();
    render(
      <BirthdateInput name='birthdate' label='Birthdate' setValue={setValue} />,
    );

    fill('02', '30', '2024');

    expect(hiddenValue()).toBe('');
    // The parent is never handed a date it could submit to Rock.
    expect(setValue).not.toHaveBeenCalledWith(expect.stringMatching(/\d/));
  });

  // Validating per keystroke would flag "0" as an invalid month mid-typing.
  it('shows the validation message only after leaving the group', () => {
    render(
      <div>
        <BirthdateInput name='birthdate' label='Birthdate' isRequired />
        <button type='button'>elsewhere</button>
      </div>,
    );

    fill('02', '30', '2024');
    expect(
      screen.queryByText('That day does not exist in the month you picked'),
    ).not.toBeInTheDocument();

    fireEvent.blur(screen.getByLabelText('Year'), {
      relatedTarget: screen.getByText('elsewhere'),
    });

    expect(
      screen.getByText('That day does not exist in the month you picked'),
    ).toBeInTheDocument();
  });

  // Replaces the constraint validation the native date input used to provide.
  it('blocks native submission while the date is unusable', () => {
    render(
      <div>
        <BirthdateInput name='birthdate' label='Birthdate' isRequired />
        <button type='button'>elsewhere</button>
      </div>,
    );

    fill('02', '30', '2024');
    fireEvent.blur(screen.getByLabelText('Year'), {
      relatedTarget: screen.getByText('elsewhere'),
    });

    expect(
      (screen.getByLabelText('Month') as HTMLInputElement).validationMessage,
    ).toBe('That day does not exist in the month you picked');
  });

  it('clears the message once the user starts correcting it', () => {
    render(
      <div>
        <BirthdateInput name='birthdate' label='Birthdate' isRequired />
        <button type='button'>elsewhere</button>
      </div>,
    );

    fill('02', '30', '2024');
    fireEvent.blur(screen.getByLabelText('Year'), {
      relatedTarget: screen.getByText('elsewhere'),
    });
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '28' } });

    expect(
      screen.queryByText('That day does not exist in the month you picked'),
    ).not.toBeInTheDocument();
  });

  it('moves focus forward once a box is full, so entry is one continuous run', () => {
    render(<BirthdateInput label='Birthdate' />);

    fireEvent.change(screen.getByLabelText('Month'), {
      target: { value: '07' },
    });
    expect(screen.getByLabelText('Day')).toHaveFocus();

    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '14' } });
    expect(screen.getByLabelText('Year')).toHaveFocus();
  });

  it('steps back on backspace in an empty box, so a typo takes one motion', () => {
    render(<BirthdateInput label='Birthdate' />);

    fireEvent.keyDown(screen.getByLabelText('Day'), { key: 'Backspace' });

    expect(screen.getByLabelText('Month')).toHaveFocus();
  });

  // Prefill (e.g. a logged-in person's saved birthdate) arrives after mount.
  it('adopts a value that arrives from the parent later', () => {
    const { rerender } = render(
      <BirthdateInput name='birthdate' label='Birthdate' value='' />,
    );

    rerender(
      <BirthdateInput name='birthdate' label='Birthdate' value='1995-07-14' />,
    );

    expect(screen.getByLabelText('Month')).toHaveValue('07');
    expect(screen.getByLabelText('Day')).toHaveValue('14');
    expect(screen.getByLabelText('Year')).toHaveValue('1995');
    expect(hiddenValue()).toBe('1995-07-14');
  });

  it('shows an externally supplied error, such as one from the server', () => {
    render(<BirthdateInput label='Birthdate' error='Birthdate is invalid' />);

    expect(screen.getByText('Birthdate is invalid')).toBeInTheDocument();
  });
});
