import { useState } from 'react';
import Modal from '~/primitives/Modal';
import ReminderFlow from './reminder-flow.component';
import { Button, ButtonProps } from '~/primitives/button/button.primitive';
import { LoaderReturnType } from '~/routes/locations/location-single/loader';
import { useLoaderData } from 'react-router-dom';
import { cn } from '~/lib/utils';
import { pushFormEvent } from '~/lib/gtm';

interface SetAReminderModalProps {
  className?: string;
  /**
   * When provided, used as the sole className on the trigger button, bypassing
   * the modal's internal default styles. Use this when the button needs to
   * match an existing design system style (e.g. inside a CTA card).
   */
  buttonClassName?: string;
  intent?: ButtonProps['intent'];
  ModalButton?: React.ComponentType<ButtonProps>;
  /** Merged onto `Modal.Button` (e.g. `w-full mr-0` for full-width triggers). */
  triggerClassName?: string;
}

export function SetAReminderModal({
  className,
  buttonClassName,
  intent = 'secondary',
  ModalButton = Button,
  triggerClassName,
}: SetAReminderModalProps) {
  const [openModal, setOpenModal] = useState(false);
  const { campusUrl } = useLoaderData<LoaderReturnType>();

  const handleOpenChange = (open: boolean) => {
    setOpenModal(open);
    if (open) {
      pushFormEvent('form_start', 'set_a_reminder', 'Set a Reminder');
    }
  };

  const isSpanish = campusUrl?.includes('iglesia');
  const buttonLabel = isSpanish ? 'Visítanos' : 'Set a Reminder';

  return (
    <Modal open={openModal} onOpenChange={handleOpenChange}>
      <Modal.Button asChild className={cn('mr-2', triggerClassName)}>
        <ModalButton
          intent={intent}
          type='button'
          className={
            buttonClassName !== undefined
              ? buttonClassName
              : cn(
                  'text-white border-[#FAFAFC] rounded-md md:rounded-none border hover:bg-white/10',
                  className,
                )
          }
        >
          {buttonLabel}
        </ModalButton>
      </Modal.Button>
      <Modal.Content>
        <ReminderFlow setOpenModal={setOpenModal} />
      </Modal.Content>
    </Modal>
  );
}
