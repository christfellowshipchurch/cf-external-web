import React from 'react';
import {
  ActionFunctionArgs,
  redirect,
  useNavigate,
  useLoaderData,
} from 'react-router';
import type { VolunteerFormAvailability } from './volunteer-form/types';
import { mockAvailability } from './volunteer-form/mock-data';
import VolunteerFormAvailabilityPartial from './volunteer-form/partials/form-availability.partial';

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const daysAvailable = formData
    .getAll('daysAvailable')
    .filter((v): v is string => !!v);
  const timesAvailable = formData
    .getAll('timesAvailable')
    .filter((v): v is string => !!v);
  const frequency = formData.get('frequency');
  const hoursPerWeek = formData.get('hoursPerWeek');

  const errors: Partial<Record<keyof VolunteerFormAvailability, string>> = {};

  if (daysAvailable.length === 0) {
    errors.daysAvailable = 'Please select at least one day.';
  }
  if (timesAvailable.length === 0) {
    errors.timesAvailable = 'Please select at least one time.';
  }

  const defaultValues = {
    daysAvailable,
    timesAvailable,
    frequency,
    hoursPerWeek,
  } as VolunteerFormAvailability;

  if (Object.keys(errors).length > 0) {
    return new Response(JSON.stringify({ errors, defaultValues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // TODO: Save data
  // eslint-disable-next-line no-console
  console.log('Availability Info received:', defaultValues);

  return redirect('/volunteer-form/interests');
};

export const loader = async () => {
  return new Response(JSON.stringify({ defaultValues: mockAvailability }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const VolunteerFormAvailabilityRoute: React.FC = () => {
  const { defaultValues } = useLoaderData() as {
    defaultValues: VolunteerFormAvailability;
  };
  const navigate = useNavigate();
  return (
    <VolunteerFormAvailabilityPartial
      data={defaultValues}
      onBack={() => navigate('/volunteer-form/about-you')}
    />
  );
};

export default VolunteerFormAvailabilityRoute;
