import { Link } from 'react-router';
import { Button } from '~/primitives/button/button.primitive';

interface CookieConsentProps {
  isVisible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function CookieConsent({
  isVisible,
  onAccept,
  onDecline,
}: CookieConsentProps) {
  if (!isVisible) return null;

  return (
    <div
      role='dialog'
      aria-labelledby='cookie-consent-title'
      className='fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out z-50'
    >
      <div className='max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8'>
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
          <div className='flex-1'>
            <h2
              id='cookie-consent-title'
              className='text-base font-semibold text-gray-900'
            >
              Cookie Settings
            </h2>
            <p className='mt-1 text-sm text-gray-600'>
              We use optional analytics cookies to understand how our website is
              used and improve your experience. You can allow or reject
              analytics cookies. Necessary site features will continue to work
              either way.{' '}
              <Link
                to='/privacy-policy'
                className='underline text-ocean hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean'
              >
                Learn more in our Privacy Policy.
              </Link>
            </p>
          </div>
          <div className='flex gap-3'>
            <Button onClick={onDecline} intent='secondary' size='sm'>
              Reject analytics
            </Button>
            <Button onClick={onAccept} intent='secondary' size='sm'>
              Allow analytics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
