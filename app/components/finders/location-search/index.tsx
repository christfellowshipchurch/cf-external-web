import React, { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router-dom';
import { cn, isValidZip } from '~/lib/utils';
import { getCurrentPositionFromUserGesture } from '~/lib/browser-geolocation';
import { Icon } from '~/primitives/icon/icon';

export type FinderLocationKind = 'zip' | 'gps' | null;

/** `text-base` below `md` avoids iOS Safari auto-zoom on focus (16px minimum). */
export const finderLocationInputBaseClass =
  'box-border min-h-11 min-w-0 rounded border border-[#909090] px-2 py-2 text-base leading-snug text-text-secondary placeholder:text-[#909090] [color-scheme:light] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#909090] transition-colors duration-300 disabled:opacity-50 md:text-sm';

export const finderApplyZipButtonClass =
  'inline-flex min-h-0 shrink-0 items-center justify-center gap-1 border-0 bg-ocean px-5 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:bg-navy disabled:cursor-not-allowed disabled:opacity-50 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-1';

const finderCurrentLocationButtonClass =
  'inline-flex min-h-0 min-w-0 items-center justify-center gap-2 border-0 bg-gray px-4 py-2 text-sm font-semibold text-text-primary transition-colors duration-300 hover:bg-neutral-200 disabled:opacity-50 rounded';

export const FinderLocationSearch = ({
  coordinates,
  setCoordinates,
  className,
  autoGeocodeZip = true,
  showZipInput = true,
  showCurrentLocationButton = true,
  onLocationKind,
  cancelSignalRef,
}: {
  coordinates: {
    lat: number | null;
    lng: number | null;
  } | null;
  setCoordinates: (
    coordinates: {
      lat: number | null;
      lng: number | null;
    } | null,
  ) => void;
  className?: string;
  /** When false, zip is geocoded only when the user clicks Apply (valid 5-digit zip). */
  autoGeocodeZip?: boolean;
  showZipInput?: boolean;
  showCurrentLocationButton?: boolean;
  /** Called when this control sets or clears map search coordinates (zip geocode, GPS, or clear). */
  onLocationKind?: (kind: FinderLocationKind) => void;
  /**
   * Shared mutable ref across sibling location inputs (zip + GPS).
   * Incremented when any source starts a request; each source captures its token
   * and only applies its result if the token still matches — last click wins.
   */
  cancelSignalRef?: React.MutableRefObject<number>;
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGpsRequesting, setIsGpsRequesting] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const geocodeFetcher = useFetcher();
  const lastSubmittedZipRef = useRef<string | null>(null);
  const pendingZipGeocodeRef = useRef(false);
  const gpsRequestIdRef = useRef(0);
  const myZipTokenRef = useRef(0);

  useEffect(() => {
    if (!showZipInput) return;

    if (autoGeocodeZip) {
      if (inputValue.length === 5 && isValidZip(inputValue)) {
        if (
          lastSubmittedZipRef.current !== inputValue &&
          geocodeFetcher.state === 'idle'
        ) {
          lastSubmittedZipRef.current = inputValue;
          setIsGeocoding(true);
          const formData = new FormData();
          formData.append('address', inputValue);
          geocodeFetcher.submit(formData, {
            method: 'post',
            action: '/google-geocode',
          });
        }
      } else if (inputValue.length > 0) {
        lastSubmittedZipRef.current = null;
        setCoordinates(null);
        onLocationKind?.(null);
      } else {
        lastSubmittedZipRef.current = null;
      }
      return;
    }

    if (inputValue.length === 0) {
      lastSubmittedZipRef.current = null;
    }
  }, [
    autoGeocodeZip,
    showZipInput,
    inputValue,
    setCoordinates,
    geocodeFetcher.state,
    onLocationKind,
  ]);

  useEffect(() => {
    if (coordinates === null) {
      gpsRequestIdRef.current += 1;
      // Don't wipe an in-flight Apply — that drops the pending zip token and
      // makes a successful geocode look like a no-op.
      if (pendingZipGeocodeRef.current || isGeocoding) {
        return;
      }
      if (showZipInput) {
        setInputValue('');
      }
      lastSubmittedZipRef.current = null;
    }
  }, [coordinates, showZipInput, isGeocoding]);

  useEffect(() => {
    if (geocodeFetcher.state !== 'idle') {
      pendingZipGeocodeRef.current = true;
      return;
    }

    if (!pendingZipGeocodeRef.current || !geocodeFetcher.data) {
      return;
    }

    pendingZipGeocodeRef.current = false;

    // Ignore stale geocode responses after Clear All / a newer request.
    if (
      !lastSubmittedZipRef.current ||
      (cancelSignalRef && myZipTokenRef.current !== cancelSignalRef.current)
    ) {
      setIsGeocoding(false);
      return;
    }

    const data = geocodeFetcher.data as {
      results?: {
        geometry?: {
          location?: { lat?: number | string; lng?: number | string };
        };
      }[];
      error?: string;
      error_message?: string;
      status?: string;
    };

    const location = data.results?.[0]?.geometry?.location;
    const lat = location != null ? Number(location.lat) : Number.NaN;
    const lng = location != null ? Number(location.lng) : Number.NaN;

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setGeocodeError(null);
      setCoordinates({ lat, lng });
      onLocationKind?.('zip');
    } else {
      setGeocodeError(
        data.error?.trim() ||
          data.error_message?.trim() ||
          'Could not look up that ZIP. Please try again.',
      );
    }
    setIsGeocoding(false);
  }, [
    geocodeFetcher.data,
    geocodeFetcher.state,
    setCoordinates,
    onLocationKind,
    cancelSignalRef,
  ]);

  const submitZipGeocode = (zip: string) => {
    if (
      zip.length !== 5 ||
      !isValidZip(zip) ||
      geocodeFetcher.state !== 'idle'
    ) {
      return;
    }
    if (cancelSignalRef) {
      cancelSignalRef.current += 1;
      myZipTokenRef.current = cancelSignalRef.current;
    }
    lastSubmittedZipRef.current = zip;
    pendingZipGeocodeRef.current = true;
    setGeocodeError(null);
    setIsGeocoding(true);
    const formData = new FormData();
    formData.append('address', zip);
    geocodeFetcher.submit(formData, {
      method: 'post',
      action: '/google-geocode',
    });
  };

  const handleApplyZip = (event?: React.MouseEvent | React.PointerEvent) => {
    event?.stopPropagation();
    event?.preventDefault();
    const zip = inputValue.trim();
    if (zip.length === 5 && isValidZip(zip)) {
      submitZipGeocode(zip);
    } else {
      lastSubmittedZipRef.current = null;
      setCoordinates(null);
      onLocationKind?.(null);
    }
  };

  const handleCurrentLocationClick = () => {
    setIsGeocoding(false);
    if (showZipInput) {
      setInputValue('');
      lastSubmittedZipRef.current = null;
    }

    // Claim the signal so any in-flight zip geocode (from a sibling instance) is discarded.
    const myToken = cancelSignalRef
      ? (cancelSignalRef.current += 1)
      : undefined;

    setIsGpsRequesting(true);
    const requestId = ++gpsRequestIdRef.current;
    getCurrentPositionFromUserGesture(
      (position) => {
        if (requestId !== gpsRequestIdRef.current) return;
        if (myToken !== undefined && myToken !== cancelSignalRef!.current) {
          setIsGpsRequesting(false);
          return;
        }
        setIsGpsRequesting(false);
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        onLocationKind?.('gps');
      },
      (error) => {
        if (requestId !== gpsRequestIdRef.current) return;
        setIsGpsRequesting(false);
        console.error('Error getting current location:', error);
      },
    );
  };

  const showZipRow = showZipInput;
  const showGpsRow = showCurrentLocationButton;

  if (!showZipRow && !showGpsRow) {
    return null;
  }

  const manualZipApply = showZipRow && !autoGeocodeZip;

  const currentLocationButton = (
    <button
      type='button'
      className={finderCurrentLocationButtonClass}
      disabled={isGeocoding || isGpsRequesting}
      onClick={handleCurrentLocationClick}
    >
      <Icon
        name='targetBlank'
        size={16}
        className='shrink-0 text-text-primary'
      />
      <span>Share Your Location</span>
    </button>
  );

  return (
    <div
      className={cn('flex w-full flex-col gap-2', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {manualZipApply ? (
        <div className='flex w-full min-w-0 flex-col gap-2'>
          <div className='flex w-full min-w-0 flex-row items-stretch gap-2'>
            <input
              type='text'
              placeholder='Enter ZIP'
              value={inputValue}
              onChange={(e) => {
                setGeocodeError(null);
                setInputValue(e.target.value);
              }}
              className={cn(finderLocationInputBaseClass, 'min-w-0 flex-1')}
              disabled={isGeocoding || isGpsRequesting}
              aria-invalid={geocodeError != null}
              aria-describedby={
                geocodeError != null ? 'finder-zip-geocode-error' : undefined
              }
            />
            <button
              type='button'
              className={finderApplyZipButtonClass}
              disabled={isGeocoding || isGpsRequesting}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleApplyZip}
            >
              Apply
            </button>
          </div>
          {geocodeError ? (
            <p
              id='finder-zip-geocode-error'
              role='alert'
              className='text-sm font-medium text-red-600'
            >
              {geocodeError}
            </p>
          ) : null}
        </div>
      ) : null}

      {showZipRow && autoGeocodeZip ? (
        <div className='flex w-full flex-wrap items-stretch gap-2'>
          <input
            type='text'
            placeholder='Enter ZIP'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={cn(
              finderLocationInputBaseClass,
              showGpsRow ? 'min-w-0 flex-1' : 'w-full',
            )}
            disabled={isGeocoding || isGpsRequesting}
          />
          {showGpsRow ? currentLocationButton : null}
        </div>
      ) : null}

      {manualZipApply && showGpsRow ? (
        <div className='flex w-full flex-wrap gap-2'>
          {currentLocationButton}
        </div>
      ) : null}

      {!showZipRow && showGpsRow ? (
        <div className='flex w-full flex-wrap gap-2'>
          {currentLocationButton}
        </div>
      ) : null}
    </div>
  );
};
