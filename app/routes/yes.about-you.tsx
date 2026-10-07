import React from 'react';
import { useLoaderData } from 'react-router';
import YesAboutYou from './yes/partials/yes-about-you.partial';
import { YesFormPersonalInfo } from './yes/types';

export const loader = async () => {
  const defaultValues: YesFormPersonalInfo = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  };

  return Response.json({ defaultValues });
};

export const YesAboutYouRoute: React.FC = () => {
  const { defaultValues } = useLoaderData() as {
    defaultValues: YesFormPersonalInfo;
  };
  return <YesAboutYou data={defaultValues} />;
};

export default YesAboutYouRoute;
