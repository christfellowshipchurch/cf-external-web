import { useState } from 'react';
import ContactUsForm from '~/components/modals/contact-us/contact-form.component';
import ContactUsConfirmation from '~/components/modals/contact-us/confirmation.component';

export { action } from './action';
export { loader } from './loader';
export { meta } from './meta';

export default function ContactUsPage() {
  const [isSuccess, setIsSuccess] = useState(false);

  return (
    <div className='flex flex-col items-center justify-center px-6 py-20 max-w-screen-sm mx-auto'>
      {isSuccess ? (
        <ContactUsConfirmation />
      ) : (
        <ContactUsForm
          onSuccess={() => {
            setIsSuccess(true);
            // The confirmation is much shorter than the form, so bring it into view.
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}
