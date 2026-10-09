import { Button } from '~/primitives/button/button.primitive';
import Icon from '~/primitives/icon';
import { useNavigate } from 'react-router';

const ContactUsConfirmation: React.FC<{ onClose?: () => void }> = ({
  onClose,
}) => {
  const navigate = useNavigate();

  return (
    <div className='flex flex-col items-center gap-4 p-8'>
      <Icon name='check' size={64} color='#1ec27f' />
      <p className='font-bold text-2xl text-navy text-center'>
        Thank you! Someone from our team will be following up with you shortly.
      </p>
      <Button
        intent='primary'
        className='rounded-xl w-52'
        onClick={() => (onClose ? onClose() : navigate('/'))}
      >
        Continue
      </Button>
    </div>
  );
};

export default ContactUsConfirmation;
