import React from 'react';
import {
  ActionFunctionArgs,
  redirect,
  useNavigate,
  useLoaderData,
} from 'react-router';
import type { VolunteerFormInterests } from './volunteer-form/types';
import { mockInterests } from './volunteer-form/mock-data';
import VolunteerFormInterestsPartial from './volunteer-form/partials/form-interests.partial';

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const interests = formData.getAll('interests');
  const backgroundCheck = formData.get('backgroundCheck') === 'true';
  const ssn = formData.get('ssn');

  const errors: Partial<Record<keyof VolunteerFormInterests, string>> = {};

  if (interests.length === 0) {
    errors.interests = 'Please select at least one interest.';
  }

  if (backgroundCheck && (!ssn || ssn.toString().trim().length !== 9)) {
    errors.ssn = 'Please enter a complete 9-digit SSN.';
  }

  const defaultValues = Object.fromEntries(
    formData,
  ) as unknown as VolunteerFormInterests;

  if (Object.keys(errors).length > 0) {
    return new Response(JSON.stringify({ errors, defaultValues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // TODO: Save data
  // eslint-disable-next-line no-console
  console.log('Preferences Info received:', defaultValues);
  return redirect('/volunteer-form/confirmation');
};

export const loader = async () => {
  return new Response(JSON.stringify({ defaultValues: mockInterests }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const VolunteerFormPreferencesRoute: React.FC = () => {
  const { defaultValues } = useLoaderData() as {
    defaultValues: VolunteerFormInterests;
  };
  const navigate = useNavigate();
  return (
    <VolunteerFormInterestsPartial
      data={defaultValues}
      onBack={() => navigate('/volunteer-form/availability')}
    />
  );
};

export default VolunteerFormPreferencesRoute;
