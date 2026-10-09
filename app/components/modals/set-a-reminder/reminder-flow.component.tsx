import { useState } from 'react';
import ReminderConfirmation from './confirmation.component';
import ReminderForm from './reminder-form.component';
import { useLoaderData } from 'react-router';
import { LoaderReturnType } from '~/routes/locations/location-single/loader';

interface ReminderFlowProps {
  setOpenModal: (open: boolean) => void;
}

enum ReminderStep {
  REMINDER,
  CONFIRMATION,
}

const ReminderFlow: React.FC<ReminderFlowProps> = ({ setOpenModal }) => {
  const [step, setStep] = useState<ReminderStep>(ReminderStep.REMINDER);
  const [serviceTime, setServiceTime] = useState<string>('');
  const { campusName, campusUrl } = useLoaderData<LoaderReturnType>();

  const renderStep = () => {
    switch (step) {
      case ReminderStep.REMINDER:
        return (
          <ReminderForm
            setServiceTime={setServiceTime}
            onSuccess={() => setStep(ReminderStep.CONFIRMATION)}
            url={campusUrl}
          />
        );
      case ReminderStep.CONFIRMATION:
        return (
          <ReminderConfirmation
            serviceTime={serviceTime}
            onSuccess={() => setOpenModal(false)}
            campusUrl={campusUrl}
            location={campusName}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className='pt-10 text-center text-text_primary p-6 w-[90vw] max-w-sm md:max-w-xl lg:max-w-3xl overflow-y-scroll max-h-[85vh] md:max-h-[90vh]'>
      {renderStep()}
    </div>
  );
};

export default ReminderFlow;
