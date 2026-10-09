import { Button } from '~/primitives/button/button.primitive';
import Icon from '~/primitives/icon';
import { useNavigate } from 'react-router';

interface ConnectCardConfirmationProps {
  onSuccess?: () => void;
}

const ConnectCardConfirmation: React.FC<ConnectCardConfirmationProps> = ({
  onSuccess,
}) => {
  const navigate = useNavigate();

  const handleClose = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      navigate('/');
    }
  };

  return (
    <div className='flex flex-col items-center gap-4 p-8'>
      <Icon name='check' size={64} color='#1ec27f' />
      <h1 className='font-bold text-2xl text-navy'>You're all set!</h1>
      <Button
        intent='primary'
        className='rounded-xl w-52'
        onClick={handleClose}
      >
        Continue
      </Button>
    </div>
  );
};

export default ConnectCardConfirmation;
