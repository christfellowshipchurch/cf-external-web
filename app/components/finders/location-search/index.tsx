import React, { useCallback, useEffect, useRef, useState } from 'react';
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

type GeocodeResponse = {
  results?: {
    geometry?: {
      location?: { lat?: number | string; lng?: number | string };
    };
  }[];
  error?: string;
  error_message?: string;
  status?: string;
};

/**
 * Use plain `fetch` (not `useFetcher`) for `/google-geocode`.
 * Fetcher actions revalidate active route loaders by default, which remounts
 * finder InstantSearch state and can hard-break the page when the loader fails.
 */
async function postZipGeocode(zip: string): Promise<GeocodeResponse> {
  const formData = new FormData();
  formData.append('address', zip);
  const response = await fetch('/google-geocode', {
    method: 'POST',
    body: formData,
  });
  try {
    return (await response.json()) as GeocodeResponse;
  } catch {
    return {
      error: 'Could not look up that ZIP. Please try again.',
      status: 'UNKNOWN',
      results: [],
    };
  }
}

function coordsFromGeocodeData(data: GeocodeResponse): {
  lat: number;
  lng: number;
} | null {
  const location = data.results?.[0]?.geometry?.location;
  const lat = location != null ? Number(location.lat) : Number.NaN;
  const lng = location != null ? Number(location.lng) : Number.NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

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
  const lastSubmittedZipRef = useRef<string | null>(null);
  const pendingZipGeocodeRef = useRef(false);
  const gpsRequestIdRef = useRef(0);
  const myZipTokenRef = useRef(0);

  const submitZipGeocode = useCallback(
    (zip: string) => {
      if (
        zip.length !== 5 ||
        !isValidZip(zip) ||
        pendingZipGeocodeRef.current
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

      void (async () => {
        try {
          const data = await postZipGeocode(zip);
          if (
            lastSubmittedZipRef.current !== zip ||
            (cancelSignalRef &&
              myZipTokenRef.current !== cancelSignalRef.current)
          ) {
            return;
          }
          const coords = coordsFromGeocodeData(data);
          if (coords) {
            setGeocodeError(null);
            setCoordinates(coords);
            onLocationKind?.('zip');
          } else {
            setGeocodeError(
              data.error?.trim() ||
                data.error_message?.trim() ||
                'Could not look up that ZIP. Please try again.',
            );
          }
        } catch {
          if (lastSubmittedZipRef.current === zip) {
            setGeocodeError('Could not look up that ZIP. Please try again.');
          }
        } finally {
          if (lastSubmittedZipRef.current === zip) {
            pendingZipGeocodeRef.current = false;
            setIsGeocoding(false);
          }
        }
      })();
    },
    [cancelSignalRef, setCoordinates, onLocationKind],
  );

  useEffect(() => {
    if (!showZipInput) return;

    if (autoGeocodeZip) {
      if (inputValue.length === 5 && isValidZip(inputValue)) {
        if (lastSubmittedZipRef.current !== inputValue) {
          submitZipGeocode(inputValue);
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
    onLocationKind,
    submitZipGeocode,
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
    pendingZipGeocodeRef.current = false;
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
