import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useSearchBox } from 'react-instantsearch';

import { cn, isValidZip } from '~/lib/utils';
import Icon from '~/primitives/icon';

export const SearchBar = ({
  onSearchStateChange,
  onQueryChange,
  onSearchSubmit,
  clearRequestId = 0,
  'data-gtm': dataGtm,
}: {
  onSearchStateChange: (isSearching: boolean) => void;
  onQueryChange: (query: string) => void;
  onSearchSubmit: (query: string | null) => void;
  /** Increment to clear the input while keeping the results popup open. */
  clearRequestId?: number;
  'data-gtm'?: string;
}) => {
  const { refine } = useSearchBox();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const placeholder = 'Search by city, zip code, or location';

  useEffect(() => {
    // Locations index is not keyword-searchable in Algolia — keep the index
    // query empty and filter hits client-side from `onQueryChange`.
    refine('');
  }, [refine]);

  useEffect(() => {
    if (clearRequestId === 0) return;
    setInputValue('');
    refine('');
    onQueryChange('');
    onSearchSubmit(null);
    onSearchStateChange(true);
  }, [
    clearRequestId,
    refine,
    onQueryChange,
    onSearchSubmit,
    onSearchStateChange,
  ]);

  const syncFromInput = (raw: string) => {
    setInputValue(raw);

    const trimmed = raw.trim();
    refine('');
    onQueryChange(trimmed);
    onSearchStateChange(true);

    // Additionally geocode when the input is a valid 5-digit ZIP.
    if (trimmed.length === 5 && isValidZip(trimmed)) {
      onSearchSubmit(trimmed);
    } else {
      onSearchSubmit(null);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    syncFromInput(e.target.value);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    syncFromInput(inputValue);
    inputRef.current?.blur();
  };

  return (
    <form
      className={cn(
        'flex w-full items-center gap-4 rounded-full p-1',
        inputValue ? 'bg-gray' : 'bg-white',
      )}
      data-gtm={dataGtm}
      onSubmit={handleSubmit}
    >
      <button
        type='submit'
        className='flex items-center justify-center p-2 bg-ocean lg:bg-dark-navy rounded-full relative'
        aria-label='Find a service near you'
      >
        <Icon
          name='mapFilled'
          size={20}
          className={`text-white cursor-pointer relative right-px bottom-px`}
        />
      </button>

      <input
        ref={inputRef}
        type='text'
        autoComplete='off'
        value={inputValue}
        onChange={handleChange}
        onFocus={() => {
          // Open results (and precise-location) on focus — not only after typing.
          onSearchStateChange(true);
        }}
        placeholder={placeholder}
        className='w-full grow justify-center text-black px-3 outline-none appearance-none bg-transparent'
        aria-label='Find a service near you'
      />
    </form>
  );
};
