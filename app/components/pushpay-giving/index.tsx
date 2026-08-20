import { Button } from '~/primitives/button/button.primitive';

import { useState, useRef, useEffect } from 'react';

export const GIVE_TYPES = [
  'Tithes & Offerings',
  'Impact Offering',
  'Kingdom Builders',
  'Missions',
] as const;

export const PushpayGiving = ({ campusList }: { campusList: string[] }) => {
  const [inputValue, setInputValue] = useState('');
  const [inputWidth, setInputWidth] = useState(0);
  const [giftType, setGiftType] = useState<'one-time' | 'recurring'>(
    'one-time',
  );
  const [campus, setCampus] = useState('');
  const [giveType, setGiveType] =
    useState<(typeof GIVE_TYPES)[number]>('Tithes & Offerings');

  const hiddenSpanRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hiddenSpanRef.current) {
      const text = inputValue || '$0.00';
      hiddenSpanRef.current.textContent = text;
      setInputWidth(hiddenSpanRef.current.offsetWidth + 20); // Add some padding
    }
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Remove any non-numeric characters
    value = value.replace(/[^0-9]/g, '');

    // Check character limit (allowing for amounts up to $999,999.99)
    if (value.length > 9) {
      return; // Don't update if exceeding limit
    }

    // Convert to cents and format as dollars
    if (value) {
      // Convert to cents (multiply by 1 to ensure it's a number)
      const cents = parseInt(value, 10);
      const dollars = (cents / 100).toFixed(2);

      // Add commas for thousands separators
      const parts = dollars.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const formattedValue = `$${parts.join('.')}`;

      setInputValue(formattedValue);
    } else {
      setInputValue('$');
    }
  };

  const buttonStyles =
    'border-t border-b border-ocean w-full rounded-none transition-all duration-300';
  const buttonStylesNotSelected =
    'bg-white text-text-secondary/60 hover:!bg-ocean hover:text-white hover:!border-ocean';

  const buildPushpayUrl = () => {
    const baseUrl = 'https://pushpay.com/g/christfellowship';
    const amount = inputValue.replace('$', '');

    const campusParam =
      campus === 'Westlake - Loxahatchee'
        ? 'Westlake%20%E2%80%93%20Loxahatchee'
        : campus;

    return (
      baseUrl +
      '?f[0]=' +
      campusParam +
      '&a=' +
      amount +
      '&f[1]=' +
      giveType +
      '&' +
      (giftType === 'recurring' && 'r=weekly')
    );
  };

  return (
    <div className='w-full flex flex-col gap-3 items-center justify-center min-h-[370px]'>
      <div className='flex flex-col items-center justify-center text-white'>
        <h2 className='text-[22px] font-bold leading-tight'>
          Enter your gift amount
        </h2>

        {/* Hidden span to measure text width */}
        <span
          ref={hiddenSpanRef}
          className='absolute invisible text-[88px] font-bold whitespace-pre'
          style={{ fontFamily: 'inherit' }}
        />

        <input
          ref={inputRef}
          type='text'
          value={inputValue}
          onChange={handleInputChange}
          placeholder='$0.00'
          maxLength={11}
          className='outline-none focus:outline-none focus:ring-0 text-[88px] font-bold bg-transparent text-center placeholder-white'
          style={{ width: `${inputWidth}px` }}
        />
      </div>

      <div className='flex flex-col gap-6 size-full'>
        <div className='flex flex-col gap-2 bg-white rounded-[14px] p-4 size-full'>
          {/* Gift Type Section */}
          <h3 className='font-bold leading-tight'>Gift Type</h3>
          <div className='w-full flex'>
            <Button
              className={`${buttonStyles} rounded-tl-[4px] rounded-bl-[4px] ${
                giftType === 'one-time'
                  ? 'border-l border-r-0 hover:!border-navy bg-ocean text-white'
                  : `${buttonStylesNotSelected} border-l !border-text-secondary/60`
              }`}
              onClick={() => setGiftType('one-time')}
            >
              One-Time
            </Button>
            <Button
              className={`${buttonStyles} rounded-tr-[4px] rounded-br-[4px] ${
                giftType === 'recurring'
                  ? 'border-r border-l-0 hover:!border-navy bg-ocean text-white'
                  : `${buttonStylesNotSelected} border-r !border-text-secondary/60`
              }`}
              onClick={() => setGiftType('recurring')}
            >
              Recurring
            </Button>
          </div>

          {/* Campus Section */}
          <label htmlFor='campus' className='font-bold leading-tight'>
            Give to
          </label>
          <div className='relative'>
            <select
              className='cursor-pointer w-full p-2 border border-text-secondary/60 rounded-[4px] appearance-none outline-none focus:outline-none focus:ring-0'
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
            >
              <option value=''>-- Choose Campus --</option>
              {campusList.map((campus, index) => (
                <option key={`${campus}-${index}`} value={campus}>
                  {campus}
                </option>
              ))}
            </select>
            <div className='absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none'>
              <img
                src='/assets/icons/chevron-down.svg'
                alt='dropdown icon'
                className='size-6'
              />
            </div>
          </div>

          {/* Giving Type Section */}
          <label htmlFor='giveType' className='font-bold leading-tight'>
            Giving Type
          </label>
          <div className='relative'>
            <select
              className='cursor-pointer w-full p-2 border border-text-secondary/60 rounded-[4px] appearance-none outline-none focus:outline-none focus:ring-0'
              value={giveType}
              onChange={(e) =>
                setGiveType(e.target.value as (typeof GIVE_TYPES)[number])
              }
            >
              {GIVE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <div className='absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none'>
              <img
                src='/assets/icons/chevron-down.svg'
                alt='dropdown icon'
                className='size-6'
              />
            </div>
          </div>
        </div>

        <Button
          className='bg-navy w-fit mx-auto'
          onClick={() => {
            const pushpayUrl = buildPushpayUrl();
            window.open(pushpayUrl, '_blank');
          }}
        >
          Give Now
        </Button>
      </div>
    </div>
  );
};
