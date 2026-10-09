import React from 'react';
import {
  ActionFunctionArgs,
  redirect,
  useNavigate,
  useLoaderData,
} from 'react-router';
import type { VolunteerFormPersonalInfo } from './volunteer-form/types';
import { mockPersonalInfo } from './volunteer-form/mock-data';
import VolunteerFormPersonalInfoPartial from './volunteer-form/partials/form-about-you.partial';

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const data = {
    campus: formData.get('campus'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    dateOfBirth: formData.get('dateOfBirth'),
  };
  // eslint-disable-next-line no-console
  console.log('Personal Info received:', data);

  // TODO: Validate data and save it

  return redirect('/volunteer-form/availability');
};

export const loader = async () => {
  return new Response(JSON.stringify({ defaultValues: mockPersonalInfo }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const VolunteerFormPersonalInfoRoute: React.FC = () => {
  const { defaultValues } = useLoaderData() as {
    defaultValues: VolunteerFormPersonalInfo;
  };
  const navigate = useNavigate();
  return (
    <VolunteerFormPersonalInfoPartial
      data={defaultValues}
      onBack={() => navigate('/volunteer-form/welcome')}
    />
  );
};

export default VolunteerFormPersonalInfoRoute;
