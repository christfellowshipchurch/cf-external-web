import { LoaderFunction, redirect } from 'react-router';
import { useLoaderData } from 'react-router';
import { AuthModal } from '~/components';
import { Button } from '~/primitives/button/button.primitive';
import { useAuth } from '~/providers/auth-provider';
import { getUserFromRequest } from '~/lib/.server/authentication/get-user-from-request';
import type { User } from '~/providers/auth-provider';

export { meta } from './profile-meta';

interface LoaderData {
  user: User;
  message: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  const userData = await getUserFromRequest(request);

  if (!userData) {
    return redirect('/'); // Redirect if no token is found
  }

  // Handle the Response object
  if (userData instanceof Response) {
    const user = await userData.json();
    return {
      user,
      message: 'This is additional data from the profile loader',
    };
  }

  return {
    user: userData,
    message: 'This is additional data from the profile loader',
  };
};

export default function MyProfile() {
  const { user, message } = useLoaderData<LoaderData>();
  const { email, fullName, photo } = user;
  const { logout } = useAuth();

  return (
    <div className='p-10 text-wrap space-y-4 flex flex-col items-center pt-32'>
      {photo && (
        <img
          src={photo}
          alt='User profile'
          className='rounded-full w-32 h-32'
        />
      )}
      {fullName ? (
        <p className='text-xl font-bold'>{fullName}</p>
      ) : (
        <p>Not logged in</p>
      )}
      <p>{email}</p>
      <p className='bg-gray-200 rounded p-2'>{message}</p>
      {fullName ? <Button onClick={logout}>Logout</Button> : <AuthModal />}
    </div>
  );
}
